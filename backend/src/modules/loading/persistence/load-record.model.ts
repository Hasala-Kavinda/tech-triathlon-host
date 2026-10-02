import { Schema, model } from "mongoose"

const loadExceptionSchema = new Schema(
  {
    type: { type: String, enum: ["missing", "damaged"], required: true },
    quantity: { type: Number, required: true },
    reasonCode: { type: String, required: true },
    note: { type: String },
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

const baseSchemaOptions = { timestamps: true, versionKey: "version", optimisticConcurrency: true } as const

const loadRecordSchema = new Schema(
  {
    tripId: { type: Schema.Types.ObjectId, required: true, unique: true },
    depot: { type: String, required: true },
    status: { type: String, enum: ["available", "claimed", "loading", "reconciled", "confirmed"], default: "available" },
    claimedBy: { type: Schema.Types.ObjectId },
    claimedAt: Date,
    loadingStartedAt: Date,
    confirmedAt: Date,
    items: { type: [loadItemSchema], default: [] },
  },
  baseSchemaOptions,
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
