import type { FastifyRequest } from "fastify"
import { conflict } from "./errors.js"

export function expectedVersion(request: FastifyRequest, bodyVersion?: number) {
  const header = request.headers["if-match"]
  const raw = typeof header === "string" ? header.replaceAll('"', "") : bodyVersion
  const value = typeof raw === "number" ? raw : Number(raw)
  if (!Number.isInteger(value) || value < 0) throw conflict("VERSION_REQUIRED", "If-Match with the current numeric version is required.")
  return value
}
