import type { FastifyRequest } from "fastify"
import { stableHash } from "./crypto.js"
import { conflict } from "./errors.js"
import { MutationLedgerCommandPort } from "../modules/audit/mutation-ledger.command-port.js"

export async function findIdempotentResult(request: FastifyRequest, operation: string, payload: unknown) {
  const key = request.headers["idempotency-key"]
  if (typeof key !== "string" || key.length < 8 || key.length > 128) {
    throw conflict("IDEMPOTENCY_KEY_REQUIRED", "A valid Idempotency-Key header is required.")
  }
  const requestHash = stableHash(payload)
  const existing = await MutationLedgerCommandPort.findIdempotentRecord(key, request.auth!.userId, operation)
  if (existing && existing.requestHash !== requestHash) {
    throw conflict("IDEMPOTENCY_KEY_REUSED", "This idempotency key was already used with a different request.")
  }
  return { key, requestHash, existing: existing ? { ...existing, statusCode: existing.statusCode as number } : null }
}

export async function saveIdempotentResult(input: {
  key: string
  requestHash: string
  operation: string
  userId: string
  statusCode: number
  response: unknown
}) {
  await MutationLedgerCommandPort.recordIdempotentResult({
    mutationId: input.key,
    requestHash: input.requestHash,
    operation: input.operation,
    actorId: input.userId,
    statusCode: input.statusCode,
    response: input.response
  })
}
