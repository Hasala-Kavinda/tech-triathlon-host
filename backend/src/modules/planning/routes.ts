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
import { DeliveryRecord, Trip } from "../../database/models/index.js"
import { OrderReadPort } from "../orders/order.read-port.js"
import { LoadingCommandPort } from "../loading/loading.command-port.js"
import { DeliveryCommandPort } from "../delivery/delivery.command-port.js"
import { allocateOrdersToTrip, deferOrder, deferOrderBatch } from "../orders/order.commands.js"
import { UserReadPort } from "../auth/user.read-port.js"
import { VehicleReadPort } from "../reference/vehicle.read-port.js"
import { validateTrip } from "./constraints.js"
import { buildEngineContext } from "./engine-context.js"
import { CounterCommandPort } from "../../database/persistence/counter.command-port.js"

const tripBody = z.object({
  serviceDate: z.string(), departureAt: z.coerce.date(), plannedEndAt: z.coerce.date(), vehicleId: z.string().min(1), driverId: z.string().min(1),
  distanceKm: z.number().min(0),
  routeIndex: z.number().int().min(1).optional().default(1),
  stops: z.array(z.object({ orderId: z.string().min(1), plannedArrivalAt: z.coerce.date() })).min(1),
})

async function buildValidation(data: z.infer<typeof tripBody>, devMode: boolean, excludeTripId?: string) {
  return validateTrip({
    serviceDate: data.serviceDate, departureAt: data.departureAt, plannedEndAt: data.plannedEndAt,
    vehicleId: data.vehicleId, driverId: data.driverId, orderIds: data.stops.map((stop) => stop.orderId),
    plannedArrivals: Object.fromEntries(data.stops.map((stop) => [stop.orderId, stop.plannedArrivalAt])),
    distanceKm: data.distanceKm,
    devMode,
    ...(excludeTripId ? { excludeTripId } : {}),
  })
}

export async function planningRoutes(app: FastifyInstance) {
  app.get("/planning/orders", { preHandler: app.authenticate }, async (request) => {
    requireRole(request, "dispatcher")
    const query = z.object({ serviceDate: z.string(), brand: z.string().optional(), status: z.string().optional() }).merge(paginationSchema).safeParse(request.query)
    if (!query.success) throw badRequest("A valid serviceDate and filters are required.")
    parseServiceDate(query.data.serviceDate)
    const { skip, limit } = pagination(query.data.page, query.data.pageSize)
    const { rows, total } = await OrderReadPort.findEligibleForDatePaged(query.data.serviceDate, query.data.brand, query.data.status, skip, limit)
    return page(request, rows, query.data.page, query.data.pageSize, total)
  })

  app.get("/planning/due-summary", { preHandler: app.authenticate }, async (request) => {
    requireRole(request, "dispatcher")
    const query = z.object({ from: z.string(), to: z.string() }).safeParse(request.query)
    if (!query.success) throw badRequest("from and to dates are required.")
    parseServiceDate(query.data.from)
    parseServiceDate(query.data.to)
    if (query.data.to < query.data.from) throw badRequest("to must not be before from.")
    return ok(request, await OrderReadPort.dueSummary(query.data.from, query.data.to))
  })

  app.get("/planning/engine-context", { preHandler: app.authenticate }, async (request) => {
    requireRole(request, "dispatcher")
    const query = z.object({ serviceDate: z.string() }).safeParse(request.query)
    if (!query.success) throw badRequest("A valid serviceDate is required.")
    parseServiceDate(query.data.serviceDate)
    return ok(request, await buildEngineContext(query.data.serviceDate, app.config.referenceDataDir, app.config.devMode))
  })

  app.get("/planning/due-orders", { preHandler: app.authenticate }, async (request) => {
    requireRole(request, "dispatcher")
    const query = z.object({ date: z.string(), brand: z.string().optional() }).safeParse(request.query)
    if (!query.success) throw badRequest("A valid date is required.")
    parseServiceDate(query.data.date)
    return ok(request, await OrderReadPort.findDueByDate(query.data.date, query.data.brand))
  })

  app.post("/planning/trips", { preHandler: app.authenticate }, async (request, reply) => {
    const auth = requireRole(request, "dispatcher")
    const parsed = tripBody.safeParse(request.body)
    if (!parsed.success) throw badRequest("The trip draft is invalid.", parsed.error.flatten())
    parseServiceDate(parsed.data.serviceDate)
    const [driver, vehicle] = await Promise.all([
      UserReadPort.findDriverById(parsed.data.driverId),
      VehicleReadPort.findByVehicleId(parsed.data.vehicleId),
    ])
    if (!driver) throw unprocessable("DRIVER_UNAVAILABLE", "The selected Driver is unavailable.")
    if (!vehicle) throw unprocessable("VEHICLE_UNAVAILABLE", "The selected vehicle is unavailable.")
    const validation = await buildValidation(parsed.data, app.config.devMode)
    const orders = await OrderReadPort.findByIds(parsed.data.stops.map((stop) => stop.orderId))
    const orderMap = new Map(orders.map((order) => [String(order._id), order]))
    let trip!: InstanceType<typeof Trip>
    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        const seq = await CounterCommandPort.getNextSequence("trip", session)
        trip = (await Trip.create(
          [{
            tripNumber: `TRP-${parsed.data.serviceDate.replaceAll("-", "")}-${String(seq).padStart(6, "0")}`,
            ...parsed.data, depot: vehicle.depot, dispatcherId: auth.userId, status: "draft",
            totals: { distanceKm: parsed.data.distanceKm, weightKg: 0, volumeM3: 0, fuelLitres: 0 },
            stops: parsed.data.stops.map((stop, index) => ({ tripStopId: new mongoose.Types.ObjectId(), stopId: `STOP-${index + 1}`, orderId: stop.orderId, orderIds: [stop.orderId], outletId: orderMap.get(stop.orderId)?.outletId, sequence: index + 1, plannedArrivalAt: stop.plannedArrivalAt })),
            constraintCheck: { checkedAt: new Date(), valid: validation.valid, rules: validation.rules },
            statusHistory: [{ status: "draft", at: new Date(), actorId: auth.userId }],
          }],
          { session },
        ))[0]!
      })
    } finally { await session.endSession() }
    await audit(request, "trip.draft_created", "trip", trip!.id, { valid: validation.valid })
    return reply.status(201).send(ok(request, trip!.toObject()))
  })

  app.post("/planning/trips/:tripId/validate", { preHandler: app.authenticate }, async (request) => {
    requireRole(request, "dispatcher")
    const params = z.object({ tripId: z.string() }).safeParse(request.params)
    if (!params.success) throw badRequest("A trip ID is required.")
    const trip = await Trip.findById(params.data.tripId)
    if (!trip) throw notFound()
    const data = { serviceDate: trip.serviceDate, departureAt: trip.departureAt, plannedEndAt: trip.plannedEndAt!, vehicleId: trip.vehicleId, driverId: String(trip.driverId), distanceKm: trip.distanceKm, routeIndex: trip.routeIndex, stops: trip.stops.map((stop) => ({ orderId: String(stop.orderId), plannedArrivalAt: stop.plannedArrivalAt! })) }
    const validation = await buildValidation(data, app.config.devMode, trip.id)
    trip.set("constraintCheck", { checkedAt: new Date(), valid: validation.valid, rules: validation.rules })
    await trip.save()
    return ok(request, { ...validation, version: (trip as any).version })
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
        const data = { serviceDate: trip.serviceDate, departureAt: trip.departureAt, plannedEndAt: trip.plannedEndAt!, vehicleId: trip.vehicleId, driverId: String(trip.driverId), distanceKm: trip.distanceKm, routeIndex: trip.routeIndex, stops: trip.stops.map((stop) => ({ orderId: String(stop.orderId), plannedArrivalAt: stop.plannedArrivalAt! })) }
        const validation = await buildValidation(data, app.config.devMode, trip.id)
        if (!validation.valid) throw unprocessable("TRIP_CONSTRAINTS_FAILED", "The trip does not satisfy all hard constraints.", validation)
        const orderIds = trip.stops.flatMap((stop) => stop.orderIds || [stop.orderId])
        const uniqueOrderIds = Array.from(new Set(orderIds.map(String)))
        const { modifiedCount } = await allocateOrdersToTrip(uniqueOrderIds, trip._id, auth.userId, session)
        if (modifiedCount !== uniqueOrderIds.length) throw conflict("ORDER_ALLOCATION_CONFLICT", "One or more orders were allocated concurrently.")
        const orders = await OrderReadPort.findByIdsInSession(uniqueOrderIds, session)
        const orderMap = new Map(orders.map((order) => [String(order._id), order]))
        const loadItems = [...trip.stops].reverse().flatMap((stop) => {
          const stopOrders = stop.orderIds.map((id) => orderMap.get(String(id))).filter(Boolean)
          const itemsBySku = new Map<string, { sku: string, name: string, quantity: number, orderIds: Set<string> }>()
          for (const order of stopOrders) {
            for (const item of order!.items) {
              const existing = itemsBySku.get(item.sku)
              if (existing) {
                existing.quantity += item.quantity
                existing.orderIds.add(String(order!._id))
              } else {
                itemsBySku.set(item.sku, { sku: item.sku, name: item.name, quantity: item.quantity, orderIds: new Set([String(order!._id)]) })
              }
            }
          }
          return Array.from(itemsBySku.values()).map((item) => ({
            itemId: `${stop.tripStopId}-${item.sku}`,
            tripStopId: stop.tripStopId as mongoose.Types.ObjectId,
            orderIds: Array.from(item.orderIds).map(id => new mongoose.Types.ObjectId(id)),
            sku: item.sku,
            name: item.name,
            expectedQuantity: item.quantity,
          }))
        })
        await LoadingCommandPort.createLoadJob({ tripId: trip._id as mongoose.Types.ObjectId, depot: trip.depot, items: loadItems }, session)
        
        const deliveryRecords = trip.stops.map(stop => {
          const stopOrders = stop.orderIds.map((id) => orderMap.get(String(id))).filter(Boolean)
          const itemsBySku = new Map<string, { sku: string, quantity: number, orderIds: Set<string> }>()
          for (const order of stopOrders) {
            for (const item of order!.items) {
              const existing = itemsBySku.get(item.sku)
              if (existing) {
                existing.quantity += item.quantity
                existing.orderIds.add(String(order!._id))
              } else {
                itemsBySku.set(item.sku, { sku: item.sku, quantity: item.quantity, orderIds: new Set([String(order!._id)]) })
              }
            }
          }
          const items = Array.from(itemsBySku.values()).map(item => ({
            sku: item.sku,
            orderIds: Array.from(item.orderIds).map(id => new mongoose.Types.ObjectId(id)),
            expectedQuantity: item.quantity
          }))
          return {
            tripId: trip._id as mongoose.Types.ObjectId,
            tripStopId: stop.tripStopId as mongoose.Types.ObjectId,
            outletId: stop.outletId,
            driverId: trip.driverId as mongoose.Types.ObjectId,
            items
          }
        })
        await DeliveryCommandPort.createDeliveryRecordsForPublishedTrip(deliveryRecords, session)

        // The draft starts with zero totals; record the real load so the Loader (and anyone
        // reading the trip) sees the weight and volume that was actually planned.
        trip.set("totals.weightKg", orders.reduce((sum, order) => sum + order.totalWeightKg, 0))
        trip.set("totals.volumeM3", orders.reduce((sum, order) => sum + order.totalVolumeM3, 0))
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
    const order = await deferOrder(params.data.orderId, body.data.nextDate, body.data.reasonCode, body.data.note, auth.userId)
    if (!order) throw conflict("ORDER_NOT_DEFERRABLE", "The order is no longer available for deferral.")
    await audit(request, "order.deferred", "order", String(order._id), { nextDate: body.data.nextDate, reasonCode: body.data.reasonCode })
    return ok(request, order)
  })

  app.post("/orders/defer-batch", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "dispatcher")
    const body = z.object({ orderIds: z.array(z.string()).min(1).max(100), nextDate: z.string(), reasonCode: z.string().min(1), note: z.string().max(1000).optional() }).safeParse(request.body)
    if (!body.success) throw badRequest("A valid batch deferral request is required.")
    parseServiceDate(body.data.nextDate)
    const results = await deferOrderBatch(body.data.orderIds, body.data.nextDate, body.data.reasonCode, body.data.note, auth.userId)
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
    const orders = await OrderReadPort.findByIds(trip.stops.map((stop) => stop.orderId))
    // Delivery records carry the expected quantities (after any load shortage) for each stop.
    const deliveries = await DeliveryRecord.find({ tripId: trip._id }).lean()
    return ok(request, { ...trip, orders, deliveries })
  })
}
