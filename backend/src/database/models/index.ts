import mongoose, { Schema, model } from "mongoose"

export { ROLES, type Role, User } from "../../modules/auth/persistence/user.model.js"

export { Trip } from "../../modules/planning/persistence/trip.model.js"

export { LoadRecord } from "../../modules/loading/persistence/load-record.model.js"
const deliveryItemSchema = new Schema(
  { orderId: Schema.Types.ObjectId, sku: String, expected: Number, delivered: Number, short: Number, damaged: Number, note: String },
  { _id: false },
)

const deliveryRecordSchema = new Schema(
  {
    tripId: { type: Schema.Types.ObjectId, ref: "Trip", required: true },
    stopId: { type: String, required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    outletId: { type: String, required: true },
    driverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["planned", "arrived", "proof_verified", "completed"], default: "planned" },
    arrivedAt: Date,
    completedAt: Date,
    outcome: String,
    items: [deliveryItemSchema],
    pinHash: { type: String, select: false },
    pinExpiresAt: Date,
    pinAttempts: { type: Number, default: 0 },
    receipt: Schema.Types.Mixed,
  },
  { timestamps: true, versionKey: "version", optimisticConcurrency: true },
)
deliveryRecordSchema.index({ tripId: 1, stopId: 1 }, { unique: true })
deliveryRecordSchema.index({ outletId: 1, completedAt: -1 })
deliveryRecordSchema.index({ driverId: 1, completedAt: -1 })

const locationSchema = new Schema(
  {
    tripId: { type: Schema.Types.ObjectId, ref: "Trip", required: true },
    driverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sequence: { type: Number, required: true },
    recordedAt: { type: Date, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    accuracy: { type: Number, required: true },
    heading: Number,
    speed: Number,
  },
  { timestamps: true, versionKey: false },
)
locationSchema.index({ tripId: 1, sequence: 1 }, { unique: true })
locationSchema.index({ tripId: 1, recordedAt: -1 })

const eventSchema = new Schema(
  {
    eventType: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    actorRole: String,
    requestId: String,
    data: Schema.Types.Mixed,
  },
  { timestamps: true, versionKey: false },
)
eventSchema.index({ entityType: 1, entityId: 1, createdAt: -1 })

const fileAssetSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true },
    provider: { type: String, default: "cloudinary" },
    kind: { type: String, required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tripId: { type: Schema.Types.ObjectId, ref: "Trip" },
    deliveryId: { type: Schema.Types.ObjectId, ref: "DeliveryRecord" },
    mimeType: { type: String, required: true },
    format: { type: String, required: true },
    bytes: { type: Number, required: true },
    capturedAt: { type: Date, required: true },
    providerVersion: Number,
  },
  { timestamps: true, versionKey: false },
)
fileAssetSchema.index({ tripId: 1, kind: 1 })
fileAssetSchema.index({ deliveryId: 1, kind: 1 })

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



export const DeliveryRecord = model("DeliveryRecord", deliveryRecordSchema)
export const TripLocation = model("TripLocation", locationSchema)
export const OperationalEvent = model("OperationalEvent", eventSchema)
export const FileAsset = model("FileAsset", fileAssetSchema)
export const IdempotencyRecord = model("IdempotencyRecord", idempotencySchema)
export const SyncReceipt = model("SyncReceipt", syncReceiptSchema)

export function toPublicObject<T extends { toObject(): Record<string, unknown> }>(document: T) {
  const value = document.toObject()
  value.id = String(value._id)
  delete value._id
  return value
}

export { mongoose }
