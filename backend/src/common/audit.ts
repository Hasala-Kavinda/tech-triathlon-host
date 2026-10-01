import type { FastifyRequest } from "fastify"
import { OperationalEvent } from "../database/models/index.js"

export async function audit(
  request: FastifyRequest,
  eventType: string,
  entityType: string,
  entityId: string,
  data?: Record<string, unknown>,
) {
  await OperationalEvent.create({
    eventType,
    entityType,
    entityId,
    actorId: request.auth?.userId,
    actorRole: request.auth?.role,
    requestId: request.id,
    data,
  })
}
