import { randomBytes } from "node:crypto"
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { requireRole } from "../../common/auth.js"
import { audit } from "../../common/audit.js"
import { badRequest, forbidden, notFound, unprocessable } from "../../common/errors.js"
import { findIdempotentResult, saveIdempotentResult } from "../../common/idempotency.js"
import { pagination, paginationSchema } from "../../common/pagination.js"
import { ok, page } from "../../common/response.js"
import { cutoffContext, parseServiceDate } from "../../common/time.js"
import { CalendarDay, Order } from "../../database/models/index.js"
import { UserReadPort } from "../auth/user.read-port.js"
import { OutletReadPort } from "../reference/outlet.read-port.js"
import { ProductReadPort } from "../reference/product.read-port.js"

const createBody = z.object({
  orderType: z.string().min(1).max(40),
  requestedDate: z.string(),
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

    parseServiceDate(parsed.data.requestedDate)
    const [{ outlet }, calendar, products] = await Promise.all([
      managerContext(auth.userId),
      CalendarDay.findOne({ date: parsed.data.requestedDate }).lean(),
      ProductReadPort.findActiveByIds(parsed.data.items.map((item) => item.productId)),
    ])
    if (!calendar?.isOperating) throw unprocessable("NON_OPERATING_DAY", "Orders cannot be requested for a non-operating day.")
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
    const now = new Date()
    const cutoff = cutoffContext(parsed.data.requestedDate)
    const order = await Order.create({
      orderNumber: `ORD-${now.toISOString().slice(2, 10).replaceAll("-", "")}-${randomBytes(3).toString("hex").toUpperCase()}`,
      outletId: outlet.outletId,
      storeManagerId: auth.userId,
      brand: outlet.brand,
      orderType: parsed.data.orderType,
      requestedDate: parsed.data.requestedDate,
      cutoffBucket: cutoff.cutoffBucket,
      items,
      totalWeightKg: items.reduce((total, item) => total + item.unitWeightKg * item.quantity, 0),
      totalVolumeM3: items.reduce((total, item) => total + item.unitVolumeM3 * item.quantity, 0),
      statusHistory: [{ status: "submitted", at: now, actorId: auth.userId }],
    })
    await audit(request, "order.submitted", "order", order.id, { orderNumber: order.orderNumber, outletId: outlet.outletId, cutoffBucket: cutoff.cutoffBucket })
    const response = ok(request, order.toObject())
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
    return page(request, rows, query.data.page, query.data.pageSize, total)
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
