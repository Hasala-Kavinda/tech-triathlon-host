import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { requireRole } from "../../common/auth.js"
import { audit } from "../../common/audit.js"
import { badRequest, conflict, notFound } from "../../common/errors.js"
import { pagination, paginationSchema } from "../../common/pagination.js"
import { ok, page } from "../../common/response.js"
import { expectedVersion } from "../../common/version.js"
import { DeliveryRecord, OperationalEvent, Trip, TripLocation } from "../../database/models/index.js"
import { RemarkCommandPort } from "../audit/remark.command-port.js"
import { RemarkReadPort } from "../audit/remark.read-port.js"
import { OrderReadPort } from "../orders/order.read-port.js"
import { UserReadPort } from "../auth/user.read-port.js"

async function storeOutlet(userId: string) {
  const user = await UserReadPort.findById(userId)
  if (!user?.outletId) throw notFound()
  return user.outletId
}

export async function operationRoutes(app: FastifyInstance) {
  app.get("/store/dashboard", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "store_manager")
    const outletId = await storeOutlet(auth.userId)
    const [recentOrders, upcomingDeliveries, attentionCount] = await Promise.all([
      OrderReadPort.findRecentByOutlet(outletId, 5),
      DeliveryRecord.find({ outletId, status: { $ne: "completed" } }).sort({ createdAt: 1 }).limit(5).lean(),
      DeliveryRecord.countDocuments({ outletId, outcome: { $in: ["partial", "failed"] } }),
    ])
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
    const filter: Record<string, unknown> = { outletId, status: "completed" }
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
    const record = await DeliveryRecord.findOneAndUpdate({ _id: params.data.deliveryId, outletId, status: "completed", version, receipt: { $exists: false } }, { $set: { receipt: { ...body.data, confirmedAt: new Date(), confirmedBy: auth.userId } }, $inc: { version: 1 } }, { new: true })
    if (!record) throw conflict("RECEIPT_CONFLICT", "The delivery is not receivable, changed, or already has a receipt.")
    await audit(request, body.data.result === "full" ? "receipt.confirmed" : "receipt.issue_reported", "delivery", record.id, { result: body.data.result })
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
      return { ...trip, lastLocation: location, trackingState: trip.status === "completed" ? "completed" : !location ? "offline_unknown" : ageSeconds! <= 120 ? "live" : ageSeconds! <= 600 ? "delayed" : "gps_gap", lastSeenSecondsAgo: ageSeconds }
    }))
  })

  app.post("/remarks", { preHandler: app.authenticate }, async (request, reply) => {
    const auth = requireRole(request, "dispatcher", "loader", "driver", "store_manager")
    const body = z.object({ entityType: z.string().min(1), id: z.string().min(1), text: z.string().min(1).max(2000), audienceRoles: z.array(z.enum(["dispatcher", "loader", "driver", "store_manager"])) }).safeParse(request.body)
    if (!body.success) throw badRequest("The remark is invalid.")
    const remark = await RemarkCommandPort.createRemark({
      text: body.data.text,
      entityType: body.data.entityType,
      entityId: body.data.id,
      actorId: auth.userId,
      actorRole: auth.role,
      audienceRoles: body.data.audienceRoles,
      requestId: request.id,
    })
    return reply.status(201).send(ok(request, remark.toObject()))
  })

  app.patch("/remarks/:remarkId/review", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "dispatcher")
    const params = z.object({ remarkId: z.string() }).safeParse(request.params)
    const body = z.object({ response: z.string().min(1).max(2000), notifyRoles: z.array(z.string()).default([]) }).safeParse(request.body)
    if (!params.success || !body.success) throw badRequest("The review is invalid.")
    const remark = await RemarkCommandPort.reviewRemark({ remarkId: params.data.remarkId, reviewedBy: auth.userId, response: body.data.response, notifyRoles: body.data.notifyRoles })
    if (!remark) throw notFound()
    return ok(request, remark.toObject())
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
