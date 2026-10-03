import mongoose, { Document, Schema, Types } from "mongoose"

export interface IPinChallenge {
  deliveryRecordId: Types.ObjectId
  pinHash: string
  issuedAt: Date
  expiresAt: Date
  attempts: number
  maxAttempts: number
  status: "issued" | "verified" | "locked" | "expired" | "revoked"
  verifiedAt?: Date
  revokedAt?: Date
  version: number
}

export interface IPinChallengeDocument extends IPinChallenge, Document {
  version: number
}

const pinChallengeSchema = new Schema<IPinChallengeDocument>({
  deliveryRecordId: { type: Schema.Types.ObjectId, required: true },
  pinHash: { type: String, required: true, select: false },
  issuedAt: { type: Date, required: true, default: Date.now },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, required: true, default: 0 },
  maxAttempts: { type: Number, required: true, default: 5 },
  status: { type: String, required: true, enum: ["issued", "verified", "locked", "expired", "revoked"], default: "issued" },
  verifiedAt: { type: Date },
  revokedAt: { type: Date }
}, {
  timestamps: true,
  optimisticConcurrency: true,
  versionKey: "version"
})

// Enforce one active challenge per delivery
pinChallengeSchema.index(
  { deliveryRecordId: 1 }, 
  { unique: true, partialFilterExpression: { status: "issued" } }
)

export const PinChallenge = mongoose.model<IPinChallengeDocument>("PinChallenge", pinChallengeSchema, "delivery_pin_challenges")
