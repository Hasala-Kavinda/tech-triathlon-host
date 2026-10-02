import mongoose, { Schema, model } from "mongoose"

export { ROLES, type Role, User } from "../../modules/auth/persistence/user.model.js"

export { Trip } from "../../modules/planning/persistence/trip.model.js"

export { LoadRecord } from "../../modules/loading/persistence/load-record.model.js"
export { DeliveryRecord } from "../../modules/delivery/persistence/delivery-record.model.js"
export { PinChallenge } from "../../modules/delivery/persistence/pin-challenge.model.js"
export { TripLocation } from "../../modules/delivery/persistence/trip-location.model.js"





const idempotencySchema = new Schema(
  {
    key: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, required: true },
    operation: { type: String, required: true },
    requestHash: { type: String, required: true },
    statusCode: { type: Number, required: true },
    response: { type: Schema.Types.Mixed, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, versionKey: false },
)
idempotencySchema.index({ key: 1, userId: 1, operation: 1 }, { unique: true })
idempotencySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

const syncReceiptSchema = new Schema(
  {
    clientMutationId: { type: String, required: true },
    driverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tripId: { type: String, required: true },
    operation: { type: String, required: true },
    result: { type: String, enum: ["applied", "duplicate", "conflict", "rejected"], required: true },
    response: Schema.Types.Mixed,
  },
  { timestamps: true, versionKey: false },
)
syncReceiptSchema.index({ clientMutationId: 1, driverId: 1 }, { unique: true })





export { OperationalEvent } from "../../modules/audit/persistence/operational-event.model.js"
export { FileAsset } from "../../modules/files/persistence/file-asset.model.js"
export const IdempotencyRecord = model("IdempotencyRecord", idempotencySchema)
export const SyncReceipt = model("SyncReceipt", syncReceiptSchema)

export function toPublicObject<T extends { toObject(): Record<string, unknown> }>(document: T) {
  const value = document.toObject()
  value.id = String(value._id)
  delete value._id
  return value
}

export { mongoose }
