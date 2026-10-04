import type { FastifyReply, FastifyRequest } from "fastify"

export function ok<T>(request: FastifyRequest, data: T) {
  return { success: true as const, data, requestId: request.id }
}

export function page<T>(request: FastifyRequest, data: T[], pageNumber: number, pageSize: number, total: number) {
  return { success: true as const, data, meta: { page: pageNumber, pageSize, total }, requestId: request.id }
}

export function noContent(reply: FastifyReply) {
  return reply.status(204).send()
}
