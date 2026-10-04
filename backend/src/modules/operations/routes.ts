import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { requireRole } from "../../common/auth.js"
import { audit } from "../../common/audit.js"
import { badRequest, conflict, notFound } from "../../common/errors.js"
import { pagination, paginationSchema } from "../../common/pagination.js"
import { ok, page } from "../../common/response.js"
import { expectedVersion } from "../../common/version.js"
import { DeliveryRecord, LoadRecord, OperationalEvent, Trip, TripLocation } from "../../database/models/index.js"
import { RemarkCommandPort } from "../audit/remark.command-port.js"
import { RemarkReadPort } from "../audit/remark.read-port.js"
import { OrderReadPort } from "../orders/order.read-port.js"
import { UserReadPort } from "../auth/user.read-port.js"
import { buildTripMonitor } from "./trip-monitor.js"
import { raiseTripRemark } from "./trip-remarks.js"
import { trackingState } from "./tracking.js"

async function storeOutlet(userId: string) {
  const user = await UserReadPort.findById(userId)
  if (!user?.outletId) throw notFound()
  return user.outletId
}

export async function operationRoutes(app: FastifyInstance) {
  app.get("/store/dashboard", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "store_manager")
    const outletId = await storeOutlet(auth.userId)
    const [recentOrders, deliveries, attentionCount] = await Promise.all([
      OrderReadPort.findRecentByOutlet(outletId, 5),
      DeliveryRecord.find({ outletId, status: { $in: ["pending", "arrived"] } }).sort({ createdAt: 1 }).limit(5).lean(),
      DeliveryRecord.countDocuments({ outletId, outcome: { $in: ["partial", "failed"] }, status: { $in: ["delivered", "failed", "receipt_confirmed", "receipt_issue"] } }),
    ])
    // A delivery record only knows its trip and stop; add the vehicle, planned arrival and
    // the orders it carries so the dashboard can show what is coming and when.
    const trips = await Trip.find({ _id: { $in: deliveries.map((delivery) => delivery.tripId) } }).select("tripNumber vehicleId serviceDate departureAt stops").lean()
    const tripById = new Map(trips.map((trip) => [String(trip._id), trip]))
    const orders = await OrderReadPort.findByIds(deliveries.flatMap((delivery) => delivery.items.flatMap((item) => item.orderIds.map(String))))
    const orderById = new Map(orders.map((order) => [String(order._id), order]))
    const upcomingDeliveries = deliveries.map((delivery) => {
      const trip = tripById.get(String(delivery.tripId))
      const stop = trip?.stops.find((candidate) => String(candidate.tripStopId) === String(delivery.tripStopId))
      const orderIds = [...new Set(delivery.items.flatMap((item) => item.orderIds.map(String)))]
      return {
        ...delivery,
        trip: trip ? { tripNumber: trip.tripNumber, vehicleId: trip.vehicleId, serviceDate: trip.serviceDate, departureAt: trip.departureAt, plannedArrivalAt: stop?.plannedArrivalAt } : null,
        orders: orderIds.flatMap((id) => { const order = orderById.get(id); return order ? [{ _id: id, orderNumber: order.orderNumber, orderType: order.orderType, brand: order.brand }] : [] }),
      }
    }).sort((a, b) => new Date(a.trip?.plannedArrivalAt ?? a.createdAt).getTime() - new Date(b.trip?.plannedArrivalAt ?? b.createdAt).getTime())
    return ok(request, { recentOrders, upcomingDeliveries, attentionCount })
  })

  app.get("/store/deliveries", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "store_manager")
    const outletId = await storeOutlet(auth.userId)
    const query = z.object({ status: z.string().optional(), date: z.string().optional() }).safeParse(request.query)
    if (!query.success) throw badRequest("Invalid delivery filters.")
    const filter: Record<string, unknown> = { outletId }
    if (query.data.status) filter.status = query.data.status
    const rows = await DeliveryRecord.find(filter).sort({ createdAt: -1 }).lean()
    return ok(request, rows)
  })

  app.get("/store/delivery-history", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "store_manager")
    const outletId = await storeOutlet(auth.userId)
    const query = z.object({ outcome: z.string().optional(), from: z.string().optional(), to: z.string().optional() }).merge(paginationSchema).safeParse(request.query)
    if (!query.success) throw badRequest("Invalid delivery history filters.")
    const filter: Record<string, unknown> = { outletId, status: { $in: ["delivered", "failed", "receipt_confirmed", "receipt_issue"] } }
    if (query.data.outcome) filter.outcome = query.data.outcome
    if (query.data.from || query.data.to) filter.completedAt = { ...(query.data.from ? { $gte: new Date(query.data.from) } : {}), ...(query.data.to ? { $lte: new Date(query.data.to) } : {}) }
    const { skip, limit } = pagination(query.data.page, query.data.pageSize)
    const [rows, total] = await Promise.all([DeliveryRecord.find(filter).sort({ completedAt: -1 }).skip(skip).limit(limit).lean(), DeliveryRecord.countDocuments(filter)])
    return page(request, rows, query.data.page, query.data.pageSize, total)
  })

  app.get("/store/deliveries/:deliveryId", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "store_manager")
    const outletId = await storeOutlet(auth.userId)
    const params = z.object({ deliveryId: z.string() }).safeParse(request.params)
    if (!params.success) throw badRequest("A delivery ID is required.")
    const delivery = await DeliveryRecord.findOne({ _id: params.data.deliveryId, outletId }).lean()
    if (!delivery) throw notFound()
    const trip = await Trip.findById(delivery.tripId).lean()
    const lastLocation = await TripLocation.findOne({ tripId: delivery.tripId }).sort({ recordedAt: -1 }).lean()
    const trackingLoc = lastLocation ? { ...lastLocation, latitude: lastLocation.location.coordinates[1], longitude: lastLocation.location.coordinates[0], location: undefined } : null
    return ok(request, { delivery, trip, tracking: trackingLoc ? { lastLocation: trackingLoc, lastSeenAt: trackingLoc.recordedAt } : null })
  })

  app.post("/store/deliveries/:deliveryId/receipt", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "store_manager")
    const outletId = await storeOutlet(auth.userId)
    const params = z.object({ deliveryId: z.string() }).safeParse(request.params)
    const body = z.object({ result: z.enum(["full", "issue"]), itemOutcomes: z.array(z.object({ sku: z.string(), received: z.number().int().min(0), issueType: z.string().optional() })).default([]), remark: z.string().max(2000).optional(), evidenceFileIds: z.array(z.string()).max(10).default([]), expectedVersion: z.number().int().optional() }).safeParse(request.body)
    if (!params.success || !body.success) throw badRequest("The receipt is invalid.")
    const version = expectedVersion(request, body.data.expectedVersion)
    const record = await DeliveryRecord.findOneAndUpdate({ _id: params.data.deliveryId, outletId, status: { $in: ["delivered", "failed"] }, version, receipt: { $exists: false } }, { $set: { status: body.data.result === "full" ? "receipt_confirmed" : "receipt_issue", receipt: { ...body.data, confirmedAt: new Date(), confirmedBy: auth.userId } }, $inc: { version: 1 } }, { new: true })
    if (!record) throw conflict("RECEIPT_CONFLICT", "The delivery is not receivable, changed, or already has a receipt.")
    await audit(request, body.data.result === "full" ? "receipt.confirmed" : "receipt.issue_reported", "delivery", record.id, { result: body.data.result })
    if (body.data.result === "issue") {
      const issues = body.data.itemOutcomes.filter((item) => item.issueType).map((item) => `${item.sku}: ${item.issueType} (received ${item.received})`)
      await raiseTripRemark(request, { tripId: record.tripId, tripStopId: record.tripStopId, text: [body.data.remark?.trim() || "Receipt issue reported by the store.", ...issues].join(" | ") })
    }
    return ok(request, record.toObject())
  })

  app.get("/monitor/trips", { preHandler: app.authenticate }, async (request) => {
    requireRole(request, "dispatcher")
    const query = z.object({ serviceDate: z.string() }).safeParse(request.query)
    if (!query.success) throw badRequest("A serviceDate is required.")
    const trips = await Trip.find({ serviceDate: query.data.serviceDate, status: { $in: ["published", "load_confirmed", "claimed", "in_transit", "completed"] } }).sort({ departureAt: 1 }).lean()
    const latest = await Promise.all(trips.map((trip) => TripLocation.findOne({ tripId: trip._id }).sort({ recordedAt: -1 }).lean()))
    return ok(request, trips.map((trip, index) => {
      const loc = latest[index]
      const location = loc ? { ...loc, latitude: loc.location.coordinates[1], longitude: loc.location.coordinates[0], location: undefined } : null
      const ageSeconds = location ? Math.floor((Date.now() - location.recordedAt.getTime()) / 1000) : null
      return { ...trip, lastLocation: location, trackingState: trackingState(trip.status, ageSeconds), lastSeenSecondsAgo: ageSeconds }
    }))
  })

  /** The caller must belong to the trip they raise a remark on: its driver, its claiming loader, or a store manager with a stop on it. */
  async function remarkTarget(auth: { userId: string; role: string }, entityType: string, id: string, stopId?: string) {
    let tripId = id
    let tripStopId = stopId
    if (entityType === "delivery") {
      if (!/^[0-9a-f]{24}$/i.test(id)) throw badRequest("The delivery is invalid.")
      const delivery = await DeliveryRecord.findById(id).select("tripId tripStopId").lean()
      if (!delivery) throw notFound("The delivery was not found.")
      tripId = String(delivery.tripId); tripStopId = String(delivery.tripStopId)
    } else if (entityType !== "trip") throw badRequest("Remarks can be raised on a trip or a delivery.")
    if (!/^[0-9a-f]{24}$/i.test(tripId)) throw badRequest("The trip is invalid.")
    const trip = await Trip.findById(tripId).select("driverId claimedByDriverId stops").lean()
    if (!trip) throw notFound("The trip was not found.")
    if (tripStopId) {
      // Accept either the stop's tripStopId, the readable stopId, or the outlet id the driver app uses.
      const stop = trip.stops.find((candidate) => String(candidate.tripStopId) === tripStopId || candidate.stopId === tripStopId || candidate.outletId === tripStopId)
      if (!stop) throw badRequest("The stop does not belong to this trip.")
      tripStopId = String(stop.tripStopId)
    }
    if (auth.role === "driver" && ![trip.driverId, trip.claimedByDriverId].some((driver) => driver && String(driver) === auth.userId)) throw notFound()
    if (auth.role === "loader" && !(await LoadRecord.exists({ tripId: trip._id, claimedBy: auth.userId }))) throw notFound()
    if (auth.role === "store_manager") {
      const outletId = await storeOutlet(auth.userId)
      const mine = trip.stops.filter((stop) => stop.outletId === outletId)
      if (!mine.length || (tripStopId && !mine.some((stop) => String(stop.tripStopId) === tripStopId))) throw notFound()
    }
    return { tripId, tripStopId }
  }

  app.post("/remarks", { preHandler: app.authenticate }, async (request, reply) => {
    const auth = requireRole(request, "dispatcher", "loader", "driver", "store_manager")
    const body = z.object({ entityType: z.string().min(1), id: z.string().min(1), stopId: z.string().optional(), text: z.string().min(1).max(2000), audienceRoles: z.array(z.enum(["dispatcher", "loader", "driver", "store_manager"])).default(["dispatcher"]) }).safeParse(request.body)
    if (!body.success) throw badRequest("The remark is invalid.")
    const target = await remarkTarget(auth, body.data.entityType, body.data.id, body.data.stopId)
    const remark = await RemarkCommandPort.createRemark({
      text: body.data.text,
      entityType: "trip",
      entityId: target.tripId,
      tripId: target.tripId,
      ...(target.tripStopId ? { stopId: target.tripStopId } : {}),
      actorId: auth.userId,
      actorRole: auth.role,
      audienceRoles: body.data.audienceRoles,
      requestId: request.id,
    })
    return reply.status(201).send(ok(request, remark.toObject()))
  })

  app.get("/remarks", { preHandler: app.authenticate }, async (request) => {
    requireRole(request, "dispatcher")
    const query = z.object({ tripId: z.string().regex(/^[0-9a-f]{24}$/i) }).safeParse(request.query)
    if (!query.success) throw badRequest("A tripId is required.")
    return ok(request, await RemarkReadPort.findByTrip(query.data.tripId))
  })

  app.patch("/remarks/:remarkId/review", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "dispatcher")
    const params = z.object({ remarkId: z.string() }).safeParse(request.params)
    const body = z.object({
      response: z.string().min(1).max(2000),
      notifyRoles: z.array(z.string()).default([]),
      notice: z.object({ text: z.string().min(1).max(2000), recipientIds: z.array(z.string().regex(/^[0-9a-f]{24}$/i)).min(1).max(20) }).optional(),
    }).safeParse(request.body)
    if (!params.success || !body.success) throw badRequest("The review is invalid.")
    if (body.data.notice) {
      const found = await UserReadPort.findContactsByIds(body.data.notice.recipientIds)
      if (found.length !== new Set(body.data.notice.recipientIds).size) throw badRequest("A notice recipient does not exist.")
    }
    const remark = await RemarkCommandPort.reviewRemark({ remarkId: params.data.remarkId, reviewedBy: auth.userId, response: body.data.response, notifyRoles: body.data.notifyRoles, ...(body.data.notice ? { notice: body.data.notice } : {}) })
    if (!remark) throw notFound()
    return ok(request, remark.toObject())
  })

  /** Notices a dispatcher sent to the caller when reviewing a remark: the inbox of the driver, loader or store manager. */
  app.get("/notices", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "dispatcher", "loader", "driver", "store_manager")
    const rows = await RemarkReadPort.findNoticesFor(auth.userId)
    return ok(request, rows.map((remark) => ({ id: String(remark._id), tripId: remark.tripId ? String(remark.tripId) : null, stopId: remark.stopId ? String(remark.stopId) : null, remarkText: remark.text, text: remark.notice!.text, sentAt: remark.notice!.sentAt })))
  })

  app.get("/trips/:tripId/monitor", { preHandler: app.authenticate }, async (request) => {
    requireRole(request, "dispatcher")
    const params = z.object({ tripId: z.string().regex(/^[0-9a-f]{24}$/i) }).safeParse(request.params)
    if (!params.success) throw notFound()
    return ok(request, await buildTripMonitor(params.data.tripId))
  })

  app.post("/trips/:tripId/accept", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "dispatcher")
    const params = z.object({ tripId: z.string().regex(/^[0-9a-f]{24}$/i) }).safeParse(request.params)
    if (!params.success) throw notFound()
    const trip = await Trip.findById(params.data.tripId).select("status acceptedAt").lean()
    if (!trip) throw notFound()
    if (trip.acceptedAt) return ok(request, { tripId: params.data.tripId, acceptedAt: trip.acceptedAt })
    if (trip.status === "draft" || trip.status === "cancelled") throw conflict("TRIP_NOT_ACCEPTABLE", "A draft or cancelled route cannot be accepted.")
    const pending = await RemarkReadPort.countPendingByTrip(params.data.tripId)
    if (pending) throw conflict("REMARKS_PENDING", "Every remark on this route must be reviewed before it can be accepted.", { pending })
    const acceptedAt = new Date()
    await Trip.updateOne({ _id: params.data.tripId, acceptedAt: { $exists: false } }, { $set: { acceptedAt, acceptedBy: auth.userId } })
    await audit(request, "trip.route_accepted", "trip", params.data.tripId, {})
    return ok(request, { tripId: params.data.tripId, acceptedAt })
  })

  app.get("/audit/orders", { preHandler: app.authenticate }, async (request) => {
    requireRole(request, "dispatcher")
    const query = paginationSchema.safeParse(request.query); if (!query.success) throw badRequest("Invalid pagination.")
    const { skip, limit } = pagination(query.data.page, query.data.pageSize)
    const filter = { entityType: "order" }
    const [rows, total] = await Promise.all([OperationalEvent.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(), OperationalEvent.countDocuments(filter)])
    return page(request, rows, query.data.page, query.data.pageSize, total)
  })

  app.get("/audit/orders.csv", { preHandler: app.authenticate }, async (request, reply) => {
    requireRole(request, "dispatcher")
    const rows = await OperationalEvent.find({ entityType: "order" }).sort({ createdAt: -1 }).limit(10_000).lean()
    const cell = (value: unknown) => {
      let text = value == null ? "" : String(value)
      if (/^[=+\-@]/.test(text)) text = `'${text}`
      return `"${text.replaceAll('"', '""')}"`
    }
    const csv = ["eventType,entityId,actorRole,createdAt,requestId", ...rows.map((row) => [row.eventType, row.entityId, row.actorRole, row.createdAt.toISOString(), row.requestId].map(cell).join(","))].join("\r\n")
    return reply.header("content-type", "text/csv; charset=utf-8").header("content-disposition", "attachment; filename=waylink-order-audit.csv").send(csv)
  })

  app.get("/audit/deliveries", { preHandler: app.authenticate }, async (request) => {
    requireRole(request, "dispatcher")
    const query = paginationSchema.safeParse(request.query); if (!query.success) throw badRequest("Invalid pagination.")
    const { skip, limit } = pagination(query.data.page, query.data.pageSize)
    const [rows, total] = await Promise.all([DeliveryRecord.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(), DeliveryRecord.countDocuments()])
    return page(request, rows, query.data.page, query.data.pageSize, total)
  })
}
