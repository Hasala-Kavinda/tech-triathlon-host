import type { FastifyRequest } from "fastify"
import type { Types } from "mongoose"
import { RemarkCommandPort } from "../audit/remark.command-port.js"

/**
 * Raises a Remark about a trip (and optionally a stop / load item) on behalf of the authenticated field user.
 * Used by the Driver, Loader and Store Manager flows so the Dispatcher's review queue is fed by the real remarks
 * collection instead of by each flow's private record. Failures never block the originating action.
 */
export async function raiseTripRemark(
  request: FastifyRequest,
  input: { tripId: string | Types.ObjectId; tripStopId?: string | Types.ObjectId | undefined; itemId?: string | undefined; text: string },
) {
  const auth = request.auth
  if (!auth) return null
  try {
    return await RemarkCommandPort.createRemark({
      text: input.text.slice(0, 2000),
      entityType: "trip",
      entityId: String(input.tripId),
      tripId: input.tripId,
      ...(input.tripStopId ? { stopId: input.tripStopId } : {}),
      ...(input.itemId ? { itemId: input.itemId } : {}),
      actorId: auth.userId,
      actorRole: auth.role,
      audienceRoles: ["dispatcher"],
      requestId: request.id,
    })
  } catch (error) {
    request.log.error({ err: error }, "could not raise trip remark")
    return null
  }
}
