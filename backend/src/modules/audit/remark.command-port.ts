import type { ClientSession, Types } from "mongoose"
import { Remark } from "./persistence/remark.model.js"
import { OperationalEventCommandPort } from "./operational-event.command-port.js"

/**
 * RemarkCommandPort — the ONLY authorised path for writing to the remarks
 * collection.
 *
 * Rules:
 * - No other module may call Remark.findOneAndUpdate/save/create directly.
 * - The caller owns the session; this port does NOT start a transaction.
 * - Where a remark write must also emit an operational event, both writes
 *   use the SAME session so they are atomic.
 */

export interface CreateRemarkInput {
  text: string
  entityType: string
  entityId: string
  actorId: string | Types.ObjectId
  actorRole: string
  audienceRoles: string[]
  requestId?: string
}

export interface ReviewRemarkInput {
  remarkId: string
  reviewedBy: string | Types.ObjectId
  response: string
  notifyRoles?: string[]
}

export const RemarkCommandPort = {
  /**
   * Create a new remark and emit a corresponding operational event.
   *
   * Both writes share the same session when supplied.
   * Returns the newly created Remark document.
   */
  async createRemark(input: CreateRemarkInput, session?: ClientSession) {
    const remark = (await Remark.create(
      [
        {
          text: input.text,
          entityType: input.entityType,
          entityId: input.entityId,
          actorId: input.actorId,
          actorRole: input.actorRole,
          audienceRoles: input.audienceRoles,
          requestId: input.requestId,
          status: "pending",
        },
      ],
      { session },
    ))[0]!

    // Emit an operational event for the audit stream (append-only — new document).
    await OperationalEventCommandPort.emitEvent(session, {
      eventType: "remark.created",
      entityType: input.entityType,
      entityId: input.entityId,
      actorId: input.actorId,
      actorRole: input.actorRole,
      requestId: input.requestId,
      data: { remarkId: String(remark._id), text: input.text, audienceRoles: input.audienceRoles },
    })

    return remark
  },

  /**
   * Review an existing remark.
   *
   * Updates the Remark document status to "reviewed" and emits a NEW
   * "remark.reviewed" operational event. The original "remark.created"
   * event is NEVER mutated (append-only guarantee).
   *
   * Returns the updated Remark document, or null if not found / already reviewed.
   */
  async reviewRemark(input: ReviewRemarkInput, session?: ClientSession) {
    const reviewedAt = new Date()
    const remark = await Remark.findOneAndUpdate(
      { _id: input.remarkId, status: "pending" },
      {
        $set: {
          status: "reviewed",
          reviewedAt,
          reviewedBy: input.reviewedBy,
          reviewResponse: input.response,
          notifyRoles: input.notifyRoles ?? [],
        },
      },
      { new: true, ...(session ? { session } : {}) },
    )

    if (!remark) return null

    // Emit a NEW operational event — never mutate the original remark.created event.
    await OperationalEventCommandPort.emitEvent(session, {
      eventType: "remark.reviewed",
      entityType: remark.entityType,
      entityId: remark.entityId,
      actorId: input.reviewedBy,
      actorRole: "dispatcher",
      data: {
        remarkId: String(remark._id),
        response: input.response,
        notifyRoles: input.notifyRoles ?? [],
      },
    })

    return remark
  },
}
