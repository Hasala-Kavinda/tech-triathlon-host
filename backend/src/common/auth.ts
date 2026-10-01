import type { FastifyInstance, FastifyRequest } from "fastify"
import { jwtVerify, SignJWT } from "jose"
import { forbidden, unauthorized } from "./errors.js"
import { ROLES, type Role } from "../database/models/index.js"

const encoder = new TextEncoder()

export async function issueAccessToken(app: FastifyInstance, user: { id: string; employeeId: string; role: Role }) {
  const duration = app.config.accessTokenTtl.endsWith("h")
    ? Number.parseInt(app.config.accessTokenTtl, 10) * 60 * 60
    : 8 * 60 * 60
  return new SignJWT({ employeeId: user.employeeId, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuer("waylink-api")
    .setAudience("waylink-role-apps")
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + duration)
    .sign(encoder.encode(app.config.jwtSecret))
}

export async function authenticateRequest(app: FastifyInstance, request: FastifyRequest) {
  const header = request.headers.authorization
  if (!header?.startsWith("Bearer ")) throw unauthorized()
  try {
    const result = await jwtVerify(header.slice(7), encoder.encode(app.config.jwtSecret), {
      issuer: "waylink-api",
      audience: "waylink-role-apps",
    })
    const role = result.payload.role
    const employeeId = result.payload.employeeId
    if (!result.payload.sub || typeof employeeId !== "string" || !ROLES.includes(role as Role)) throw new Error("bad claims")
    request.auth = { userId: result.payload.sub, employeeId, role: role as Role }
  } catch {
    throw unauthorized("The access token is invalid or expired.")
  }
}

export function requireRole(request: FastifyRequest, ...roles: Role[]) {
  if (!request.auth) throw unauthorized()
  if (!roles.includes(request.auth.role)) throw forbidden()
  return request.auth
}
