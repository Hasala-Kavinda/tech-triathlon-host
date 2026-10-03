import mongoose from "mongoose"
import type { FastifyInstance, FastifyRequest } from "fastify"
import { z } from "zod"
import { requireRole } from "../../common/auth.js"
import { audit } from "../../common/audit.js"
import { badRequest, conflict, notFound, unprocessable } from "../../common/errors.js"
import { ok } from "../../common/response.js"
import { expectedVersion } from "../../common/version.js"
import { Trip } from "../../database/models/index.js"
import { LoadRecord } from "./persistence/load-record.model.js"
import { DeliveryCommandPort } from "../delivery/delivery.command-port.js"
import { UserReadPort } from "../auth/user.read-port.js"

async function loaderScope(request: FastifyRequest) {
  const auth = requireRole(request, "loader")
  const user = await UserReadPort.findById(auth.userId)
  if (!user?.depot) throw conflict("LOADER_DEPOT_REQUIRED", "The Loader is not assigned to a depot.")
  return { auth, depot: user.depot }
}

function versionBody(request: FastifyRequest) {
  const parsed = z.object({ expectedVersion: z.number().int().optional() }).safeParse(request.body ?? {})
  if (!parsed.success) throw badRequest("The request version is invalid.")
  return expectedVersion(request, parsed.data.expectedVersion)
}

export async function loadingRoutes(app: FastifyInstance) {
  app.get("/load-jobs", { preHandler: app.authenticate }, async (request) => {
    const { depot } = await loaderScope(request)
    const query = z.object({ status: z.string().optional(), serviceDate: z.string().optional() }).safeParse(request.query)
    if (!query.success) throw badRequest("Invalid load-job filters.")
    const filter: Record<string, unknown> = { depot }
    if (query.data.status) filter.status = query.data.status
    let rows = await LoadRecord.find(filter).sort({ createdAt: 1 }).lean()
    if (query.data.serviceDate) {
      const trips = await Trip.find({ _id: { $in: rows.map((row) => row.tripId) }, serviceDate: query.data.serviceDate }).select("_id").lean()
      const ids = new Set(trips.map((trip) => String(trip._id)))
      rows = rows.filter((row) => ids.has(String(row.tripId)))
    }
    const trips = await Trip.find({ _id: { $in: rows.map((row) => row.tripId) } }).lean()
    const tripMap = new Map(trips.map((trip) => [String(trip._id), trip]))
    return ok(request, rows.map((row) => ({ ...row, trip: tripMap.get(String(row.tripId)) })))
  })

  app.post("/load-jobs/:tripId/claim", { preHandler: app.authenticate }, async (request) => {
    const { auth, depot } = await loaderScope(request)
    const params = z.object({ tripId: z.string() }).safeParse(request.params)
    if (!params.success) throw badRequest("A trip ID is required.")
    const version = versionBody(request)
    const record = await LoadRecord.findOneAndUpdate(
      { tripId: params.data.tripId, depot, status: "available", version },
      { $set: { status: "claimed", claimedBy: auth.userId, claimedAt: new Date() }, $inc: { version: 1 } },
      { new: true },
    )
    if (!record) throw conflict("LOAD_ALREADY_CLAIMED", "This load was already claimed or changed. Refresh available work.")
    await audit(request, "load.claimed", "load_record", record.id, { tripId: params.data.tripId })
    return ok(request, record.toObject())
  })

  app.post("/load-jobs/:tripId/unclaim", { preHandler: app.authenticate }, async (request) => {
    const { auth, depot } = await loaderScope(request)
    const params = z.object({ tripId: z.string() }).safeParse(request.params)
    const body = z.object({ reason: z.string().min(1).max(500), expectedVersion: z.number().int().optional() }).safeParse(request.body)
    if (!params.success || !body.success) throw badRequest("A reason and current version are required.")
    const version = expectedVersion(request, body.data.expectedVersion)
    const record = await LoadRecord.findOneAndUpdate(
      { tripId: params.data.tripId, depot, status: "claimed", claimedBy: auth.userId, version, loadingStartedAt: { $exists: false } },
      { $set: { status: "available" }, $unset: { claimedBy: 1, claimedAt: 1 }, $inc: { version: 1 } },
      { new: true },
    )
    if (!record) throw conflict("LOAD_CANNOT_BE_RELEASED", "Only the claiming Loader can release this load before loading begins.")
    await audit(request, "load.unclaimed", "load_record", record.id, { reason: body.data.reason })
    return ok(request, record.toObject())
  })

  app.get("/load-jobs/:tripId", { preHandler: app.authenticate }, async (request) => {
    const { auth, depot } = await loaderScope(request)
    const params = z.object({ tripId: z.string() }).safeParse(request.params)
    if (!params.success) throw badRequest("A trip ID is required.")
    const record = await LoadRecord.findOne({ tripId: params.data.tripId, depot, $or: [{ status: "available" }, { claimedBy: auth.userId }] }).lean()
    if (!record) throw notFound()
    const trip = await Trip.findById(record.tripId).lean()
    return ok(request, { ...record, trip })
  })

  app.post("/load-jobs/:tripId/start-loading", { preHandler: app.authenticate }, async (request) => {
    const { auth, depot } = await loaderScope(request)
    const params = z.object({ tripId: z.string() }).safeParse(request.params)
    if (!params.success) throw badRequest("A trip ID is required.")
    const version = versionBody(request)
    const record = await LoadRecord.findOneAndUpdate(
      { tripId: params.data.tripId, depot, status: "claimed", claimedBy: auth.userId, version },
      { $set: { status: "loading", loadingStartedAt: new Date() }, $inc: { version: 1 } },
      { new: true },
    )
    if (!record) throw conflict("LOAD_START_CONFLICT", "The load is no longer in a startable state.")
    await audit(request, "load.started", "load_record", record.id)
    return ok(request, record.toObject())
  })

  app.patch("/load-jobs/:tripId/items/:itemId", { preHandler: app.authenticate }, async (request) => {
    const { auth, depot } = await loaderScope(request)
    const params = z.object({ tripId: z.string(), itemId: z.string() }).safeParse(request.params)
    const body = z.object({ status: z.enum(["pending", "loaded"]), loadedQuantity: z.number().int().min(0), expectedVersion: z.number().int().optional() }).safeParse(request.body)
    if (!params.success || !body.success) throw badRequest("The load item update is invalid.")
    const version = expectedVersion(request, body.data.expectedVersion)
    const record = await LoadRecord.findOne({ tripId: params.data.tripId, depot, status: "loading", claimedBy: auth.userId, version })
    if (!record) throw conflict("LOAD_ITEM_CONFLICT", "The load record changed or is not editable.")
    const item = record.items.find((candidate) => candidate.itemId === params.data.itemId)
    if (!item) throw notFound("The load item was not found.")
    item.status = body.data.status
    item.loadedQuantity = body.data.loadedQuantity
    if (body.data.status === "loaded" && body.data.loadedQuantity < item.expectedQuantity) throw unprocessable("INCOMPLETE_LOADED_ITEM", "A loaded item must account for at least the full expected quantity.")
    await record.save()
    return ok(request, record.toObject())
  })

  app.put("/load-jobs/:tripId/items/:itemId/exception", { preHandler: app.authenticate }, async (request) => {
    const { auth, depot } = await loaderScope(request)
    const params = z.object({ tripId: z.string(), itemId: z.string() }).safeParse(request.params)
    const body = z.object({ type: z.enum(["missing", "damaged"]), quantity: z.number().int().min(1), reasonCode: z.string().min(1), note: z.string().max(1000).optional(), expectedVersion: z.number().int().optional() }).safeParse(request.body)
    if (!params.success || !body.success) throw badRequest("The item exception is invalid.")
    const version = expectedVersion(request, body.data.expectedVersion)
    const record = await LoadRecord.findOne({ tripId: params.data.tripId, depot, status: "loading", claimedBy: auth.userId, version })
    if (!record) throw conflict("LOAD_ITEM_CONFLICT", "The load record changed or is not editable.")
    const item = record.items.find((candidate) => candidate.itemId === params.data.itemId)
    if (!item) throw notFound("The load item was not found.")
    if (body.data.quantity > item.expectedQuantity) throw unprocessable("QUANTITY_EXCEEDS_EXPECTED", "Exception quantity cannot exceed expected quantity.")
    item.status = body.data.type
    item.loadedQuantity = item.expectedQuantity - body.data.quantity
    item.exception = { type: body.data.type, quantity: body.data.quantity, reasonCode: body.data.reasonCode, ...(body.data.note ? { note: body.data.note } : {}) }
    await record.save()
    await audit(request, "load.exception_recorded", "load_record", record.id, { itemId: item.itemId, type: body.data.type, quantity: body.data.quantity })
    return ok(request, record.toObject())
  })

  app.post("/load-jobs/:tripId/reconcile", { preHandler: app.authenticate }, async (request) => {
    const { auth, depot } = await loaderScope(request)
    const params = z.object({ tripId: z.string() }).safeParse(request.params)
    if (!params.success) throw badRequest("A trip ID is required.")
    const version = versionBody(request)
    const record = await LoadRecord.findOne({ tripId: params.data.tripId, depot, status: "loading", claimedBy: auth.userId, version })
    if (!record) throw conflict("LOAD_RECONCILE_CONFLICT", "The load record changed or is not reconcilable.")
    const unresolved = record.items.filter((item) => item.status === "pending" || item.loadedQuantity + Number(item.exception?.quantity ?? 0) !== item.expectedQuantity)
    if (unresolved.length) throw unprocessable("LOAD_NOT_ACCOUNTED", "Every expected quantity must be loaded or explained by an exception.", { itemIds: unresolved.map((item) => item.itemId) })
    record.status = "reconciled"
    await record.save()
    return ok(request, { record: record.toObject(), totals: { items: record.items.length, loaded: record.items.filter((item) => item.status === "loaded").length, exceptions: record.items.filter((item) => item.exception).length } })
  })

  app.post("/load-jobs/:tripId/confirm", { preHandler: app.authenticate }, async (request) => {
    const { auth, depot } = await loaderScope(request)
    const params = z.object({ tripId: z.string() }).safeParse(request.params)
    if (!params.success) throw badRequest("A trip ID is required.")
    const version = versionBody(request)
    const session = await mongoose.startSession()
    let confirmed: InstanceType<typeof LoadRecord> | null = null
    try {
      await session.withTransaction(async () => {
        const record = await LoadRecord.findOne({ tripId: params.data.tripId, depot, status: "reconciled", claimedBy: auth.userId, version }).session(session)
        if (!record) throw conflict("LOAD_CONFIRM_CONFLICT", "The load changed or is not ready for confirmation.")
        const trip = await Trip.findOne({ _id: record.tripId, status: "published" }).session(session)
        if (!trip) throw conflict("TRIP_STATE_CONFLICT", "The trip is no longer awaiting load confirmation.")
        
        const updateItems = record.items.map(item => ({
          tripStopId: item.tripStopId as mongoose.Types.ObjectId,
          sku: item.sku,
          loadedQuantity: item.loadedQuantity
        }))
        await DeliveryCommandPort.updateExpectedQuantitiesForLoadConfirmation(trip._id as mongoose.Types.ObjectId, updateItems, session)
        
        record.status = "confirmed"; record.confirmedAt = new Date(); await record.save({ session })
        trip.status = "load_confirmed"; trip.statusHistory.push({ status: "load_confirmed", at: new Date(), actorId: new mongoose.Types.ObjectId(auth.userId) }); await trip.save({ session })
        confirmed = record
      })
    } finally { await session.endSession() }
    await audit(request, "load.confirmed", "load_record", confirmed!.id, { tripId: params.data.tripId })
    return ok(request, confirmed!.toObject())
  })
}
