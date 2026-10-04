import { Schema, model } from "mongoose"
import { createBaseSchema } from "../../../db/model-conventions.js"

const loadExceptionSchema = new Schema(
  {
    type: { type: String, enum: ["missing", "damaged"], required: true },
    quantity: { type: Number, required: true },
    reasonCode: { type: String, required: true },
    note: { type: String },
  },
  { _id: false },
)

const planChangeSchema = new Schema(
  {
    changeId: { type: String, required: true },
    type: { type: String, enum: ["ORDER_DEFERRED"], required: true },
    orderId: { type: Schema.Types.ObjectId, required: true },
    description: { type: String, required: true },
    reason: { type: String },
    createdAt: { type: Date, required: true, default: Date.now },
    acknowledgedAt: { type: Date },
    acknowledgedBy: { type: Schema.Types.ObjectId },
  },
  { _id: false },
)

const loadItemSchema = new Schema(
  {
    itemId: { type: String, required: true },
    tripStopId: { type: Schema.Types.ObjectId, required: true },
    orderIds: { type: [Schema.Types.ObjectId], required: true },
    sku: { type: String, required: true },
    name: { type: String, required: true },
    expectedQuantity: { type: Number, required: true },
    loadedQuantity: { type: Number, default: 0 },
    varianceQuantity: { type: Number, required: true, default: 0 }, // must equal loadedQuantity - expectedQuantity
    status: { type: String, enum: ["pending", "loaded", "missing", "damaged"], default: "pending" },
    exception: { type: loadExceptionSchema },
  },
  { _id: false },
)

const loadRecordSchema = createBaseSchema(
  {
    tripId: { type: Schema.Types.ObjectId, required: true, unique: true },
    depot: { type: String, required: true },
    status: { type: String, enum: ["available", "claimed", "loading", "reconciled", "confirmed"], default: "available" },
    claimedBy: { type: Schema.Types.ObjectId },
    claimedAt: Date,
    loadingStartedAt: Date,
    confirmedAt: Date,
    items: { type: [loadItemSchema], default: [] },
    planChanges: { type: [planChangeSchema], default: [] },
  },
)

loadRecordSchema.index({ depot: 1, status: 1, createdAt: -1 })
loadRecordSchema.index({ claimedBy: 1, status: 1 }) // claimant + status index as requested

// Pre-save hook to forcefully sync varianceQuantity across all items, preventing bypass
loadRecordSchema.pre("save", function () {
  if (this.items) {
    for (const item of this.items) {
      item.varianceQuantity = (item.loadedQuantity || 0) - (item.expectedQuantity || 0)
    }
  }
})

export const LoadRecord = model("LoadRecord", loadRecordSchema)
