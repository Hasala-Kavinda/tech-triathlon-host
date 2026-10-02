import { randomBytes } from "node:crypto"
import mongoose from "mongoose"
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { requireRole } from "../../common/auth.js"
import { audit } from "../../common/audit.js"
import { badRequest, conflict, notFound, unprocessable } from "../../common/errors.js"
import { pagination, paginationSchema } from "../../common/pagination.js"
import { ok, page } from "../../common/response.js"
import { parseServiceDate } from "../../common/time.js"
import { expectedVersion } from "../../common/version.js"
import { LoadRecord, Order, Trip, Vehicle } from "../../database/models/index.js"
import { UserReadPort } from "../auth/user.read-port.js"
import { validateTrip } from "./constraints.js"

const tripBody = z.object({
  serviceDate: z.string(), departureAt: z.coerce.date(), plannedEndAt: z.coerce.date(), vehicleId: z.string().min(1), driverId: z.string().min(1),
  distanceKm: z.number().min(0),
  stops: z.array(z.object({ orderId: z.string().min(1), plannedArrivalAt: z.coerce.date() })).min(1),
})

async function buildValidation(data: z.infer<typeof tripBody>, excludeTripId?: string) {
  return validateTrip({
    serviceDate: data.serviceDate, departureAt: data.departureAt, plannedEndAt: data.plannedEndAt,
    vehicleId: data.vehicleId, driverId: data.driverId, orderIds: data.stops.map((stop) => stop.orderId),
    plannedArrivals: Object.fromEntries(data.stops.map((stop) => [stop.orderId, stop.plannedArrivalAt])),
    distanceKm: data.distanceKm,
    ...(excludeTripId ? { excludeTripId } : {}),
  })
}

export async function planningRoutes(app: FastifyInstance) {
  app.get("/planning/orders", { preHandler: app.authenticate }, async (request) => {
    requireRole(request, "dispatcher")
    const query = z.object({ serviceDate: z.string(), brand: z.string().optional(), status: z.string().optional() }).merge(paginationSchema).safeParse(request.query)
    if (!query.success) throw badRequest("A valid serviceDate and filters are required.")
    parseServiceDate(query.data.serviceDate)
    const filter: Record<string, unknown> = { requestedDate: query.data.serviceDate, status: query.data.status ?? { $in: ["submitted", "deferred"] }, allocatedTripId: { $exists: false } }
    if (query.data.brand) filter.brand = query.data.brand
    const { skip, limit } = pagination(query.data.page, query.data.pageSize)
    const [rows, total] = await Promise.all([Order.find(filter).sort({ cutoffBucket: 1, createdAt: 1 }).skip(skip).limit(limit).lean(), Order.countDocuments(filter)])
    return page(request, rows, query.data.page, query.data.pageSize, total)
  })

  app.post("/planning/trips", { preHandler: app.authenticate }, async (request, reply) => {
    const auth = requireRole(request, "dispatcher")
    const parsed = tripBody.safeParse(request.body)
    if (!parsed.success) throw badRequest("The trip draft is invalid.", parsed.error.flatten())
    parseServiceDate(parsed.data.serviceDate)
    const [driver, vehicle] = await Promise.all([
      UserReadPort.findDriverById(parsed.data.driverId),
      Vehicle.findOne({ vehicleId: parsed.data.vehicleId, active: true }).lean(),
    ])
    if (!driver) throw unprocessable("DRIVER_UNAVAILABLE", "The selected Driver is unavailable.")
    if (!vehicle) throw unprocessable("VEHICLE_UNAVAILABLE", "The selected vehicle is unavailable.")
    const validation = await buildValidation(parsed.data)
    const orders = await Order.find({ _id: { $in: parsed.data.stops.map((stop) => stop.orderId) } }).lean()
    const orderMap = new Map(orders.map((order) => [String(order._id), order]))
    const trip = await Trip.create({
      tripNumber: `TRP-${parsed.data.serviceDate.replaceAll("-", "")}-${randomBytes(3).toString("hex").toUpperCase()}`,
      ...parsed.data, depot: vehicle.depot, dispatcherId: auth.userId, status: "draft",
      stops: parsed.data.stops.map((stop, index) => ({ stopId: `STOP-${index + 1}`, orderId: stop.orderId, outletId: orderMap.get(stop.orderId)?.outletId, sequence: index + 1, plannedArrivalAt: stop.plannedArrivalAt })),
      constraintCheck: { checkedAt: new Date(), valid: validation.valid, rules: validation.rules },
      statusHistory: [{ status: "draft", at: new Date(), actorId: auth.userId }],
    })
    await audit(request, "trip.draft_created", "trip", trip.id, { valid: validation.valid })
    return reply.status(201).send(ok(request, trip.toObject()))
  })

  app.post("/planning/trips/:tripId/validate", { preHandler: app.authenticate }, async (request) => {
    requireRole(request, "dispatcher")
    const params = z.object({ tripId: z.string() }).safeParse(request.params)
    if (!params.success) throw badRequest("A trip ID is required.")
    const trip = await Trip.findById(params.data.tripId)
    if (!trip) throw notFound()
    const data = { serviceDate: trip.serviceDate, departureAt: trip.departureAt, plannedEndAt: trip.plannedEndAt!, vehicleId: trip.vehicleId, driverId: String(trip.driverId), distanceKm: trip.distanceKm, stops: trip.stops.map((stop) => ({ orderId: String(stop.orderId), plannedArrivalAt: stop.plannedArrivalAt! })) }
    const validation = await buildValidation(data, trip.id)
    trip.set("constraintCheck", { checkedAt: new Date(), valid: validation.valid, rules: validation.rules })
    await trip.save()
    return ok(request, { ...validation, version: trip.version })
  })

  app.post("/planning/trips/:tripId/publish", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "dispatcher")
    const params = z.object({ tripId: z.string() }).safeParse(request.params)
    const body = z.object({ expectedVersion: z.number().int().optional() }).safeParse(request.body ?? {})
    if (!params.success || !body.success) throw badRequest("A valid trip ID and version are required.")
    const version = expectedVersion(request, body.data.expectedVersion)
    const session = await mongoose.startSession()
    let published: InstanceType<typeof Trip> | null = null
    try {
      await session.withTransaction(async () => {
        const trip = await Trip.findOne({ _id: params.data.tripId, status: "draft", version }).session(session)
        if (!trip) throw conflict("STALE_OR_INVALID_STATE", "The trip changed or is no longer a draft.")
        const data = { serviceDate: trip.serviceDate, departureAt: trip.departureAt, plannedEndAt: trip.plannedEndAt!, vehicleId: trip.vehicleId, driverId: String(trip.driverId), distanceKm: trip.distanceKm, stops: trip.stops.map((stop) => ({ orderId: String(stop.orderId), plannedArrivalAt: stop.plannedArrivalAt! })) }
        const validation = await buildValidation(data, trip.id)
        if (!validation.valid) throw unprocessable("TRIP_CONSTRAINTS_FAILED", "The trip does not satisfy all hard constraints.", validation)
        const orderIds = trip.stops.map((stop) => stop.orderId)
        const update = await Order.updateMany({ _id: { $in: orderIds }, status: { $in: ["submitted", "deferred"] }, allocatedTripId: { $exists: false } }, { $set: { status: "allocated", allocatedTripId: trip._id }, $push: { statusHistory: { status: "allocated", at: new Date(), actorId: auth.userId } } }, { session })
        if (update.modifiedCount !== orderIds.length) throw conflict("ORDER_ALLOCATION_CONFLICT", "One or more orders were allocated concurrently.")
        const orders = await Order.find({ _id: { $in: orderIds } }).session(session).lean()
        const orderMap = new Map(orders.map((order) => [String(order._id), order]))
        const loadItems = [...trip.stops].reverse().flatMap((stop) => (orderMap.get(String(stop.orderId))?.items ?? []).map((item) => ({ itemId: `${stop.stopId}-${item.sku}`, stopId: stop.stopId, orderId: stop.orderId, sku: item.sku, name: item.name, expectedQuantity: item.quantity })))
        await LoadRecord.create([{ tripId: trip._id, depot: trip.depot, status: "available", items: loadItems }], { session })
        trip.status = "published"
        trip.set("constraintCheck", { checkedAt: new Date(), valid: true, rules: validation.rules })
        trip.statusHistory.push({ status: "published", at: new Date(), actorId: new mongoose.Types.ObjectId(auth.userId) })
        await trip.save({ session })
        published = trip
      })
    } finally { await session.endSession() }
    await audit(request, "trip.published", "trip", params.data.tripId)
    return ok(request, published!.toObject())
  })

  app.post("/orders/:orderId/defer", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "dispatcher")
    const params = z.object({ orderId: z.string() }).safeParse(request.params)
    const body = z.object({ nextDate: z.string(), reasonCode: z.string().min(1), note: z.string().max(1000).optional() }).safeParse(request.body)
    if (!params.success || !body.success) throw badRequest("A valid deferral request is required.")
    parseServiceDate(body.data.nextDate)
    const order = await Order.findOneAndUpdate({ _id: params.data.orderId, status: { $in: ["submitted", "deferred"] }, allocatedTripId: { $exists: false } }, { $set: { status: "deferred", deferredTo: body.data.nextDate, deferralReason: body.data.reasonCode }, $push: { statusHistory: { status: "deferred", at: new Date(), actorId: auth.userId, note: body.data.note ?? body.data.reasonCode } } }, { new: true })
    if (!order) throw conflict("ORDER_NOT_DEFERRABLE", "The order is no longer available for deferral.")
    await audit(request, "order.deferred", "order", order.id, { nextDate: body.data.nextDate, reasonCode: body.data.reasonCode })
    return ok(request, order.toObject())
  })

  app.post("/orders/defer-batch", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "dispatcher")
    const body = z.object({ orderIds: z.array(z.string()).min(1).max(100), nextDate: z.string(), reasonCode: z.string().min(1), note: z.string().max(1000).optional() }).safeParse(request.body)
    if (!body.success) throw badRequest("A valid batch deferral request is required.")
    parseServiceDate(body.data.nextDate)
    const results = []
    for (const orderId of body.data.orderIds) {
      const order = await Order.findOneAndUpdate({ _id: orderId, status: { $in: ["submitted", "deferred"] }, allocatedTripId: { $exists: false } }, { $set: { status: "deferred", deferredTo: body.data.nextDate, deferralReason: body.data.reasonCode }, $push: { statusHistory: { status: "deferred", at: new Date(), actorId: auth.userId, note: body.data.note ?? body.data.reasonCode } } }, { new: true }).lean()
      results.push({ orderId, result: order ? "deferred" : "conflict", order })
    }
    await audit(request, "order.batch_deferred", "order_batch", request.id, { count: body.data.orderIds.length, nextDate: body.data.nextDate, reasonCode: body.data.reasonCode })
    return ok(request, results)
  })

  app.patch("/planning/trips/:tripId", { preHandler: app.authenticate }, async (request) => {
    requireRole(request, "dispatcher")
    const params = z.object({ tripId: z.string() }).safeParse(request.params)
    const body = tripBody.partial().extend({ expectedVersion: z.number().int().optional() }).safeParse(request.body)
    if (!params.success || !body.success) throw badRequest("The trip edit is invalid.")
    const version = expectedVersion(request, body.data.expectedVersion)
    const { expectedVersion: _ignored, ...changes } = body.data
    const trip = await Trip.findOneAndUpdate({ _id: params.data.tripId, status: "draft", version }, { $set: changes, $inc: { version: 1 } }, { new: true })
    if (!trip) throw conflict("TRIP_EDIT_CONFLICT", "Only a current draft can be edited.")
    return ok(request, trip.toObject())
  })

  app.get("/trips", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "dispatcher", "loader", "driver")
    const query = z.object({ date: z.string(), status: z.string().optional(), vehicleId: z.string().optional() }).safeParse(request.query)
    if (!query.success) throw badRequest("A valid date is required.")
    const filter: Record<string, unknown> = { serviceDate: query.data.date }
    if (query.data.status) filter.status = query.data.status
    if (query.data.vehicleId) filter.vehicleId = query.data.vehicleId
    if (auth.role === "driver") filter.driverId = auth.userId
    const rows = await Trip.find(filter).sort({ departureAt: 1 }).lean()
    return ok(request, rows)
  })

  app.get("/trips/:tripId", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "dispatcher", "loader", "driver")
    const params = z.object({ tripId: z.string() }).safeParse(request.params)
    if (!params.success) throw badRequest("A trip ID is required.")
    const filter: Record<string, unknown> = { _id: params.data.tripId }
    if (auth.role === "driver") filter.driverId = auth.userId
    const trip = await Trip.findOne(filter).lean()
    if (!trip) throw notFound()
    const orders = await Order.find({ _id: { $in: trip.stops.map((stop) => stop.orderId) } }).lean()
    return ok(request, { ...trip, orders })
  })
}
