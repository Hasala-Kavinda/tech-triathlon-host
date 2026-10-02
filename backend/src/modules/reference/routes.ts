import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { requireRole } from "../../common/auth.js"
import { badRequest, notFound } from "../../common/errors.js"
import { pagination, paginationSchema } from "../../common/pagination.js"
import { ok, page } from "../../common/response.js"
import { cutoffContext, parseServiceDate } from "../../common/time.js"
import { CalendarDay } from "../../database/models/index.js"
import { Outlet } from "./persistence/outlet.model.js"
import { Product } from "./persistence/product.model.js"
import { VehicleReadPort } from "./vehicle.read-port.js"
import { UserReadPort } from "../auth/user.read-port.js"

const clean = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

export async function referenceRoutes(app: FastifyInstance) {
  app.get("/reference/outlets", { preHandler: app.authenticate }, async (request) => {
    requireRole(request, "dispatcher")
    const query = z.object({ brand: z.string().optional(), depot: z.string().optional(), district: z.string().optional(), search: z.string().max(100).optional() }).merge(paginationSchema).safeParse(request.query)
    if (!query.success) throw badRequest("Invalid outlet filters.", query.error.flatten())
    const filter: Record<string, unknown> = { active: true }
    if (query.data.brand) filter.brand = query.data.brand
    if (query.data.depot) filter.depot = query.data.depot
    if (query.data.district) filter.district = query.data.district
    if (query.data.search) filter.$or = [{ outletId: { $regex: clean(query.data.search), $options: "i" } }, { displayName: { $regex: clean(query.data.search), $options: "i" } }]
    const { skip, limit } = pagination(query.data.page, query.data.pageSize)
    const [rows, total] = await Promise.all([Outlet.find(filter).sort({ outletId: 1 }).skip(skip).limit(limit).lean(), Outlet.countDocuments(filter)])
    return page(request, rows, query.data.page, query.data.pageSize, total)
  })

  app.get("/reference/vehicles", { preHandler: app.authenticate }, async (request) => {
    requireRole(request, "dispatcher")
    const query = z.object({ serviceDate: z.string(), depot: z.string().optional(), type: z.string().optional(), temp: z.string().optional() }).safeParse(request.query)
    if (!query.success) throw badRequest("serviceDate is required.")
    parseServiceDate(query.data.serviceDate)
    const rows = await VehicleReadPort.findActiveByFilter({ depot: query.data.depot, type: query.data.type, temp: query.data.temp })
    return ok(request, rows)
  })

  app.get("/reference/drivers", { preHandler: app.authenticate }, async (request) => {
    requireRole(request, "dispatcher")
    const query = z.object({ depot: z.string().optional() }).safeParse(request.query)
    if (!query.success) throw badRequest("Invalid Driver filters.")
    const filter: Record<string, unknown> = { role: "driver", active: true }
    if (query.data.depot) filter.depot = query.data.depot
    const rows = await UserReadPort.findByFilter(filter)
    return ok(request, rows)
  })

  app.get("/catalog/products", { preHandler: app.authenticate }, async (request) => {
    requireRole(request, "store_manager")
    const query = z.object({ brand: z.string().optional(), orderType: z.string().optional(), search: z.string().max(100).optional() }).merge(paginationSchema).safeParse(request.query)
    if (!query.success) throw badRequest("Invalid catalogue filters.")
    const filter: Record<string, unknown> = { active: true }
    if (query.data.brand) filter.brand = query.data.brand
    if (query.data.orderType) filter.orderTypes = query.data.orderType
    if (query.data.search) filter.$or = [{ sku: { $regex: clean(query.data.search), $options: "i" } }, { name: { $regex: clean(query.data.search), $options: "i" } }]
    const { skip, limit } = pagination(query.data.page, query.data.pageSize)
    const [rows, total] = await Promise.all([Product.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(), Product.countDocuments(filter)])
    return page(request, rows, query.data.page, query.data.pageSize, total)
  })

  app.get("/calendar/:date", { preHandler: app.authenticate }, async (request) => {
    requireRole(request, "dispatcher", "store_manager")
    const parsed = z.object({ date: z.string() }).safeParse(request.params)
    if (!parsed.success) throw badRequest("A date is required.")
    parseServiceDate(parsed.data.date)
    const day = await CalendarDay.findOne({ date: parsed.data.date }).lean()
    if (!day) throw notFound("The requested date is outside the imported operating calendar.")
    return ok(request, { ...day, ...cutoffContext(parsed.data.date) })
  })
}
