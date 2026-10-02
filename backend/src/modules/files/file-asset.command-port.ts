import mongoose from "mongoose"
import { FileAsset } from "./persistence/file-asset.model.js"

export interface RecordVerifiedAssetInput {
  publicId: string
  provider?: string
  providerVersion: number
  kind: string
  ownerId: string | mongoose.Types.ObjectId
  tripId?: string | undefined
  deliveryId?: string | undefined
  mimeType: string
  format: string
  bytes: number
  capturedAt: Date
}

export const FileAssetCommandPort = {
  async recordVerifiedAsset(input: RecordVerifiedAssetInput) {
    return FileAsset.create({
      ...input,
      provider: input.provider ?? "cloudinary",
      status: "verified"
    })
  }
}
