import mongoose from "mongoose"
import { OperationalEvent, IEventScope } from "./persistence/operational-event.model.js"

export interface EmitEventInput {
  eventType: string
  entityType: string
  entityId: string
  actorId?: string | mongoose.Types.ObjectId
  actorRole?: string
  requestId?: string
  scope?: IEventScope
  data?: any
}

export class OperationalEventCommandPort {
  /**
   * Emits an operational event within the provided business transaction.
   * Enforces the append-only nature of the event stream.
   */
  static async emitEvent(session: mongoose.ClientSession, input: EmitEventInput): Promise<void> {
    await OperationalEvent.create([input], { session })
  }
}
