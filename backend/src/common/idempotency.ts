import type { FastifyRequest } from "fastify"
import { stableHash } from "./crypto.js"
import { conflict } from "./errors.js"
import { IdempotencyRecord } from "../database/models/index.js"

export async function findIdempotentResult(request: FastifyRequest, operation: string, payload: unknown) {
  const key = request.headers["idempotency-key"]
  if (typeof key !== "string" || key.length < 8 || key.length > 128) {
    throw conflict("IDEMPOTENCY_KEY_REQUIRED", "A valid Idempotency-Key header is required.")
  }
  const requestHash = stableHash(payload)
  const existing = await IdempotencyRecord.findOne({ key, userId: request.auth!.userId, operation })
  if (existing && existing.requestHash !== requestHash) {
    throw conflict("IDEMPOTENCY_KEY_REUSED", "This idempotency key was already used with a different request.")
  }
  return { key, requestHash, existing }
}

export async function saveIdempotentResult(input: {
  key: string
  requestHash: string
  operation: string
  userId: string
  statusCode: number
  response: unknown
}) {
  await IdempotencyRecord.create({ ...input, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) })
}
