import { randomInt } from "node:crypto"
import argon2 from "argon2"
import mongoose from "mongoose"
import { DeliveryCommandPort } from "../delivery/delivery.command-port.js"
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { requireRole } from "../../common/auth.js"
import { audit } from "../../common/audit.js"
import { clock } from "../../common/clock.js"
import { AppError, badRequest, conflict, notFound, unprocessable } from "../../common/errors.js"
import { pagination, paginationSchema } from "../../common/pagination.js"
import { ok, page } from "../../common/response.js"
import { OPERATING_ZONE } from "../../common/time.js"
import { expectedVersion } from "../../common/version.js"
import { DeliveryRecord, Trip } from "../../database/models/index.js"
import { MutationLedgerCommandPort } from "../audit/mutation-ledger.command-port.js"
import { TripLocationCommandPort } from "../delivery/trip-location.command-port.js"
import { OrderReadPort } from "../orders/order.read-port.js"
import { advanceOrdersForTrip, markOrdersDelivered } from "../orders/order.commands.js"
import { OutletReadPort } from "../reference/outlet.read-port.js"
import { isUndeliveredOutcome, STOP_OUTCOMES, timingResult, windowDeadlineAt, type StopOutcome } from "../delivery/timing.js"
import { UserReadPort } from "../auth/user.read-port.js"
import { raiseTripRemark } from "../operations/trip-remarks.js"
import { DateTime } from "luxon"

function today() { return clock.nowDateTime().setZone(OPERATING_ZONE).toFormat("yyyy-MM-dd") }

// A device clock may run slightly ahead of the server; anything beyond this is rejected.
const MAX_CLIENT_CLOCK_SKEW_MS = 2 * 60_000

async function assignedTrip(tripId: string, driverId: string) {
  const trip = await Trip.findOne({ _id: tripId, driverId })
  if (!trip) throw notFound()
  return trip
}

function findStop(trip: Awaited<ReturnType<typeof assignedTrip>>, stopId: string) {
  const stop = trip.stops.find((candidate) => candidate.stopId === stopId)
  if (!stop) throw notFound("The stop was not found.")
  return stop
}

// Stop actions are shared by the online routes and the offline /sync/batch processor,
// so both apply exactly the same rules. `version` is only checked when supplied
// (online callers send If-Match; offline replays rely on the state guards instead).

async function arriveAtStop(tripId: string, stopId: string, driverId: string, arrivedAt: Date) {
  const trip = await assignedTrip(tripId, driverId)
  if (trip.status !== "in_transit") throw conflict("TRIP_NOT_ACTIVE", "The trip is not active.")
  const stop = findStop(trip, stopId)
  const pending = await DeliveryRecord.findOneAndUpdate(
    { tripId: trip._id, tripStopId: stop.tripStopId, status: "pending" },
    { $set: { status: "arrived", arrivedAt, driverId } },
    { new: true },
  )
  let record = pending
  if (!record) {
    const existing = await DeliveryRecord.findOne({ tripId: trip._id, tripStopId: stop.tripStopId })
    if (existing) return { record: existing, tripVersion: (trip as any).version as number }
    const orderIds = stop.orderIds?.length ? stop.orderIds : [stop.orderId]
    const orders = await OrderReadPort.findByIds(orderIds)
    if (!orders.length) throw notFound("The stop order was not found.")
    record = await DeliveryRecord.findOneAndUpdate(
      { tripId: trip._id, tripStopId: stop.tripStopId },
      { $setOnInsert: { tripStopId: stop.tripStopId, outletId: orders[0]!.outletId, driverId, items: orders.flatMap((order) => order.items.map((item) => ({ orderIds: [order._id], sku: item.sku, expected: item.quantity, delivered: 0, short: 0, damaged: 0 }))) }, $set: { status: "arrived", arrivedAt } },
      { new: true, upsert: true },
    )
  }
  stop.status = "arrived"; await trip.save()
  return { record: record!, tripVersion: (trip as any).version as number }
}

async function recordStopItems(tripId: string, stopId: string, driverId: string, items: Array<{ sku: string; delivered: number; short: number; damaged: number; note?: string | undefined }>, version?: number) {
  const trip = await assignedTrip(tripId, driverId)
  const stop = findStop(trip, stopId)
  const record = await DeliveryRecord.findOne({ tripId, tripStopId: stop.tripStopId, driverId, status: "arrived", ...(version === undefined ? {} : { version }) })
  if (!record) throw conflict("DELIVERY_ITEM_CONFLICT", "The delivery changed or is not editable.")
  for (const update of items) {
    const item = record.items.find((candidate) => candidate.sku === update.sku)
    if (!item) throw unprocessable("UNKNOWN_DELIVERY_ITEM", `${update.sku} is not in this delivery.`)
    if (update.delivered + update.short + update.damaged !== item.expected) throw unprocessable("DELIVERY_QUANTITY_MISMATCH", `${update.sku} quantities must account for the expected total.`)
    item.set(update)
  }
  await record.save()
  return record
}

async function verifyStopPin(tripId: string, stopId: string, driverId: string, pin: string, clientRecordedAt: Date) {
  const trip = await assignedTrip(tripId, driverId)
  const stop = findStop(trip, stopId)
  const record = await DeliveryRecord.findOne({ tripId, tripStopId: stop.tripStopId, driverId, status: "arrived" })
  if (!record) throw notFound()
  if (record.proof?.status === "verified") return record
  const result = await DeliveryCommandPort.verifyChallenge(record._id as mongoose.Types.ObjectId, pin, clientRecordedAt)
  if (!result.verified) {
    if (result.error === "PIN_NOT_FOUND" || result.error === "PIN_EXPIRED") throw conflict("PIN_EXPIRED", "The delivery PIN is absent or expired.")
    if (result.error === "PIN_ATTEMPTS_EXCEEDED") throw conflict("PIN_ATTEMPTS_EXCEEDED", "The PIN attempt limit has been reached.")
    throw unprocessable("PIN_INCORRECT", "The PIN is incorrect.", { attemptsLeft: result.attemptsLeft })
  }
  record.proof = { status: "verified", enteredAt: clientRecordedAt }
  await record.save()
  return record
}

async function completeStop(tripId: string, stopId: string, driverId: string, outcome: StopOutcome, completedAt: Date, version?: number) {
  const trip = await assignedTrip(tripId, driverId)
  const stop = findStop(trip, stopId)
  const session = await mongoose.startSession()
  let completed: InstanceType<typeof DeliveryRecord> | null = null
  try {
    await session.withTransaction(async () => {
      const record = await DeliveryRecord.findOneAndUpdate(
        // A delivery needs the store's PIN. A refused, closed or failed stop may have nobody to give
        // one, so it can end without it.
        { tripId, tripStopId: stop.tripStopId, driverId, status: "arrived", ...(isUndeliveredOutcome(outcome) ? {} : { "proof.status": "verified" }), ...(version === undefined ? {} : { version }) },
        { $set: { status: isUndeliveredOutcome(outcome) ? "failed" : "delivered", outcome, completedAt }, $inc: { version: 1 } },
        { new: true, session },
      )
      if (!record) throw conflict("DELIVERY_COMPLETE_CONFLICT", "The delivery is not ready to complete or changed.")
      // On time or late: the device-recorded arrival against the outlet's window close that day.
      const outlet = await OutletReadPort.findByOutletId(record.outletId)
      const deadline = outlet && record.arrivedAt ? windowDeadlineAt(trip.serviceDate, outlet.windowCloseTime) : null
      if (deadline && record.arrivedAt) {
        const timing = { timingResult: timingResult(record.arrivedAt, deadline), windowDeadlineAt: deadline, timeSource: "device" as const }
        await DeliveryRecord.updateOne({ _id: record._id }, { $set: timing }, { session })
        record.set(timing)
      }
      // A stop can serve several orders; every one of them gets the outcome.
      const orderIds = [...new Set(record.items.flatMap((item) => item.orderIds.map(String)))]
      await markOrdersDelivered(orderIds, outcome, completedAt, driverId, session)
      completed = record
    })
  } finally { await session.endSession() }
  return completed!
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
    const deliveries = await DeliveryRecord.find({ tripId: trip._id }).lean()
    await audit(request, "driver.assignment_claimed", "trip", params.data.tripId)
    return ok(request, { assignment: trip, manifest: { trip, orders, deliveries }, bootstrapVersion: (trip as { version?: number }).version ?? 0, serverNow: new Date().toISOString() })
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
    const deliveries = await DeliveryRecord.find({ tripId: trip._id }).lean()
    return ok(request, { assignment: trip, manifest: { trip, orders, deliveries }, bootstrapVersion: (trip as { version?: number }).version ?? 0, serverNow: new Date().toISOString() })
  })

  app.post("/trips/:tripId/start", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "driver")
    const params = z.object({ tripId: z.string() }).safeParse(request.params)
    const body = z.object({ fileAssetId: z.string().min(1), capturedAt: z.coerce.date(), expectedVersion: z.number().int().optional() }).safeParse(request.body)
    if (!params.success || !body.success) throw badRequest("Start-meter evidence and the current version are required.")
    const version = expectedVersion(request, body.data.expectedVersion)
    const session = await mongoose.startSession()
    let started: unknown = null
    try {
      await session.withTransaction(async () => {
        const trip = await Trip.findOneAndUpdate({ _id: params.data.tripId, driverId: auth.userId, claimedByDriverId: auth.userId, status: "claimed", vehicleConfirmedAt: { $exists: true }, version }, { $set: { status: "in_transit", startedAt: new Date(), startFileAssetId: body.data.fileAssetId }, $push: { statusHistory: { status: "in_transit", at: new Date(), actorId: auth.userId } }, $inc: { version: 1 } }, { new: true, session }).lean()
        if (!trip) throw conflict("TRIP_START_CONFLICT", "The trip is not ready to start or changed.")
        await advanceOrdersForTrip(params.data.tripId, "load_confirmed", "in_transit", auth.userId, session)
        started = trip
      })
    } finally { await session.endSession() }
    await audit(request, "trip.started", "trip", params.data.tripId, { capturedAt: body.data.capturedAt.toISOString() })
    return ok(request, started)
  })

  app.post("/trips/:tripId/location-batch", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "driver")
    const params = z.object({ tripId: z.string() }).safeParse(request.params)
    const body = z.object({ points: z.array(z.object({ sequence: z.number().int().min(0), recordedAt: z.coerce.date(), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), accuracy: z.number().min(0).max(10_000), heading: z.number().optional(), speed: z.number().optional() })).min(1).max(500) }).safeParse(request.body)
    if (!params.success || !body.success) throw badRequest("The location batch is invalid.")
    const trip = await Trip.findOne({ _id: params.data.tripId, driverId: auth.userId, status: "in_transit" }).lean()
    if (!trip) throw conflict("TRIP_NOT_ACTIVE", "Locations can be uploaded only for the Driver's active trip.")
    const writes = body.data.points.map((point) => ({
      sequence: point.sequence,
      latitude: point.latitude,
      longitude: point.longitude,
      accuracy: point.accuracy,
      heading: point.heading,
      speed: point.speed,
      recordedAt: point.recordedAt
    }))
    const result = await TripLocationCommandPort.recordLocations(trip._id, auth.userId, trip.vehicleId, writes)
    return ok(request, { acceptedCount: result.acceptedCount, duplicateCount: result.duplicateCount, lastPosition: body.data.points.at(-1) })
  })

  app.post("/trips/:tripId/stops/:stopId/arrive", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "driver")
    const params = z.object({ tripId: z.string(), stopId: z.string() }).safeParse(request.params)
    const body = z.object({ arrivedAt: z.coerce.date(), location: z.object({ latitude: z.number(), longitude: z.number(), accuracy: z.number() }).optional() }).safeParse(request.body)
    if (!params.success || !body.success) throw badRequest("Arrival data is invalid.")
    const { record, tripVersion } = await arriveAtStop(params.data.tripId, params.data.stopId, auth.userId, body.data.arrivedAt)
    await audit(request, "delivery.arrived", "delivery", record.id, { clientRecordedAt: body.data.arrivedAt.toISOString() })
    return ok(request, { delivery: record.toObject(), tripVersion })
  })

  app.patch("/trips/:tripId/stops/:stopId/items", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "driver")
    const params = z.object({ tripId: z.string(), stopId: z.string() }).safeParse(request.params)
    const body = z.object({ items: z.array(z.object({ sku: z.string(), delivered: z.number().int().min(0), short: z.number().int().min(0), damaged: z.number().int().min(0), note: z.string().max(500).optional() })), expectedVersion: z.number().int().optional() }).safeParse(request.body)
    if (!params.success || !body.success) throw badRequest("Delivery item outcomes are invalid.")
    const version = expectedVersion(request, body.data.expectedVersion)
    const record = await recordStopItems(params.data.tripId, params.data.stopId, auth.userId, body.data.items, version)
    return ok(request, record.toObject())
  })

  app.post("/store/deliveries/:deliveryId/pin", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "store_manager")
    const user = await UserReadPort.findById(auth.userId)
    if (!user?.outletId) throw notFound()
    const deliveryId = new mongoose.Types.ObjectId((request.params as any).deliveryId)
    // The driver may be offline when arriving, so the store can issue the PIN as soon as
    // the delivery is on an active trip; the driver's arrival syncs later.
    const record = await DeliveryRecord.findOne({ _id: deliveryId, outletId: user.outletId, status: { $in: ["pending", "arrived"] } })
    if (!record) throw conflict("PIN_NOT_AVAILABLE", "A PIN can be issued only for a delivery that is still to be completed at your outlet.")
    const activeTrip = await Trip.exists({ _id: record.tripId, status: "in_transit" })
    if (!activeTrip) throw conflict("PIN_NOT_AVAILABLE", "A PIN can be issued only while the delivery trip is on the road.")
    const pin = String(randomInt(0, 10_000)).padStart(4, "0")
    const expiresAt = new Date(clock.now().getTime() + 10 * 60_000)
    await DeliveryCommandPort.issueChallenge(deliveryId, pin, expiresAt)
    await audit(request, "delivery.pin_issued", "delivery", record.id)
    return ok(request, { pin, expiresAt })
  })

  app.post("/trips/:tripId/stops/:stopId/verify-pin", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "driver")
    const params = z.object({ tripId: z.string(), stopId: z.string() }).safeParse(request.params)
    const body = z.object({ pin: z.string().regex(/^\d{4}$/), clientRecordedAt: z.coerce.date() }).safeParse(request.body)
    if (!params.success || !body.success) throw badRequest("A four-digit PIN is required.")
    const record = await verifyStopPin(params.data.tripId, params.data.stopId, auth.userId, body.data.pin, body.data.clientRecordedAt)
    await audit(request, "delivery.pin_verified", "delivery", record.id, { clientRecordedAt: body.data.clientRecordedAt.toISOString() })
    return ok(request, { verified: true, deliveryId: record.id, version: record.version })
  })

  app.post("/trips/:tripId/stops/:stopId/complete", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "driver")
    const params = z.object({ tripId: z.string(), stopId: z.string() }).safeParse(request.params)
    const body = z.object({ outcome: z.enum(STOP_OUTCOMES), completedAt: z.coerce.date(), expectedVersion: z.number().int().optional() }).safeParse(request.body)
    if (!params.success || !body.success) throw badRequest("Completion data is invalid.")
    const version = expectedVersion(request, body.data.expectedVersion)
    const record = await completeStop(params.data.tripId, params.data.stopId, auth.userId, body.data.outcome, body.data.completedAt, version)
    await audit(request, "delivery.completed", "delivery", record.id, { outcome: body.data.outcome })
    // A stop that did not complete cleanly goes to the Dispatcher's remark review queue.
    if (body.data.outcome !== "delivered") {
      const outlet = await OutletReadPort.findByOutletId(record.outletId)
      await raiseTripRemark(request, { tripId: record.tripId, tripStopId: record.tripStopId, text: `Stop at ${outlet?.displayName ?? record.outletId} completed as "${body.data.outcome}".` })
    }
    return ok(request, record.toObject())
  })

  app.post("/trips/:tripId/finish", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "driver")
    const params = z.object({ tripId: z.string() }).safeParse(request.params)
    const body = z.object({ endFileAssetId: z.string().min(1), capturedAt: z.coerce.date(), expectedVersion: z.number().int().optional() }).safeParse(request.body)
    if (!params.success || !body.success) throw badRequest("End-meter evidence and current version are required.")
    const version = expectedVersion(request, body.data.expectedVersion)
    const trip = await assignedTrip(params.data.tripId, auth.userId)
    if ((trip as any).version !== version || trip.status !== "in_transit") throw conflict("TRIP_FINISH_CONFLICT", "The trip changed or is not active.")
    const incomplete = await DeliveryRecord.countDocuments({ tripId: trip._id, status: { $in: ["pending", "arrived"] } })
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
    const filter = { driverId: auth.userId, status: { $in: ["delivered", "failed", "receipt_confirmed", "receipt_issue"] } }
    const [rows, total] = await Promise.all([DeliveryRecord.find(filter).sort({ completedAt: -1 }).skip(skip).limit(limit).lean(), DeliveryRecord.countDocuments(filter)])
    return page(request, rows, query.data.page, query.data.pageSize, total)
  })

  app.post("/sync/batch", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "driver")
    const body = z.object({ deviceId: z.string().min(1).max(200), mutations: z.array(z.object({ clientMutationId: z.string().uuid(), entityType: z.string(), entityId: z.string(), operation: z.string(), baseVersion: z.number().int().min(0), clientRecordedAt: z.coerce.date(), payload: z.record(z.unknown()) })).max(100) }).safeParse(request.body)
    if (!body.success) throw badRequest("The sync batch is invalid.", body.error.flatten())
    const results: Array<Record<string, unknown>> = []
    // Mutations are applied strictly in the order the device recorded them. Once one
    // fails for a trip, later mutations for that trip are not applied, because they
    // build on the failed step (for example completing a stop whose PIN was wrong).
    const failedTrips = new Set<string>()
    const stopPayload = z.object({ tripId: z.string().min(1), stopId: z.string().min(1) })
    for (const mutation of body.data.mutations) {
      const prior = await MutationLedgerCommandPort.findSyncReceipt(mutation.clientMutationId, auth.userId)
      if (prior) { results.push({ clientMutationId: mutation.clientMutationId, result: "duplicate", response: prior.response }); continue }
      const tripKey = typeof mutation.payload.tripId === "string" ? mutation.payload.tripId : undefined
      let result: "applied" | "conflict" | "rejected" = "rejected"
      let response: unknown = { code: "UNSUPPORTED_OFFLINE_OPERATION", message: "This operation is not accepted by the offline sync contract." }
      let recordReceipt = true
      try {
        if (mutation.clientRecordedAt.getTime() > Date.now() + MAX_CLIENT_CLOCK_SKEW_MS) throw unprocessable("CLIENT_TIME_INVALID", "The device clock is ahead of the server.")
        if (tripKey && mutation.operation !== "location" && failedTrips.has(tripKey)) { recordReceipt = false; throw unprocessable("DEPENDENCY_FAILED", "An earlier step for this trip did not apply.") }
        const stop = stopPayload.safeParse(mutation.payload)
        if (mutation.operation === "location") {
          const point = z.object({ tripId: z.string(), sequence: z.number().int(), latitude: z.number(), longitude: z.number(), accuracy: z.number() }).parse(mutation.payload)
          const trip = await Trip.findOne({ _id: point.tripId, driverId: auth.userId }).lean()
          if (!trip) throw conflict("TRIP_NOT_ASSIGNED", "The trip is not assigned to this Driver.")
          await TripLocationCommandPort.recordLocations(trip._id, auth.userId, trip.vehicleId, [{ sequence: point.sequence, latitude: point.latitude, longitude: point.longitude, accuracy: point.accuracy, recordedAt: mutation.clientRecordedAt }])
          result = "applied"; response = { accepted: true }
        } else if (mutation.operation === "stop_arrive" && stop.success) {
          const { record } = await arriveAtStop(stop.data.tripId, stop.data.stopId, auth.userId, mutation.clientRecordedAt)
          result = "applied"; response = { deliveryId: record.id, status: record.status }
        } else if (mutation.operation === "stop_items" && stop.success) {
          const items = z.object({ items: z.array(z.object({ sku: z.string(), delivered: z.number().int().min(0), short: z.number().int().min(0), damaged: z.number().int().min(0), note: z.string().max(500).optional() })) }).parse(mutation.payload).items
          const record = await recordStopItems(stop.data.tripId, stop.data.stopId, auth.userId, items)
          result = "applied"; response = { deliveryId: record.id }
        } else if (mutation.operation === "pin_submission" && stop.success) {
          const { pin } = z.object({ pin: z.string().regex(/^\d{4}$/) }).parse(mutation.payload)
          const record = await verifyStopPin(stop.data.tripId, stop.data.stopId, auth.userId, pin, mutation.clientRecordedAt)
          result = "applied"; response = { verified: true, deliveryId: record.id }
        } else if (mutation.operation === "stop_complete" && stop.success) {
          const { outcome } = z.object({ outcome: z.enum(STOP_OUTCOMES) }).parse(mutation.payload)
          const record = await completeStop(stop.data.tripId, stop.data.stopId, auth.userId, outcome, mutation.clientRecordedAt)
          result = "applied"; response = { deliveryId: record.id, status: record.status }
        } else if (mutation.operation !== "location") {
          recordReceipt = false
        }
      } catch (error) {
        if (error instanceof AppError) {
          result = error.statusCode === 409 ? "conflict" : "rejected"
          response = { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) }
        } else if (error instanceof z.ZodError) {
          result = "rejected"; response = { code: "VALIDATION_ERROR", message: "The mutation payload is invalid." }
        } else { throw error }
      }
      if (result !== "applied" && tripKey && mutation.operation !== "location") failedTrips.add(tripKey)
      if (recordReceipt) await MutationLedgerCommandPort.recordSyncReceipt({ mutationId: mutation.clientMutationId, actorId: auth.userId, entityId: mutation.entityId, operation: mutation.operation, result, response })
      results.push({ clientMutationId: mutation.clientMutationId, result, response })
    }
    return ok(request, { deviceId: body.data.deviceId, results })
  })
}
