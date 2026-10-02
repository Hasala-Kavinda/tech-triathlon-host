import mongoose, { Document, Schema, Types } from "mongoose"

export interface IFileAsset {
  publicId: string
  provider: string
  kind: string
  ownerId: Types.ObjectId
  tripId?: Types.ObjectId
  deliveryId?: Types.ObjectId
  mimeType: string
  format: string
  bytes: number
  capturedAt: Date
  providerVersion?: number
  status: "verified"
}

export interface IFileAssetDocument extends IFileAsset, Document {}

const fileAssetSchema = new Schema<IFileAssetDocument>(
  {
    publicId: { type: String, required: true, unique: true },
    provider: { type: String, default: "cloudinary", required: true },
    kind: { type: String, required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tripId: { type: Schema.Types.ObjectId, ref: "Trip" },
    deliveryId: { type: Schema.Types.ObjectId, ref: "DeliveryRecord" },
    mimeType: { type: String, required: true },
    format: { type: String, required: true },
    bytes: { type: Number, required: true },
    capturedAt: { type: Date, required: true },
    providerVersion: Number,
    status: { type: String, enum: ["verified"], required: true },
  },
  { timestamps: true, versionKey: false },
)

fileAssetSchema.index({ tripId: 1, kind: 1 })
fileAssetSchema.index({ deliveryId: 1, kind: 1 })

export const FileAsset = mongoose.model<IFileAssetDocument>("FileAsset", fileAssetSchema, "file_assets")
