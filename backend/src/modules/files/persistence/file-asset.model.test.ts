import { describe, it, expect } from "vitest"
import mongoose from "mongoose"
import { FileAsset } from "./file-asset.model.js"

describe("FileAsset Model", () => {
  const validAsset = {
    publicId: "waylink/USER1/start_meter/123",
    provider: "cloudinary",
    kind: "start_meter",
    ownerId: new mongoose.Types.ObjectId(),
    mimeType: "image/jpeg",
    format: "jpeg",
    bytes: 1024,
    capturedAt: new Date(),
    status: "verified"
  }

  it("should create a valid verified FileAsset", () => {
    const doc = new FileAsset(validAsset)
    const err = doc.validateSync()
    expect(err).toBeUndefined()
  })

  it("should require publicId, provider, kind, ownerId, mimeType, format, bytes, capturedAt, status", () => {
    const doc = new FileAsset({})
    const err = doc.validateSync()
    expect(err?.errors.publicId).toBeDefined()
    expect(err?.errors.kind).toBeDefined()
    expect(err?.errors.ownerId).toBeDefined()
    expect(err?.errors.mimeType).toBeDefined()
    expect(err?.errors.format).toBeDefined()
    expect(err?.errors.bytes).toBeDefined()
    expect(err?.errors.capturedAt).toBeDefined()
  })


})
