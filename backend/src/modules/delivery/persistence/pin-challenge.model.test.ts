import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import mongoose from "mongoose"
import { PinChallenge } from "./pin-challenge.model.js"
import { connectDatabase } from "../../../db/connection.js"
import { loadConfig } from "../../../config/env.js"

describe("PinChallenge Model", () => {
  beforeAll(async () => {
    const config = loadConfig()
    await connectDatabase(config.mongodbUri)
  })

  afterAll(async () => {
    await mongoose.disconnect()
  })

  beforeEach(async () => {
    await PinChallenge.deleteMany({})
  })

  it("requires deliveryRecordId, pinHash, expiresAt", async () => {
    const doc = new PinChallenge({})
    const err = doc.validateSync()
    expect(err).toBeDefined()
    expect(err?.errors.deliveryRecordId).toBeDefined()
    expect(err?.errors.pinHash).toBeDefined()
    expect(err?.errors.expiresAt).toBeDefined()
  })

  it("defaults status to issued and attempts to 0", async () => {
    const doc = new PinChallenge({
      deliveryRecordId: new mongoose.Types.ObjectId(),
      pinHash: "hash",
      expiresAt: new Date(Date.now() + 10000)
    })
    await doc.save()
    
    expect(doc.status).toBe("issued")
    expect(doc.attempts).toBe(0)
    expect(doc.maxAttempts).toBe(5)
    
    // Check that select: false prevents pinHash from being returned by default
    const reloaded = await PinChallenge.findById(doc._id)
    expect(reloaded!.pinHash).toBeUndefined()
    
    const reloadedWithHash = await PinChallenge.findById(doc._id).select("+pinHash")
    expect(reloadedWithHash!.pinHash).toBe("hash")
  })

  it("enforces one active challenge per delivery", async () => {
    const deliveryRecordId = new mongoose.Types.ObjectId()
    
    const doc1 = new PinChallenge({
      deliveryRecordId,
      pinHash: "hash1",
      expiresAt: new Date(Date.now() + 10000)
    })
    await doc1.save()
    
    const doc2 = new PinChallenge({
      deliveryRecordId,
      pinHash: "hash2",
      expiresAt: new Date(Date.now() + 10000)
    })
    
    await expect(doc2.save()).rejects.toThrow(/duplicate key error collection/)
    
    // Once doc1 is no longer "issued", doc2 can be saved
    doc1.status = "verified"
    await doc1.save()
    
    await doc2.save() // Should succeed now
    expect(doc2._id).toBeDefined()
  })

  it("enforces optimistic concurrency", async () => {
    const doc = await PinChallenge.create({
      deliveryRecordId: new mongoose.Types.ObjectId(),
      pinHash: "hash",
      expiresAt: new Date(Date.now() + 10000)
    })

    const doc1 = await PinChallenge.findById(doc._id)
    const doc2 = await PinChallenge.findById(doc._id)

    doc1!.status = "verified"
    await doc1!.save()

    doc2!.status = "locked"
    await expect(doc2!.save()).rejects.toThrow(/No matching document found/)
  })
})
