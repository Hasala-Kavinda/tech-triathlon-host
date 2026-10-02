import { randomInt } from "node:crypto"
import argon2 from "argon2"
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { requireRole } from "../../common/auth.js"
import { audit } from "../../common/audit.js"
import { badRequest, conflict, notFound, unprocessable } from "../../common/errors.js"
import { pagination, paginationSchema } from "../../common/pagination.js"
import { ok, page } from "../../common/response.js"
import { OPERATING_ZONE } from "../../common/time.js"
import { expectedVersion } from "../../common/version.js"
import { DeliveryRecord, SyncReceipt, Trip, TripLocation } from "../../database/models/index.js"
import { OrderReadPort } from "../orders/order.read-port.js"
import { markOrderDelivered } from "../orders/order.commands.js"
import { UserReadPort } from "../auth/user.read-port.js"
import { DateTime } from "luxon"

function today() { return DateTime.now().setZone(OPERATING_ZONE).toFormat("yyyy-MM-dd") }

async function assignedTrip(tripId: string, driverId: string) {
  const trip = await Trip.findOne({ _id: tripId, driverId })
  if (!trip) throw notFound()
  return trip
}

export async function driverRoutes(app: FastifyInstance) {
  app.get("/driver/routes/today", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "driver")
    const rows = await Trip.find({ driverId: auth.userId, serviceDate: today(), status: { $in: ["load_confirmed", "claimed", "in_transit"] } }).sort({ departureAt: 1 }).lean()
    return ok(request, rows)
  })

  app.post("/driver/assignments/:tripId/claim", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "driver")
    const params = z.object({ tripId: z.string() }).safeParse(request.params)
    const body = z.object({ expectedVersion: z.number().int().optional() }).safeParse(request.body ?? {})
    if (!params.success || !body.success) throw badRequest("A trip ID and current version are required.")
    const version = expectedVersion(request, body.data.expectedVersion)
    const trip = await Trip.findOneAndUpdate(
      { _id: params.data.tripId, driverId: auth.userId, status: "load_confirmed", version },
      { $set: { status: "claimed", claimedByDriverId: auth.userId }, $push: { statusHistory: { status: "claimed", at: new Date(), actorId: auth.userId } }, $inc: { version: 1 } },
      { new: true },
    ).lean()
    if (!trip) throw conflict("ASSIGNMENT_ALREADY_CLAIMED", "The assignment was already claimed or changed.")
    const orders = await OrderReadPort.findByIds(trip.stops.map((stop) => stop.orderId))
    await audit(request, "driver.assignment_claimed", "trip", params.data.tripId)
    return ok(request, { assignment: trip, manifest: { trip, orders }, bootstrapVersion: (trip as { version?: number }).version ?? 0, serverNow: new Date().toISOString() })
  })

  app.post("/driver/assignments/:tripId/unclaim", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "driver")
    const params = z.object({ tripId: z.string() }).safeParse(request.params)
    const body = z.object({ reason: z.string().min(1).max(500), expectedVersion: z.number().int().optional() }).safeParse(request.body)
    if (!params.success || !body.success) throw badRequest("A reason and current version are required.")
    const version = expectedVersion(request, body.data.expectedVersion)
    const trip = await Trip.findOneAndUpdate(
      { _id: params.data.tripId, driverId: auth.userId, claimedByDriverId: auth.userId, status: "claimed", version, startedAt: { $exists: false } },
      { $set: { status: "load_confirmed" }, $unset: { claimedByDriverId: 1, vehicleConfirmedAt: 1 }, $push: { statusHistory: { status: "load_confirmed", at: new Date(), actorId: auth.userId, note: body.data.reason } }, $inc: { version: 1 } },
      { new: true },
    ).lean()
    if (!trip) throw conflict("ASSIGNMENT_CANNOT_BE_RELEASED", "The assignment cannot be released after trip start or by another Driver.")
    await audit(request, "driver.assignment_unclaimed", "trip", params.data.tripId, { reason: body.data.reason })
    return ok(request, trip)
  })

  app.post("/driver/assignments/:tripId/confirm-vehicle", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "driver")
    const params = z.object({ tripId: z.string() }).safeParse(request.params)
    const body = z.object({ vehicleId: z.string(), expectedVersion: z.number().int().optional() }).safeParse(request.body)
    if (!params.success || !body.success) throw badRequest("A vehicle and current version are required.")
    const version = expectedVersion(request, body.data.expectedVersion)
    const trip = await Trip.findOneAndUpdate({ _id: params.data.tripId, driverId: auth.userId, claimedByDriverId: auth.userId, vehicleId: body.data.vehicleId, status: "claimed", version }, { $set: { vehicleConfirmedAt: new Date() }, $inc: { version: 1 } }, { new: true }).lean()
    if (!trip) throw conflict("VEHICLE_CONFIRMATION_FAILED", "The vehicle does not match the assignment or the trip changed.")
    const orders = await OrderReadPort.findByIds(trip.stops.map((stop) => stop.orderId))
    return ok(request, { assignment: trip, manifest: { trip, orders }, bootstrapVersion: (trip as { version?: number }).version ?? 0, serverNow: new Date().toISOString() })
  })

  app.post("/trips/:tripId/start", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "driver")
    const params = z.object({ tripId: z.string() }).safeParse(request.params)
    const body = z.object({ fileAssetId: z.string().min(1), capturedAt: z.coerce.date(), expectedVersion: z.number().int().optional() }).safeParse(request.body)
    if (!params.success || !body.success) throw badRequest("Start-meter evidence and the current version are required.")
    const version = expectedVersion(request, body.data.expectedVersion)
    const trip = await Trip.findOneAndUpdate({ _id: params.data.tripId, driverId: auth.userId, claimedByDriverId: auth.userId, status: "claimed", vehicleConfirmedAt: { $exists: true }, version }, { $set: { status: "in_transit", startedAt: new Date(), startFileAssetId: body.data.fileAssetId }, $push: { statusHistory: { status: "in_transit", at: new Date(), actorId: auth.userId } }, $inc: { version: 1 } }, { new: true }).lean()
    if (!trip) throw conflict("TRIP_START_CONFLICT", "The trip is not ready to start or changed.")
    await audit(request, "trip.started", "trip", params.data.tripId, { capturedAt: body.data.capturedAt.toISOString() })
    return ok(request, trip)
  })

  app.post("/trips/:tripId/location-batch", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "driver")
    const params = z.object({ tripId: z.string() }).safeParse(request.params)
    const body = z.object({ points: z.array(z.object({ sequence: z.number().int().min(0), recordedAt: z.coerce.date(), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), accuracy: z.number().min(0).max(10_000), heading: z.number().optional(), speed: z.number().optional() })).min(1).max(500) }).safeParse(request.body)
    if (!params.success || !body.success) throw badRequest("The location batch is invalid.")
    const trip = await Trip.findOne({ _id: params.data.tripId, driverId: auth.userId, status: "in_transit" }).lean()
    if (!trip) throw conflict("TRIP_NOT_ACTIVE", "Locations can be uploaded only for the Driver's active trip.")
    const writes = body.data.points.map((point) => ({ updateOne: { filter: { tripId: trip._id, sequence: point.sequence }, update: { $setOnInsert: { ...point, tripId: trip._id, driverId: auth.userId } }, upsert: true } }))
    const result = await TripLocation.bulkWrite(writes, { ordered: false })
    return ok(request, { acceptedCount: result.upsertedCount, duplicateCount: body.data.points.length - result.upsertedCount, lastPosition: body.data.points.at(-1) })
  })

  app.post("/trips/:tripId/stops/:stopId/arrive", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "driver")
    const params = z.object({ tripId: z.string(), stopId: z.string() }).safeParse(request.params)
    const body = z.object({ arrivedAt: z.coerce.date(), location: z.object({ latitude: z.number(), longitude: z.number(), accuracy: z.number() }).optional() }).safeParse(request.body)
    if (!params.success || !body.success) throw badRequest("Arrival data is invalid.")
    const trip = await assignedTrip(params.data.tripId, auth.userId)
    if (trip.status !== "in_transit") throw conflict("TRIP_NOT_ACTIVE", "The trip is not active.")
    const stop = trip.stops.find((candidate) => candidate.stopId === params.data.stopId)
    if (!stop) throw notFound("The stop was not found.")
    const order = await OrderReadPort.findById(String(stop.orderId))
    if (!order) throw notFound("The stop order was not found.")
    const record = await DeliveryRecord.findOneAndUpdate(
      { tripId: trip._id, stopId: stop.stopId },
      { $setOnInsert: { orderId: order._id, outletId: order.outletId, driverId: auth.userId, items: order.items.map((item) => ({ orderId: order._id, sku: item.sku, expected: item.quantity, delivered: item.quantity, short: 0, damaged: 0 })) }, $set: { status: "arrived", arrivedAt: body.data.arrivedAt } },
      { new: true, upsert: true },
    )
    stop.status = "arrived"; await trip.save()
    await audit(request, "delivery.arrived", "delivery", record.id, { clientRecordedAt: body.data.arrivedAt.toISOString() })
    return ok(request, { delivery: record.toObject(), tripVersion: trip.version })
  })

  app.patch("/trips/:tripId/stops/:stopId/items", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "driver")
    const params = z.object({ tripId: z.string(), stopId: z.string() }).safeParse(request.params)
    const body = z.object({ items: z.array(z.object({ sku: z.string(), delivered: z.number().int().min(0), short: z.number().int().min(0), damaged: z.number().int().min(0), note: z.string().max(500).optional() })), expectedVersion: z.number().int().optional() }).safeParse(request.body)
    if (!params.success || !body.success) throw badRequest("Delivery item outcomes are invalid.")
    const version = expectedVersion(request, body.data.expectedVersion)
    const record = await DeliveryRecord.findOne({ tripId: params.data.tripId, stopId: params.data.stopId, driverId: auth.userId, status: "arrived", version })
    if (!record) throw conflict("DELIVERY_ITEM_CONFLICT", "The delivery changed or is not editable.")
    for (const update of body.data.items) {
      const item = record.items.find((candidate) => candidate.sku === update.sku)
      if (!item) throw unprocessable("UNKNOWN_DELIVERY_ITEM", `${update.sku} is not in this delivery.`)
      if (update.delivered + update.short + update.damaged !== item.expected) throw unprocessable("DELIVERY_QUANTITY_MISMATCH", `${update.sku} quantities must account for the expected total.`)
      item.set(update)
    }
    await record.save()
    return ok(request, record.toObject())
  })

  app.post("/store/deliveries/:deliveryId/pin", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "store_manager")
    const user = await UserReadPort.findById(auth.userId)
    if (!user?.outletId) throw notFound()
    const pin = String(randomInt(0, 10_000)).padStart(4, "0")
    const record = await DeliveryRecord.findOneAndUpdate({ _id: request.params && (request.params as { deliveryId: string }).deliveryId, outletId: user.outletId, status: "arrived" }, { $set: { pinHash: await argon2.hash(pin), pinExpiresAt: new Date(Date.now() + 10 * 60_000), pinAttempts: 0 } }, { new: true }).select("+pinHash")
    if (!record) throw conflict("PIN_NOT_AVAILABLE", "A PIN can be issued only after arrival at your outlet.")
    await audit(request, "delivery.pin_issued", "delivery", record.id)
    return ok(request, { pin, expiresAt: record.pinExpiresAt })
  })

  app.post("/trips/:tripId/stops/:stopId/verify-pin", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "driver")
    const params = z.object({ tripId: z.string(), stopId: z.string() }).safeParse(request.params)
    const body = z.object({ pin: z.string().regex(/^\d{4}$/), clientRecordedAt: z.coerce.date() }).safeParse(request.body)
    if (!params.success || !body.success) throw badRequest("A four-digit PIN is required.")
    const record = await DeliveryRecord.findOne({ tripId: params.data.tripId, stopId: params.data.stopId, driverId: auth.userId, status: "arrived" }).select("+pinHash")
    if (!record?.pinHash || !record.pinExpiresAt || record.pinExpiresAt <= new Date()) throw conflict("PIN_EXPIRED", "The delivery PIN is absent or expired.")
    if (record.pinAttempts >= 5) throw conflict("PIN_ATTEMPTS_EXCEEDED", "The PIN attempt limit has been reached.")
    const verified = await argon2.verify(record.pinHash, body.data.pin).catch(() => false)
    record.pinAttempts += 1
    if (verified) record.status = "proof_verified"
    await record.save()
    if (!verified) throw unprocessable("PIN_INCORRECT", "The PIN is incorrect.", { attemptsLeft: Math.max(0, 5 - record.pinAttempts) })
    await audit(request, "delivery.pin_verified", "delivery", record.id, { clientRecordedAt: body.data.clientRecordedAt.toISOString() })
    return ok(request, { verified: true, deliveryId: record.id, version: record.version })
  })

  app.post("/trips/:tripId/stops/:stopId/complete", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "driver")
    const params = z.object({ tripId: z.string(), stopId: z.string() }).safeParse(request.params)
    const body = z.object({ outcome: z.enum(["delivered", "partial", "failed"]), completedAt: z.coerce.date(), expectedVersion: z.number().int().optional() }).safeParse(request.body)
    if (!params.success || !body.success) throw badRequest("Completion data is invalid.")
    const version = expectedVersion(request, body.data.expectedVersion)
    const record = await DeliveryRecord.findOneAndUpdate({ tripId: params.data.tripId, stopId: params.data.stopId, driverId: auth.userId, status: "proof_verified", version }, { $set: { status: "completed", outcome: body.data.outcome, completedAt: body.data.completedAt }, $inc: { version: 1 } }, { new: true })
    if (!record) throw conflict("DELIVERY_COMPLETE_CONFLICT", "The delivery is not ready to complete or changed.")
    await markOrderDelivered(record.orderId, body.data.completedAt, auth.userId)
    await audit(request, "delivery.completed", "delivery", record.id, { outcome: body.data.outcome })
    return ok(request, record.toObject())
  })

  app.post("/trips/:tripId/finish", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "driver")
    const params = z.object({ tripId: z.string() }).safeParse(request.params)
    const body = z.object({ endFileAssetId: z.string().min(1), capturedAt: z.coerce.date(), expectedVersion: z.number().int().optional() }).safeParse(request.body)
    if (!params.success || !body.success) throw badRequest("End-meter evidence and current version are required.")
    const version = expectedVersion(request, body.data.expectedVersion)
    const trip = await assignedTrip(params.data.tripId, auth.userId)
    if (trip.version !== version || trip.status !== "in_transit") throw conflict("TRIP_FINISH_CONFLICT", "The trip changed or is not active.")
    const incomplete = await DeliveryRecord.countDocuments({ tripId: trip._id, status: { $ne: "completed" } })
    if (incomplete) throw unprocessable("STOPS_INCOMPLETE", "Every stop must be completed before finishing the trip.", { incomplete })
    trip.status = "completed"; trip.completedAt = new Date(); trip.endFileAssetId = body.data.endFileAssetId; trip.statusHistory.push({ status: "completed", at: new Date(), actorId: auth.userId }); await trip.save()
    await audit(request, "trip.completed", "trip", trip.id, { capturedAt: body.data.capturedAt.toISOString() })
    return ok(request, trip.toObject())
  })

  app.get("/driver/order-history", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "driver")
    const query = paginationSchema.safeParse(request.query); if (!query.success) throw badRequest("Invalid pagination.")
    const tripIds = await Trip.find({ driverId: auth.userId }).distinct("stops.orderId")
    const { skip, limit } = pagination(query.data.page, query.data.pageSize)
    const { rows, total } = await OrderReadPort.findByIdsPaged(tripIds, skip, limit)
    return page(request, rows, query.data.page, query.data.pageSize, total)
  })

  app.get("/driver/delivery-history", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "driver")
    const query = paginationSchema.safeParse(request.query); if (!query.success) throw badRequest("Invalid pagination.")
    const { skip, limit } = pagination(query.data.page, query.data.pageSize)
    const filter = { driverId: auth.userId, status: "completed" }
    const [rows, total] = await Promise.all([DeliveryRecord.find(filter).sort({ completedAt: -1 }).skip(skip).limit(limit).lean(), DeliveryRecord.countDocuments(filter)])
    return page(request, rows, query.data.page, query.data.pageSize, total)
  })

  app.post("/sync/batch", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "driver")
    const body = z.object({ deviceId: z.string().min(1).max(200), mutations: z.array(z.object({ clientMutationId: z.string().uuid(), entityType: z.string(), entityId: z.string(), operation: z.string(), baseVersion: z.number().int().min(0), clientRecordedAt: z.coerce.date(), payload: z.record(z.unknown()) })).max(100) }).safeParse(request.body)
    if (!body.success) throw badRequest("The sync batch is invalid.", body.error.flatten())
    const results: Array<Record<string, unknown>> = []
    for (const mutation of body.data.mutations) {
      const prior = await SyncReceipt.findOne({ clientMutationId: mutation.clientMutationId, driverId: auth.userId }).lean()
      if (prior) { results.push({ clientMutationId: mutation.clientMutationId, result: "duplicate", response: prior.response }); continue }
      let result: "applied" | "conflict" | "rejected" = "rejected"
      let response: unknown = { code: "UNSUPPORTED_OFFLINE_OPERATION", message: "This operation is not accepted by the offline sync contract." }
      if (mutation.operation === "location") {
        const point = z.object({ tripId: z.string(), sequence: z.number().int(), latitude: z.number(), longitude: z.number(), accuracy: z.number() }).safeParse(mutation.payload)
        if (point.success) {
          const trip = await Trip.findOne({ _id: point.data.tripId, driverId: auth.userId }).lean()
          if (trip) { await TripLocation.updateOne({ tripId: trip._id, sequence: point.data.sequence }, { $setOnInsert: { ...point.data, driverId: auth.userId, recordedAt: mutation.clientRecordedAt } }, { upsert: true }); result = "applied"; response = { accepted: true } }
          else { result = "conflict"; response = { code: "TRIP_NOT_ASSIGNED" } }
        }
      }
      await SyncReceipt.create({ clientMutationId: mutation.clientMutationId, driverId: auth.userId, tripId: mutation.entityId, operation: mutation.operation, result, response })
      results.push({ clientMutationId: mutation.clientMutationId, result, response })
    }
    return ok(request, { deviceId: body.data.deviceId, results })
  })
}
