import type { FastifyRequest } from "fastify"
import { OperationalEventCommandPort } from "../modules/audit/operational-event.command-port.js"

export async function audit(
  request: FastifyRequest,
  eventType: string,
  entityType: string,
  entityId: string,
  data?: Record<string, unknown>,
) {
  await OperationalEventCommandPort.emitEvent(undefined, {
    eventType,
    entityType,
    entityId,
    actorId: request.auth?.userId,
    actorRole: request.auth?.role,
    requestId: request.id,
    data,
  })
}
