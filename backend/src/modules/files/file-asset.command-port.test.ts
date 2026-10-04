import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest"
import mongoose from "mongoose"
import { FileAssetCommandPort } from "./file-asset.command-port.js"
import { FileAsset } from "./persistence/file-asset.model.js"

describe("FileAssetCommandPort", () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/waylink_test")
  })

  beforeEach(async () => {
    await FileAsset.deleteMany({})
    await FileAsset.syncIndexes()
  })

  afterAll(async () => {
    await mongoose.connection.close()
  })

  it("should record a verified asset, automatically setting status to verified", async () => {
    const ownerId = new mongoose.Types.ObjectId()
    const tripId = new mongoose.Types.ObjectId()
    
    const asset = await FileAssetCommandPort.recordVerifiedAsset({
      publicId: `waylink/${ownerId}/start_meter/123`,
      providerVersion: 1,
      kind: "start_meter",
      ownerId,
      tripId: tripId.toString(),
      mimeType: "image/jpeg",
      format: "jpeg",
      bytes: 2048,
      capturedAt: new Date()
    })

    expect(asset.publicId).toBe(`waylink/${ownerId}/start_meter/123`)
    expect(asset.status).toBe("verified")
    expect(asset.provider).toBe("cloudinary")
    expect(asset.tripId?.toString()).toBe(tripId.toString())

    const doc = await FileAsset.findById(asset._id)
    expect(doc?.status).toBe("verified")
  })
})
