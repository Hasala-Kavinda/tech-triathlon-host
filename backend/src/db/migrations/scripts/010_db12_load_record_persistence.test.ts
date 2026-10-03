import mongoose from "mongoose"
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import { connectDatabase, disconnectDatabase } from "../../connection.js"
import { loadConfig } from "../../../config/env.js"
import { up } from "./010_db12_load_record_persistence.js"
import { Trip } from "../../../database/models/index.js"

describe("010_db12_load_record_persistence", () => {
  const session = undefined as any

  beforeAll(async () => {
    const config = loadConfig()
    await connectDatabase(config.mongodbUri)
  })

  beforeEach(async () => {
    await Trip.deleteMany({})
    await mongoose.connection.collection("loadrecords").deleteMany({})
  })

  afterAll(async () => {
    await Trip.deleteMany({})
    await mongoose.connection.collection("loadrecords").deleteMany({})
    await disconnectDatabase()
  })

  it("should migrate legacy items to canonical tripStopId and orderIds and compute variance", async () => {
    const trip = await Trip.create({
      tripNumber: "TRP-1",
      serviceDate: "2023-01-01",
      departureAt: new Date(),
      depot: "DEPOT1",
      vehicleId: "V1",
      driverId: new mongoose.Types.ObjectId(),
      dispatcherId: new mongoose.Types.ObjectId(),
      distanceKm: 100,
      status: "draft",
      routeIndex: 1,
      stops: [
        {
          tripStopId: new mongoose.Types.ObjectId(),
          stopId: "LEGACY-STOP-1",
          orderId: new mongoose.Types.ObjectId(),
          orderIds: [new mongoose.Types.ObjectId()],
          outletId: "OUT1",
          sequence: 1,
        }
      ]
    })

    const orderId = new mongoose.Types.ObjectId()
    await mongoose.connection.collection("loadrecords").insertOne({
      tripId: trip._id,
      depot: "DEPOT1",
      status: "available",
      items: [
        {
          itemId: "ITEM-1",
          stopId: "LEGACY-STOP-1",
          orderId: orderId,
          sku: "SKU1",
          name: "Item 1",
          expectedQuantity: 10,
          loadedQuantity: 8,
          status: "missing",
          exception: { type: "missing", quantity: 2, reasonCode: "RC1" }
        }
      ]
    })

    const before = await mongoose.connection.collection("loadrecords").findOne({ tripId: trip._id })
    console.log("BEFORE MIGRATION:")
    console.log("legacy stopId:", before!.items[0].stopId)
    console.log("legacy orderId:", before!.items[0].orderId)
    console.log("exception:", before!.items[0].exception)

    await up(session)

    const record = await mongoose.connection.collection("loadrecords").findOne({ tripId: trip._id })
    console.log("AFTER MIGRATION (RUN 1):")
    console.log("tripStopId:", record!.items[0].tripStopId)
    console.log("orderIds:", record!.items[0].orderIds)
    console.log("varianceQuantity:", record!.items[0].varianceQuantity)
    
    // Idempotency check
    await up(session)
    const idempotent = await mongoose.connection.collection("loadrecords").findOne({ tripId: trip._id })
    console.log("AFTER MIGRATION (RUN 2 - Idempotent):")
    console.log("tripStopId:", idempotent!.items[0].tripStopId)
    
    expect(record!.items[0].stopId).toBeUndefined()
    expect(record!.items[0].orderId).toBeUndefined()
    expect(String(record!.items[0].tripStopId)).toBe(String((trip.stops[0] as any).tripStopId))
    expect(String(record!.items[0].orderIds[0])).toBe(String(orderId))
    expect(record!.items[0].varianceQuantity).toBe(-2) // 8 - 10
  })

  it("should fail migration if legacy stopId is ambiguous or missing", async () => {
    const trip = await Trip.create({
      tripNumber: "TRP-2",
      serviceDate: "2023-01-01",
      departureAt: new Date(),
      depot: "DEPOT1",
      vehicleId: "V1",
      driverId: new mongoose.Types.ObjectId(),
      dispatcherId: new mongoose.Types.ObjectId(),
      distanceKm: 100,
      status: "draft",
      routeIndex: 2,
      stops: []
    })

    await mongoose.connection.collection("loadrecords").insertOne({
      tripId: trip._id,
      depot: "DEPOT1",
      status: "available",
      items: [
        {
          itemId: "ITEM-1",
          stopId: "MISSING-STOP",
          sku: "SKU1",
          name: "Item 1",
          expectedQuantity: 10,
        }
      ]
    })

    try {
      await up(session)
      expect.fail("Should have thrown")
    } catch (e: any) {
      console.log("Migration safely rejected missing stopId:", e.message)
      expect(e.message).toMatch(/ambiguous or missing legacy stopId/)
    }
  })
})
