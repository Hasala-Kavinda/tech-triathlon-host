import mongoose, { Schema, model } from "mongoose"

export { ROLES, type Role, User } from "../../modules/auth/persistence/user.model.js"

const statusEventSchema = new Schema(
  {
    status: { type: String, required: true },
    at: { type: Date, required: true, default: Date.now },
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    note: String,
  },
  { _id: false },
)








const orderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    sku: { type: String, required: true },
    name: { type: String, required: true },
    unit: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitWeightKg: { type: Number, required: true, min: 0 },
    unitVolumeM3: { type: Number, required: true, min: 0 },
    temperatureClass: { type: String, required: true },
    fragile: { type: Boolean, required: true },
  },
  { _id: false },
)

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    outletId: { type: String, required: true },
    storeManagerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    brand: { type: String, required: true },
    orderType: { type: String, required: true },
    requestedDate: { type: String, required: true },
    cutoffBucket: { type: String, enum: ["before_cutoff", "after_cutoff"], required: true },
    status: { type: String, enum: ["submitted", "deferred", "allocated", "in_transit", "delivered", "cancelled"], default: "submitted" },
    items: { type: [orderItemSchema], required: true },
    totalWeightKg: { type: Number, required: true },
    totalVolumeM3: { type: Number, required: true },
    allocatedTripId: { type: Schema.Types.ObjectId, ref: "Trip" },
    deferredTo: String,
    deferralReason: String,
    statusHistory: { type: [statusEventSchema], default: [] },
  },
  { timestamps: true, versionKey: "version", optimisticConcurrency: true },
)
orderSchema.index({ outletId: 1, createdAt: -1 })
orderSchema.index({ requestedDate: 1, status: 1, brand: 1 })

const ruleSchema = new Schema(
  { code: String, passed: Boolean, message: String, actual: Schema.Types.Mixed, threshold: Schema.Types.Mixed },
  { _id: false },
)

const stopSchema = new Schema(
  {
    stopId: { type: String, required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    outletId: { type: String, required: true },
    sequence: { type: Number, required: true },
    plannedArrivalAt: Date,
    status: { type: String, default: "planned" },
  },
  { _id: false },
)

const tripSchema = new Schema(
  {
    tripNumber: { type: String, required: true, unique: true },
    serviceDate: { type: String, required: true },
    departureAt: { type: Date, required: true },
    depot: { type: String, required: true },
    vehicleId: { type: String, required: true },
    driverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    dispatcherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["draft", "published", "load_confirmed", "claimed", "in_transit", "completed", "cancelled"], default: "draft" },
    stops: { type: [stopSchema], default: [] },
    distanceKm: { type: Number, required: true, min: 0 },
    plannedEndAt: Date,
    constraintCheck: { checkedAt: Date, valid: Boolean, rules: [ruleSchema] },
    claimedByDriverId: { type: Schema.Types.ObjectId, ref: "User" },
    vehicleConfirmedAt: Date,
    startFileAssetId: String,
    endFileAssetId: String,
    startedAt: Date,
    completedAt: Date,
    statusHistory: { type: [statusEventSchema], default: [] },
  },
  { timestamps: true, versionKey: "version", optimisticConcurrency: true },
)
tripSchema.index({ serviceDate: 1, vehicleId: 1, status: 1 })
tripSchema.index({ driverId: 1, serviceDate: 1 })

const loadItemSchema = new Schema(
  {
    itemId: { type: String, required: true },
    stopId: { type: String, required: true },
    orderId: { type: Schema.Types.ObjectId, required: true },
    sku: { type: String, required: true },
    name: { type: String, required: true },
    expectedQuantity: { type: Number, required: true },
    loadedQuantity: { type: Number, default: 0 },
    status: { type: String, enum: ["pending", "loaded", "missing", "damaged"], default: "pending" },
    exception: { type: Schema.Types.Mixed },
  },
  { _id: false },
)

const loadRecordSchema = new Schema(
  {
    tripId: { type: Schema.Types.ObjectId, ref: "Trip", required: true, unique: true },
    depot: { type: String, required: true },
    status: { type: String, enum: ["available", "claimed", "loading", "reconciled", "confirmed"], default: "available" },
    claimedBy: { type: Schema.Types.ObjectId, ref: "User" },
    claimedAt: Date,
    loadingStartedAt: Date,
    confirmedAt: Date,
    items: { type: [loadItemSchema], default: [] },
  },
  { timestamps: true, versionKey: "version", optimisticConcurrency: true },
)
loadRecordSchema.index({ depot: 1, status: 1, createdAt: -1 })

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



export const Order = model("Order", orderSchema)
export const Trip = model("Trip", tripSchema)
export const LoadRecord = model("LoadRecord", loadRecordSchema)
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
