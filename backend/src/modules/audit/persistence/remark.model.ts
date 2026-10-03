import mongoose, { Schema, Document, Types } from "mongoose"

/**
 * Canonical Remark document — Audit-owned persistence.
 *
 * A Remark is a first-class domain object with its own lifecycle.
 * It is NOT an OperationalEvent and must not be stored as one.
 *
 * IMPORTANT: Do NOT call Remark.find/findOne/findOneAndUpdate anywhere
 * except RemarkCommandPort and RemarkReadPort.
 */

export const REMARK_STATUSES = ["pending", "reviewed"] as const
export type RemarkStatus = (typeof REMARK_STATUSES)[number]

export interface IRemark {
  /** The human-readable text of the remark. */
  text: string
  /** Which entity this remark is about (e.g. "order", "trip", "delivery"). */
  entityType: string
  /** The string-form ID of the target entity. */
  entityId: string
  /** Author user ID. */
  actorId: Types.ObjectId
  /** Role of the authoring actor at the time of creation. */
  actorRole: string
  /**
   * Roles who should see this remark.
   * Sourced from the POST /remarks `audienceRoles` field in the existing API.
   */
  audienceRoles: string[]
  status: RemarkStatus
  /** Set when a dispatcher reviews the remark. */
  reviewedAt?: Date
  /** ID of the dispatcher who reviewed. */
  reviewedBy?: Types.ObjectId
  /** The dispatcher's textual review response. */
  reviewResponse?: string
  /** Roles to notify after review. */
  notifyRoles?: string[]
  /** Fastify requestId of the create request, for idempotency audit trails. */
  requestId?: string
  createdAt: Date
  updatedAt: Date
}

export interface IRemarkDocument extends IRemark, Document {}

const remarkSchema = new Schema<IRemarkDocument>(
  {
    text: { type: String, required: true, maxlength: 2000 },
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
    actorId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    actorRole: { type: String, required: true },
    audienceRoles: { type: [String], required: true },
    status: { type: String, enum: REMARK_STATUSES, required: true, default: "pending" },
    reviewedAt: Date,
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewResponse: String,
    notifyRoles: [String],
    requestId: String,
  },
  { timestamps: true, versionKey: false, collection: "remarks" },
)

// Authoritative index from the Four Roles plan.
remarkSchema.index({ status: 1, createdAt: -1 }, { background: true })

// Additional indexes required by existing query patterns:
// - entityType + entityId for "all remarks about this trip/order" queries
// - actorId for "remarks by this user" queries
remarkSchema.index({ entityType: 1, entityId: 1, createdAt: -1 }, { background: true })

export const Remark = mongoose.model<IRemarkDocument>("Remark", remarkSchema)
