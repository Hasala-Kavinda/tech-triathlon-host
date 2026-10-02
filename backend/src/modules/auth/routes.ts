import argon2 from "argon2"
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { randomCode, sha256 } from "../../common/crypto.js"
import { badRequest, forbidden, unauthorized } from "../../common/errors.js"
import { issueAccessToken } from "../../common/auth.js"
import { noContent, ok } from "../../common/response.js"
import { AuthHandoff } from "../../database/models/index.js"
import { User, type Role } from "./persistence/user.model.js"
import { audit } from "../../common/audit.js"

const loginBody = z.object({
  employeeId: z.string().trim().min(1).max(32).transform((value) => value.toUpperCase()),
  password: z.string().min(1).max(256),
  email: z.string().email().max(254).transform((value) => value.trim().toLowerCase()),
})

const exchangeBody = z.object({ handoffCode: z.string().min(32).max(256) })

function publicUser(user: InstanceType<typeof User>) {
  return {
    id: user.id,
    employeeId: user.employeeId,
    email: user.email,
    name: user.name,
    role: user.role,
    outletId: user.outletId,
    depot: user.depot,
  }
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/login", { config: { rateLimit: { max: 8, timeWindow: "1 minute" } } }, async (request) => {
    const parsed = loginBody.safeParse(request.body)
    if (!parsed.success) throw badRequest("Employee ID, password, and a valid email are required.", parsed.error.flatten())

    const user = await User.findOne({ employeeId: parsed.data.employeeId, active: true }).select("+passwordHash")
    const passwordValid = user ? await argon2.verify(user.passwordHash, parsed.data.password).catch(() => false) : false
    const emailValid = user?.email === parsed.data.email
    if (!user || !passwordValid || !emailValid) {
      throw unauthorized("The supplied credentials do not match an active employee record.")
    }

    const handoffCode = randomCode()
    const intendedOrigin = app.config.roleOrigins[user.role as Role]
    await AuthHandoff.create({
      codeHash: sha256(handoffCode),
      userId: user._id,
      intendedOrigin,
      expiresAt: new Date(Date.now() + 60_000),
    })
    await audit(request, "auth.login_succeeded", "user", user.id, { intendedOrigin })

    return ok(request, {
      handoffCode,
      redirectUrl: `${intendedOrigin}/auth/callback?code=${encodeURIComponent(handoffCode)}`,
      expiresIn: 60,
    })
  })

  app.post("/auth/exchange", { config: { rateLimit: { max: 15, timeWindow: "1 minute" } } }, async (request) => {
    const parsed = exchangeBody.safeParse(request.body)
    if (!parsed.success) throw badRequest("A valid handoff code is required.")
    const origin = request.headers.origin
    if (!origin || !app.config.allowedOrigins.includes(origin)) throw forbidden("The exchange origin is not allowed.")

    const handoff = await AuthHandoff.findOneAndUpdate(
      { codeHash: sha256(parsed.data.handoffCode), consumedAt: { $exists: false }, expiresAt: { $gt: new Date() }, intendedOrigin: origin },
      { $set: { consumedAt: new Date() } },
      { new: true },
    )
    if (!handoff) throw unauthorized("The handoff code is invalid, expired, already used, or intended for another application.")
    const user = await User.findOne({ _id: handoff.userId, active: true })
    if (!user) throw unauthorized("The employee account is unavailable.")
    const accessToken = await issueAccessToken(app, { id: user.id, employeeId: user.employeeId, role: user.role })
    return ok(request, { accessToken, user: publicUser(user), expiresIn: app.config.accessTokenTtl })
  })

  app.get("/auth/me", { preHandler: app.authenticate }, async (request) => {
    const user = await User.findOne({ _id: request.auth!.userId, active: true })
    if (!user) throw unauthorized()
    return ok(request, publicUser(user))
  })

  app.patch("/auth/profile/email", { preHandler: app.authenticate }, async (request) => {
    const parsed = z.object({ email: z.string().email(), currentPassword: z.string().min(1) }).safeParse(request.body)
    if (!parsed.success) throw badRequest("A valid email and current password are required.")
    const user = await User.findById(request.auth!.userId).select("+passwordHash")
    if (!user || !(await argon2.verify(user.passwordHash, parsed.data.currentPassword).catch(() => false))) throw unauthorized("The current password is incorrect.")
    user.email = parsed.data.email.trim().toLowerCase()
    await user.save()
    await audit(request, "auth.email_updated", "user", user.id)
    return ok(request, publicUser(user))
  })

  app.post("/auth/logout", { preHandler: app.authenticate }, async (request, reply) => {
    await audit(request, "auth.logout", "user", request.auth!.userId)
    return noContent(reply)
  })
}
