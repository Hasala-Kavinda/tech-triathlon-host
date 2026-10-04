import argon2 from "argon2"
import type { FastifyInstance, FastifyRequest } from "fastify"
import { z } from "zod"
import { randomCode, sha256 } from "../../common/crypto.js"
import { badRequest, forbidden, unauthorized } from "../../common/errors.js"
import { issueAccessToken } from "../../common/auth.js"
import { noContent, ok } from "../../common/response.js"
import { User, type Role } from "./persistence/user.model.js"
import { AuthHandoff } from "./persistence/auth-handoff.model.js"
import { audit } from "../../common/audit.js"

const loginBody = z.object({
  employeeId: z.string().trim().max(32).optional(),
  password: z.string().min(1).max(256),
  email: z.string().email().max(254).transform((value) => value.trim().toLowerCase()).optional(),
}).refine((value) => value.employeeId || value.email, {
  message: "Employee ID or email is required.",
  path: ["employeeId"],
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
    active: user.active,
    mustChangePassword: user.mustChangePassword,
    failedLoginCount: user.failedLoginCount,
  }
}

function isPasswordChangeAllowed(request: FastifyRequest) {
  const pathname = new URL(request.raw.url ?? "/", "http://localhost").pathname
  return pathname.endsWith("/auth/me") || pathname.endsWith("/auth/change-password")
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/login", { config: { rateLimit: { max: 8, timeWindow: "1 minute" } } }, async (request) => {
    const parsed = loginBody.safeParse(request.body)
    if (!parsed.success) throw badRequest("Employee ID or email, password, and a valid email are required.", parsed.error.flatten())

    const employeeId = parsed.data.employeeId?.trim().toUpperCase() || undefined
    const email = parsed.data.email?.trim().toLowerCase()
    const user = await User.findOne(employeeId ? { employeeId, active: true } : { email, active: true }).select("+passwordHash")
    if (!user) throw unauthorized("The supplied credentials do not match an active employee record.")

    if (user.lockExpiresAt && user.lockExpiresAt.getTime() > Date.now()) {
      throw forbidden("This account is temporarily locked. Please try again later.")
    }

    const passwordValid = await argon2.verify(user.passwordHash, parsed.data.password).catch(() => false)
    if (!passwordValid || (employeeId && user.employeeId !== employeeId) || (email && user.email !== email)) {
      user.failedLoginCount = (user.failedLoginCount ?? 0) + 1
      if (user.failedLoginCount >= 5) {
        user.lockedAt = new Date()
        user.lockExpiresAt = new Date(Date.now() + 15 * 60 * 1000)
      }
      await user.save()
      throw unauthorized("The supplied credentials do not match an active employee record.")
    }

    user.failedLoginCount = 0
    user.lockedAt = undefined
    user.lockExpiresAt = undefined
    user.lastLoginAt = new Date()
    await user.save()

    const handoffCode = randomCode()
    const intendedOrigin = app.config.roleOrigins[user.role as Role] ?? app.config.loginOrigin
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
      mustChangePassword: user.mustChangePassword,
      user: publicUser(user),
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
    if (user.mustChangePassword) {
      throw forbidden("PASSWORD_CHANGE_REQUIRED")
    }
    const accessToken = await issueAccessToken(app, { id: user.id, employeeId: user.employeeId, role: user.role })
    return ok(request, { accessToken, user: publicUser(user), expiresIn: app.config.accessTokenTtl })
  })

  app.get("/auth/me", { preHandler: app.authenticate }, async (request) => {
    const user = await User.findOne({ _id: request.auth!.userId, active: true })
    if (!user) throw unauthorized()
    return ok(request, publicUser(user))
  })

  app.post("/auth/change-password", { preHandler: app.authenticate }, async (request) => {
    const parsed = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(12), confirmPassword: z.string().min(12) }).safeParse(request.body)
    if (!parsed.success) throw badRequest("Current password and a new password of at least 12 characters are required.")
    if (parsed.data.newPassword !== parsed.data.confirmPassword) throw badRequest("The new password and confirmation do not match.")

    const user = await User.findById(request.auth!.userId).select("+passwordHash")
    if (!user) throw unauthorized()
    if (user.mustChangePassword || user.active === false) {
      const currentMatches = await argon2.verify(user.passwordHash, parsed.data.currentPassword).catch(() => false)
      if (!currentMatches) throw unauthorized("The current password is incorrect.")
    }

    const passwordMatchesIdentifier = parsed.data.newPassword.toLowerCase() === user.employeeId.toLowerCase() || parsed.data.newPassword.toLowerCase() === user.email.toLowerCase()
    const passwordTooWeak = passwordMatchesIdentifier || parsed.data.newPassword.length < 12
    if (passwordTooWeak) throw badRequest("The new password must be at least 12 characters and different from the employee ID or email.")

    const correctCurrentPassword = await argon2.verify(user.passwordHash, parsed.data.currentPassword).catch(() => false)
    if (!correctCurrentPassword) throw unauthorized("The current password is incorrect.")

    user.passwordHash = await argon2.hash(parsed.data.newPassword)
    user.mustChangePassword = false
    user.failedLoginCount = 0
    user.lockedAt = undefined
    user.lockExpiresAt = undefined
    user.passwordChangedAt = new Date()
    await user.save()

    await audit(request, "auth.password_changed", "user", user.id)
    return ok(request, publicUser(user))
  })

  app.patch("/auth/profile/email", { preHandler: app.authenticate }, async (request) => {
    const parsed = z.object({ email: z.string().email(), currentPassword: z.string().min(1) }).safeParse(request.body)
    if (!parsed.success) throw badRequest("A valid email and current password are required.")
    const user = await User.findById(request.auth!.userId).select("+passwordHash")
    if (!user || !(await argon2.verify(user.passwordHash, parsed.data.currentPassword).catch(() => false))) throw unauthorized("The current password is incorrect.")
    if (user.mustChangePassword && !isPasswordChangeAllowed(request)) {
      throw forbidden("PASSWORD_CHANGE_REQUIRED")
    }
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
