import mongoose from "mongoose"
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { requireRole } from "../../common/auth.js"
import { audit } from "../../common/audit.js"
import { clock } from "../../common/clock.js"
import { badRequest, forbidden, notFound, unprocessable } from "../../common/errors.js"
import { findIdempotentResult, saveIdempotentResult } from "../../common/idempotency.js"
import { pagination, paginationSchema } from "../../common/pagination.js"
import { ok, page } from "../../common/response.js"
import { parseServiceDate, submissionContext } from "../../common/time.js"
import { Order } from "./persistence/order.model.js"
import { DeliveryRecord, Trip } from "../../database/models/index.js"
import { deriveOrderLifecycle } from "./order-lifecycle.js"
import { UserReadPort } from "../auth/user.read-port.js"
import { OutletReadPort } from "../reference/outlet.read-port.js"
import { ProductReadPort } from "../reference/product.read-port.js"
import { CalendarDayReadPort } from "../reference/calendar-day.read-port.js"
import { CounterCommandPort } from "../../database/persistence/counter.command-port.js"

const createBody = z.object({
  orderType: z.string().min(1).max(40),
  // Optional: the server works out the earliest delivery day from its own clock. A client may ask
  // for a later day, never an earlier one.
  requestedDate: z.string().optional(),
  items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().min(1).max(100_000) })).min(1).max(200),
})

async function managerContext(userId: string) {
  const user = await UserReadPort.findById(userId)
  if (!user?.outletId) throw forbidden("The Store Manager is not assigned to an outlet.")
  const outlet = await OutletReadPort.findByOutletId(user.outletId)
  if (!outlet) throw forbidden("The assigned outlet is unavailable.")
  return { user, outlet }
}

export async function orderRoutes(app: FastifyInstance) {
  app.post("/orders", { preHandler: app.authenticate }, async (request, reply) => {
    const auth = requireRole(request, "store_manager")
    const parsed = createBody.safeParse(request.body)
    if (!parsed.success) throw badRequest("The order request is invalid.", parsed.error.flatten())
    const idem = await findIdempotentResult(request, "orders.create", parsed.data)
    if (idem.existing) return reply.status(idem.existing.statusCode).send(idem.existing.response)

    // Both the cutoff bucket and the earliest delivery day come from the server's clock
    // (Asia/Colombo): before 16:00 today the order joins the next operating day's planning run,
    // at or after 16:00 it joins the operating day after that.
    const submission = submissionContext()
    let requestedDate: string
    if (app.config.devMode) {
      // Development phase: deliver today unless a date is given, and skip the earliest-day check,
      // so the whole scheduling flow can be tried at any time of day. The cutoff bucket above is
      // still the real one. Production (DEV_MODE=false) uses the rules below.
      requestedDate = parsed.data.requestedDate ?? submission.submissionDay
      parseServiceDate(requestedDate)
    } else {
      const firstOperatingDay = await CalendarDayReadPort.findNextOperatingDay(submission.submissionDay)
      const earliestDay = submission.cutoffBucket === "before_cutoff"
        ? firstOperatingDay
        : firstOperatingDay ? await CalendarDayReadPort.findNextOperatingDay(firstOperatingDay.date) : null
      if (!earliestDay) throw unprocessable("NO_OPERATING_DAY", "There is no upcoming operating day in the calendar to deliver this order.")
      requestedDate = parsed.data.requestedDate ?? earliestDay.date
      parseServiceDate(requestedDate)
      if (requestedDate < earliestDay.date) {
        throw unprocessable("REQUESTED_DATE_TOO_EARLY", `Orders placed now can be delivered from ${earliestDay.date} at the earliest.`, { earliestDate: earliestDay.date, cutoffBucket: submission.cutoffBucket })
      }
    }
    const [{ outlet }, calendar, products] = await Promise.all([
      managerContext(auth.userId),
      CalendarDayReadPort.findByDate(requestedDate),
      ProductReadPort.findActiveByIds(parsed.data.items.map((item) => item.productId)),
    ])
    if (!app.config.devMode && !calendar?.isOperating) throw unprocessable("NON_OPERATING_DAY", "Orders cannot be requested for a non-operating day.")
    if (products.length !== new Set(parsed.data.items.map((item) => item.productId)).size) throw unprocessable("UNKNOWN_PRODUCT", "One or more products are unavailable.")
    const productMap = new Map(products.map((product) => [String(product._id), product]))
    const items = parsed.data.items.map(({ productId, quantity }) => {
      const product = productMap.get(productId)!
      if (product.brand.toLowerCase() !== outlet.brand.toLowerCase() || !product.orderTypes.includes(parsed.data.orderType)) {
        throw unprocessable("PRODUCT_NOT_ALLOWED", `${product.sku} is not available for this outlet and order type.`)
      }
      return {
        productId: product._id,
        sku: product.sku,
        name: product.name,
        unit: product.unit,
        quantity,
        unitWeightKg: product.weightKg,
        unitVolumeM3: product.volumeM3,
        temperatureClass: product.temperatureClass,
        fragile: product.fragile,
      }
    })
    const now = clock.now()
    let order!: InstanceType<typeof Order>
    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        const seq = await CounterCommandPort.getNextSequence("order", session)
        const dateTag = now.toISOString().slice(2, 10).replaceAll("-", "")
        order = (await Order.create(
          [{
            orderNumber: `ORD-${dateTag}-${String(seq).padStart(6, "0")}`,
            outletId: outlet.outletId,
            storeManagerId: auth.userId,
            brand: outlet.brand,
            orderType: parsed.data.orderType,
            requestedDate,
            cutoffBucket: submission.cutoffBucket,
            items,
            totalWeightKg: items.reduce((total, item) => total + item.unitWeightKg * item.quantity, 0),
            totalVolumeM3: items.reduce((total, item) => total + item.unitVolumeM3 * item.quantity, 0),
            statusHistory: [{ status: "submitted", at: now, actorId: auth.userId }],
          }],
          { session },
        ))[0]!
      })
    } finally { await session.endSession() }
    await audit(request, "order.submitted", "order", order!.id, { orderNumber: order!.orderNumber, outletId: outlet.outletId, cutoffBucket: submission.cutoffBucket, requestedDate })
    const response = ok(request, order!.toObject())
    await saveIdempotentResult({ key: idem.key, requestHash: idem.requestHash, operation: "orders.create", userId: auth.userId, statusCode: 201, response })
    return reply.status(201).send(response)
  })

  app.get("/orders", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "store_manager")
    const { outlet } = await managerContext(auth.userId)
    const query = z.object({ status: z.string().optional(), from: z.string().optional(), to: z.string().optional() }).merge(paginationSchema).safeParse(request.query)
    if (!query.success) throw badRequest("Invalid order filters.")
    const filter: Record<string, unknown> = { outletId: outlet.outletId }
    if (query.data.status) filter.status = query.data.status
    if (query.data.from || query.data.to) filter.requestedDate = { ...(query.data.from ? { $gte: query.data.from } : {}), ...(query.data.to ? { $lte: query.data.to } : {}) }
    const { skip, limit } = pagination(query.data.page, query.data.pageSize)
    const [rows, total] = await Promise.all([Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(), Order.countDocuments(filter)])
    return page(request, rows, query.data.page, query.data.pageSize, total)
  })

  app.get("/store/order-history", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "store_manager")
    const { outlet } = await managerContext(auth.userId)
    const query = paginationSchema.safeParse(request.query)
    if (!query.success) throw badRequest("Invalid history pagination.")
    const { skip, limit } = pagination(query.data.page, query.data.pageSize)
    const [rows, total] = await Promise.all([Order.find({ outletId: outlet.outletId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(), Order.countDocuments({ outletId: outlet.outletId })])
    // The delivery record is where "arrived" lives; attach a read-only summary so the list can show it.
    const deliveries = await DeliveryRecord.find({ outletId: outlet.outletId, "items.orderIds": { $in: rows.map((row) => row._id) } }).select("status arrivedAt items.orderIds createdAt").sort({ createdAt: 1 }).lean()
    const byOrder = new Map<string, { _id: string; status: string; arrivedAt: Date | null }>()
    for (const delivery of deliveries) for (const item of delivery.items) for (const orderId of item.orderIds) byOrder.set(String(orderId), { _id: String(delivery._id), status: delivery.status, arrivedAt: delivery.arrivedAt ?? null })
    return page(request, rows.map((row) => ({ ...row, delivery: byOrder.get(String(row._id)) ?? null })), query.data.page, query.data.pageSize, total)
  })

  // One call that joins the order, its trip and its delivery record, and places the order on the 5-step timeline.
  app.get("/store/orders/:orderId/lifecycle", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "store_manager")
    const { outlet } = await managerContext(auth.userId)
    const params = z.object({ orderId: z.string() }).safeParse(request.params)
    if (!params.success || !mongoose.isValidObjectId(params.data.orderId)) throw notFound()
    const order = await Order.findOne({ _id: params.data.orderId, outletId: outlet.outletId }).lean()
    if (!order) throw notFound()
    const delivery = await DeliveryRecord.findOne({ outletId: outlet.outletId, "items.orderIds": order._id }).sort({ createdAt: -1 }).lean()
    const tripId = order.allocatedTripId ?? delivery?.tripId
    const trip = tripId ? await Trip.findById(tripId).lean() : null
    const lifecycle = deriveOrderLifecycle({ order, trip, delivery })
    return ok(request, {
      order: { _id: order._id, orderNumber: order.orderNumber, status: order.status, brand: order.brand, orderType: order.orderType, requestedDate: order.requestedDate, cutoffBucket: order.cutoffBucket, createdAt: order.createdAt, deferredTo: order.deferredTo ?? null, deferralReason: order.deferralReason ?? null, items: order.items },
      trip: trip && { tripNumber: trip.tripNumber, status: trip.status, vehicleId: trip.vehicleId, serviceDate: trip.serviceDate, departureAt: trip.departureAt, startedAt: trip.startedAt ?? null },
      // Never includes PIN challenge data; the PIN is only ever returned once, by the issue call.
      delivery: delivery && { _id: delivery._id, status: delivery.status, arrivedAt: delivery.arrivedAt ?? null, completedAt: delivery.completedAt ?? null, outcome: delivery.outcome ?? null, receipt: delivery.receipt ?? null, version: (delivery as { version?: number }).version ?? 0, proofStatus: delivery.proof?.status ?? "none", items: delivery.items.map((item) => ({ sku: item.sku, expected: item.expected, delivered: item.delivered ?? null })) },
      lifecycle,
    })
  })

  app.get("/orders/:orderId", { preHandler: app.authenticate }, async (request) => {
    const auth = requireRole(request, "store_manager", "dispatcher")
    const params = z.object({ orderId: z.string() }).safeParse(request.params)
    if (!params.success) throw badRequest("An order ID is required.")
    const order = await Order.findById(params.data.orderId).lean()
    if (!order) throw notFound()
    if (auth.role === "store_manager") {
      const { outlet } = await managerContext(auth.userId)
      if (order.outletId !== outlet.outletId) throw notFound()
    }
    return ok(request, order)
  })
}
