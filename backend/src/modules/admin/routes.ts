import argon2 from "argon2"
import type { FastifyInstance, FastifyRequest } from "fastify"
import { z } from "zod"
import { badRequest, forbidden, notFound, unauthorized } from "../../common/errors.js"
import { ok } from "../../common/response.js"
import { User } from "../auth/persistence/user.model.js"
import { Outlet } from "../reference/persistence/outlet.model.js"

function publicUser(user: any) {
  return {
    id: user._id ? String(user._id) : user.id,
    employeeId: user.employeeId,
    email: user.email,
    name: user.name,
    role: user.role,
    outletId: user.outletId,
    depot: user.depot,
    active: user.active,
    mustChangePassword: user.mustChangePassword,
    failedLoginCount: user.failedLoginCount,
    lockedAt: user.lockedAt,
    lockExpiresAt: user.lockExpiresAt,
    lastLoginAt: user.lastLoginAt,
    createdBy: user.createdBy,
    deactivatedAt: user.deactivatedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function isPasswordChangeRequiredUrl(request: FastifyRequest) {
  const pathname = new URL(request.raw.url ?? "/", "http://localhost").pathname
  return pathname.endsWith("/auth/me") || pathname.endsWith("/auth/change-password")
}

const createUserBody = z.object({
  name: z.string().trim().min(1),
  email: z.string().email(),
  employeeId: z.string().trim().min(1),
  role: z.enum(["admin", "dispatcher", "loader", "driver", "store_manager"]),
  outletId: z.string().trim().optional(),
  depot: z.string().trim().optional(),
  active: z.boolean().default(true),
})

export async function adminRoutes(app: FastifyInstance) {
  app.addHook("preHandler", async (request) => {
    if (!request.auth) throw unauthorized()
    if (request.auth.role !== "admin") throw forbidden("Admin access is required.")
    const user = await User.findById(request.auth.userId)
    if (user && user.mustChangePassword && !isPasswordChangeRequiredUrl(request)) {
      throw forbidden("PASSWORD_CHANGE_REQUIRED")
    }
  })

  app.get("/admin/summary", async (request) => {
    const summary = await User.aggregate([
      { $group: { _id: "$role", total: { $sum: 1 } } },
      { $group: { _id: null, byRole: { $push: { role: "$_id", total: "$total" } }, totalUsers: { $sum: "$total" } } },
    ])
    const roleCounts: Record<string, number> = {}
    for (const row of summary[0]?.byRole ?? []) {
      roleCounts[row.role] = row.total
    }
    const counts = await User.countDocuments({ active: true })
    const locked = await User.countDocuments({ $or: [{ lockExpiresAt: { $gt: new Date() } }, { lockedAt: { $exists: true } }] })
    return ok(request, {
      totals: {
        users: summary[0]?.totalUsers ?? 0,
        active: counts,
        locked,
        byRole: roleCounts,
      },
    })
  })

  app.get("/admin/users", async (request) => {
    const query = request.query as Record<string, string | undefined>
    const pageLimit = Math.min(Math.max(Number(query.limit ?? "25"), 1), 100)
    const cursor = query.after ? String(query.after) : undefined
    const filter: any = {}
    if (query.role) filter.role = query.role
    if (query.outletId) filter.outletId = query.outletId
    if (query.depot) filter.depot = query.depot
    if (query.active !== undefined) filter.active = query.active === "true"
    if (query.locked !== undefined) {
      filter.$or = [{ lockExpiresAt: { $gt: new Date() } }, { lockedAt: { $exists: true } }]
      if (query.locked === "false") filter.$nor = [{ lockExpiresAt: { $gt: new Date() } }, { lockedAt: { $exists: true } }]
    }

    const search = query.search?.trim()
    if (search) {
      filter.$or = [
        { employeeId: { $regex: escapeRegex(search), $options: "i" } },
        { email: { $regex: escapeRegex(search), $options: "i" } },
        { name: { $regex: escapeRegex(search), $options: "i" } },
      ]
    }

    if (cursor) filter._id = { $lt: cursor }

    const items = await User.find(filter).sort({ createdAt: -1, _id: -1 }).limit(pageLimit + 1).lean()
    const hasMore = items.length > pageLimit
    const nextItems = hasMore ? items.slice(0, pageLimit) : items
    const lastItem = nextItems.at(-1)
    const nextCursor = hasMore && lastItem ? String(lastItem._id) : undefined

    return ok(request, {
      items: nextItems.map(publicUser),
      nextCursor,
      limit: pageLimit,
      hasMore,
    })
  })

  app.get("/admin/users/:id", async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = await User.findById(id).lean()
    if (!user) throw notFound("User not found.")
    return ok(request, publicUser(user))
  })

  app.get("/admin/lookups/outlets", async (request) => {
    const outlets = await Outlet.find({ active: true }).select("outletId displayName depot brand").sort({ outletId: 1 }).lean()
    return ok(request, outlets.map((outlet) => ({
      outletId: outlet.outletId,
      displayName: outlet.displayName,
      depot: outlet.depot,
      brand: outlet.brand,
    })))
  })

  app.get("/admin/lookups/depots", async (request) => {
    const outletDepots = await Outlet.distinct("depot", { active: true })
    const userDepots = await User.distinct("depot", { depot: { $exists: true, $ne: "" } })
    const allDepots = Array.from(new Set([...outletDepots, ...userDepots])).sort()
    return ok(request, allDepots)
  })

  app.post("/admin/users", async (request, reply) => {
    const parsed = createUserBody.safeParse(request.body)
    if (!parsed.success) throw badRequest("User creation requires a valid employeeId, name, email, and role.", parsed.error.flatten())

    const body = parsed.data
    const userExists = await User.exists({ $or: [{ employeeId: body.employeeId.trim().toUpperCase() }, { email: body.email.trim().toLowerCase() }] })
    if (userExists) throw badRequest("A user with that employee ID or email already exists.")

    if (body.role === "store_manager" && !body.outletId) throw badRequest("Store managers require an outletId.")
    if (body.role === "driver" && !body.depot) throw badRequest("Drivers require a depot.")

    const randomPassword = `${Math.random().toString(36).slice(2, 12)}Aa!${Math.random().toString(36).slice(2, 8)}`
    const user = await User.create({
      employeeId: body.employeeId,
      email: body.email,
      name: body.name,
      role: body.role,
      outletId: body.outletId,
      depot: body.depot,
      passwordHash: await argon2.hash(randomPassword),
      active: body.active,
      mustChangePassword: true,
      failedLoginCount: 0,
      createdBy: request.auth!.userId,
    })

    return reply.code(201).send(ok(request, {
      user: publicUser(user.toObject()),
      temporaryPassword: randomPassword,
      mustChangePassword: true,
    }))
  })
}
