import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import mongoose from "mongoose"
import { DeliveryRecord } from "./delivery-record.model.js"
import { connectDatabase } from "../../../db/connection.js"
import { loadConfig } from "../../../config/env.js"

describe("DeliveryRecord Model", () => {

  beforeAll(async () => {
    const config = loadConfig()
    await connectDatabase(config.mongodbUri)
  })

  afterAll(async () => {
    await mongoose.disconnect()
  })

  beforeEach(async () => {
    await DeliveryRecord.deleteMany({})
  })

  it("requires tripId, tripStopId, outletId, driverId", async () => {
    const doc = new DeliveryRecord({})
    const err = doc.validateSync()
    expect(err).toBeDefined()
    expect(err?.errors.tripId).toBeDefined()
    expect(err?.errors.tripStopId).toBeDefined()
    expect(err?.errors.outletId).toBeDefined()
    expect(err?.errors.driverId).toBeDefined()
  })

  it("defaults status to pending and proof.status to none", async () => {
    const doc = new DeliveryRecord({
      tripId: new mongoose.Types.ObjectId(),
      tripStopId: new mongoose.Types.ObjectId(),
      outletId: "O-001",
      driverId: new mongoose.Types.ObjectId(),
      items: [
        {
          sku: "TEST-SKU",
          orderIds: [new mongoose.Types.ObjectId()],
          expected: 10
        }
      ]
    })
    
    await doc.save()
    
    expect(doc.status).toBe("pending")
    expect(doc.proof.status).toBe("none")
    expect(doc.version).toBe(0)
  })

  it("supports multiple orderIds per item", async () => {
    const orderId1 = new mongoose.Types.ObjectId()
    const orderId2 = new mongoose.Types.ObjectId()
    
    const doc = new DeliveryRecord({
      tripId: new mongoose.Types.ObjectId(),
      tripStopId: new mongoose.Types.ObjectId(),
      outletId: "O-001",
      driverId: new mongoose.Types.ObjectId(),
      items: [
        {
          sku: "TEST-SKU",
          orderIds: [orderId1, orderId2],
          expected: 20
        }
      ]
    })
    
    await doc.save()
    
    expect(doc.items[0]!.orderIds).toHaveLength(2)
  })

  it("enforces optimistic concurrency", async () => {
    const doc = await DeliveryRecord.create({
      tripId: new mongoose.Types.ObjectId(),
      tripStopId: new mongoose.Types.ObjectId(),
      outletId: "O-001",
      driverId: new mongoose.Types.ObjectId(),
      items: []
    })

    const doc1 = await DeliveryRecord.findById(doc._id)
    const doc2 = await DeliveryRecord.findById(doc._id)

    doc1!.status = "arrived"
    await doc1!.save()

    doc2!.status = "delivered"
    await expect(doc2!.save()).rejects.toThrow(/No matching document found/)
  })
})
