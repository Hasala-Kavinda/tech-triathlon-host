import mongoose from "mongoose"
import { OperationalEvent, IEventScope } from "./persistence/operational-event.model.js"

export interface EmitEventInput {
  eventType: string
  entityType: string
  entityId: string
  actorId?: string | mongoose.Types.ObjectId | undefined
  actorRole?: string | undefined
  requestId?: string | undefined
  scope?: IEventScope | undefined
  data?: any
}

export class OperationalEventCommandPort {
  /**
   * Emits an operational event.
   * If a transaction session is provided, the event is emitted within that transaction.
   * Does NOT start an implicit transaction if omitted.
   */
  static async emitEvent(session: mongoose.ClientSession | undefined, input: EmitEventInput): Promise<void> {
    await OperationalEvent.create([input], { session })
  }

  /**
   * Existing authoritative requirement from Operations module.
   * Updates an existing remark event with a review response.
   */
  static async reviewRemarkEvent(eventId: string, response: string, notifyRoles: string[]): Promise<any> {
    const event = await OperationalEvent.findOneAndUpdate(
      { _id: eventId, eventType: "remark.created" },
      { $set: { "data.reviewed": true, "data.response": response, "data.notifyRoles": notifyRoles } },
      { new: true }
    )
    return event
  }
}
