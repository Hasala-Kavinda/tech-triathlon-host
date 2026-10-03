import mongoose, { Schema, model } from "mongoose"

const deliveryItemSchema = new Schema(
  {
    sku: { type: String, required: true },
    orderIds: { type: [Schema.Types.ObjectId], ref: "Order", required: true },
    expected: { type: Number, required: true, default: 0 },
    delivered: { type: Number, default: 0 },
    short: { type: Number, default: 0 },
    damaged: { type: Number, default: 0 },
    outcome: { type: String },
    note: { type: String },
  },
  { _id: false },
)

const proofSchema = new Schema(
  {
    status: { type: String, enum: ["none", "pending_verification", "verified", "failed"], default: "none" },
    enteredAt: { type: Date },
  },
  { _id: false },
)

const deliveryRecordSchema = new Schema(
  {
    tripId: { type: Schema.Types.ObjectId, ref: "Trip", required: true },
    tripStopId: { type: Schema.Types.ObjectId, required: true },
    outletId: { type: String, required: true },
    driverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["pending", "arrived", "delivered", "failed", "receipt_confirmed", "receipt_issue"],
      default: "pending",
      required: true,
    },
    arrivedAt: Date,
    completedAt: Date,
    proof: { type: proofSchema, default: () => ({ status: "none" }) },
    receipt: Schema.Types.Mixed,
    items: [deliveryItemSchema],
  },
  { timestamps: true, versionKey: "version", optimisticConcurrency: true },
)

deliveryRecordSchema.index({ tripId: 1, tripStopId: 1 }, { unique: true })
deliveryRecordSchema.index({ outletId: 1, completedAt: -1 })
deliveryRecordSchema.index({ driverId: 1, status: 1 })
deliveryRecordSchema.index({ driverId: 1, completedAt: -1 })

export const DeliveryRecord = model("DeliveryRecord", deliveryRecordSchema, "delivery_records")
