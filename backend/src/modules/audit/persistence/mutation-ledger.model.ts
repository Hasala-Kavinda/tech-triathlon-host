import mongoose, { Schema, Document, Types } from "mongoose"

export interface IMutationLedger {
  mutationId: string
  namespace: "api" | "sync"
  actorId: Types.ObjectId
  operation: string
  requestHash?: string
  statusCode?: number
  entityId?: string
  result?: string
  response?: any
  expiresAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface IMutationLedgerDocument extends IMutationLedger, Document {}

const ledgerSchema = new Schema(
  {
    mutationId: { type: String, required: true },
    namespace: { type: String, enum: ["api", "sync"], required: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    operation: { type: String, required: true },
    requestHash: String,
    statusCode: Number,
    entityId: String,
    result: { type: String, enum: ["success", "applied", "duplicate", "conflict", "rejected"] },
    response: Schema.Types.Mixed,
    expiresAt: Date,
  },
  { timestamps: true, versionKey: false },
)

ledgerSchema.index({ mutationId: 1, actorId: 1, operation: 1 }, { unique: true, partialFilterExpression: { namespace: "api" } })
ledgerSchema.index({ mutationId: 1, actorId: 1 }, { unique: true, partialFilterExpression: { namespace: "sync" } })
ledgerSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const MutationLedger = mongoose.model<IMutationLedgerDocument>("MutationLedger", ledgerSchema)
