import { describe, it, expect, beforeAll, afterAll } from "vitest"
import mongoose from "mongoose"
import { connectDatabase } from "../../connection.js"
import { loadConfig } from "../../../config/env.js"
import { up } from "./011_db13_delivery_record_persistence.js"

describe("Migration: DeliveryRecord Persistence", () => {

  beforeAll(async () => {
    const config = loadConfig()
    await connectDatabase(config.mongodbUri)
    await mongoose.connection.collection("delivery_records").deleteMany({})
    await mongoose.connection.collection("trips").deleteMany({})
  })

  afterAll(async () => {
    await mongoose.disconnect()
  })

  it("1. Safely transforms legacy DeliveryRecord to canonical identity", async () => {
    const tripId = new mongoose.Types.ObjectId()
    const driverId = new mongoose.Types.ObjectId()
    const orderId = new mongoose.Types.ObjectId()
    const tripStopId = new mongoose.Types.ObjectId()

    // 1. Insert a Trip with stops
    await mongoose.connection.collection("trips").insertOne({
      _id: tripId,
      tripNumber: 1,
      driverId,
      status: "published",
      stops: [
        {
          tripStopId: tripStopId,
          stopId: "stop-legacy-1",
          orderId,
          orderIds: [orderId],
          outletId: "O-001"
        }
      ]
    })

    // 2. Insert a legacy DeliveryRecord
    const legacyRecord = {
      tripId,
      stopId: "stop-legacy-1",
      orderId,
      outletId: "O-001",
      driverId,
      status: "proof_verified",
      completedAt: new Date(),
      items: [
        {
          sku: "TEST-SKU",
          expected: 10,
          delivered: 10,
          short: 0,
          damaged: 0
        }
      ]
    }
    const insertRes = await mongoose.connection.collection("delivery_records").insertOne(legacyRecord)

    // 3. Run migration
    await up(mongoose.connection)

    // 4. Verify
    const migrated = await mongoose.connection.collection("delivery_records").findOne({ _id: insertRes.insertedId })
    
    expect(migrated).toBeDefined()
    expect(migrated?.stopId).toBeUndefined()
    expect(migrated?.tripStopId?.toString()).toBe(tripStopId.toString())
    expect(migrated?.status).toBe("delivered")
    expect(migrated?.proof?.status).toBe("verified")
    expect(migrated?.orderId).toBeUndefined()
    
    expect(migrated?.items[0].sku).toBe("TEST-SKU")
    expect(migrated?.items[0].orderIds[0].toString()).toBe(orderId.toString())
  })

  it("2. Is idempotent", async () => {
    const beforeCount = await mongoose.connection.collection("delivery_records").countDocuments()
    await up(mongoose.connection)
    const afterCount = await mongoose.connection.collection("delivery_records").countDocuments()
    expect(afterCount).toBe(beforeCount)
  })

  it("3. Fails loudly on ambiguous legacy stopId mapping", async () => {
    const tripId = new mongoose.Types.ObjectId()
    const driverId = new mongoose.Types.ObjectId()
    const tripStopId1 = new mongoose.Types.ObjectId()
    const tripStopId2 = new mongoose.Types.ObjectId()

    await mongoose.connection.collection("trips").insertOne({
      _id: tripId,
      tripNumber: 2,
      driverId,
      status: "published",
      stops: [
        { tripStopId: tripStopId1, stopId: "stop-ambiguous", orderId: new mongoose.Types.ObjectId(), orderIds: [], outletId: "O-001" },
        { tripStopId: tripStopId2, stopId: "stop-ambiguous", orderId: new mongoose.Types.ObjectId(), orderIds: [], outletId: "O-002" }
      ]
    })

    const legacyRecord = {
      tripId,
      stopId: "stop-ambiguous",
      outletId: "O-001",
      driverId,
      status: "pending",
      items: []
    }
    await mongoose.connection.collection("delivery_records").insertOne(legacyRecord)

    await expect(up(mongoose.connection)).rejects.toThrow(/Ambiguous mapping: found 2 canonical TripStops/)
  })
})
