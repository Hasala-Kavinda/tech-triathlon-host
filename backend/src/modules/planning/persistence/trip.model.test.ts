import mongoose, { Types } from "mongoose"
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import { connectDatabase, disconnectDatabase } from "../../../db/connection.js"
import { loadConfig } from "../../../config/env.js"
import { Trip } from "./trip.model.js"

describe("Trip Model (DB-11)", () => {
  beforeAll(async () => {
    const config = loadConfig()
    await connectDatabase(config.mongodbUri)
  })

  beforeEach(async () => {
    await Trip.deleteMany({})
    console.log("INDEXES:", JSON.stringify(await Trip.collection.indexes(), null, 2))
  })

  afterAll(async () => {
    await Trip.deleteMany({})
    await disconnectDatabase()
  })

  it("should enforce required fields and defaults", async () => {
    const trip = new Trip({
      tripNumber: "TRP-100",
      serviceDate: "2026-10-02",
      departureAt: new Date(),
      depot: "Depot-1",
      vehicleId: "V-123",
      driverId: new Types.ObjectId(),
      dispatcherId: new Types.ObjectId(),
      distanceKm: 50,
    })

    await trip.save()

    const saved = await Trip.findOne({ tripNumber: "TRP-100" })
    expect(saved).toBeDefined()
    expect(saved?.routeIndex).toBe(1) // default
    expect(saved?.status).toBe("draft") // default
    expect(saved?.totals?.distanceKm).toBe(0) // default inside totals
    expect(saved?.stops).toEqual([])
  })

  it("should reject duplicate trip numbers", async () => {
    const data = {
      tripNumber: "TRP-200",
      serviceDate: "2026-10-02",
      departureAt: new Date(),
      depot: "Depot-1",
      vehicleId: "V-123",
      driverId: new Types.ObjectId(),
      dispatcherId: new Types.ObjectId(),
      distanceKm: 50,
    }

    await Trip.create(data)

    let error: any
    try {
      await Trip.create(data)
    } catch (e: any) {
      error = e
    }
    expect(error).toBeDefined()
    expect(error.code).toBe(11000)
  })

  it("should reject duplicate vehicleId + serviceDate + routeIndex", async () => {
    const trip1 = {
      tripNumber: "TRP-301",
      serviceDate: "2026-10-02",
      departureAt: new Date(),
      depot: "Depot-1",
      vehicleId: "V-SHARED",
      driverId: new Types.ObjectId(),
      dispatcherId: new Types.ObjectId(),
      distanceKm: 50,
      routeIndex: 1,
      status: "published",
    }

    const trip2 = { ...trip1, tripNumber: "TRP-302" } // Same vehicle/date/routeIndex

    await Trip.create(trip1)

    let error: any
    try {
      await Trip.create(trip2)
    } catch (e: any) {
      error = e
    }
    expect(error).toBeDefined()
    expect(error.code).toBe(11000)
  })

  it("should let draft trips share a vehicle turn, so a draft can be re-validated", async () => {
    const draft = {
      tripNumber: "TRP-311",
      serviceDate: "2026-10-02",
      departureAt: new Date(),
      depot: "Depot-1",
      vehicleId: "V-DRAFTS",
      driverId: new Types.ObjectId(),
      dispatcherId: new Types.ObjectId(),
      distanceKm: 50,
      routeIndex: 1,
      status: "draft",
    }
    await Trip.create(draft)
    await expect(Trip.create({ ...draft, tripNumber: "TRP-312" })).resolves.toBeDefined()
  })

  it("should allow same vehicleId + serviceDate with different routeIndex", async () => {
    const trip1 = {
      tripNumber: "TRP-401",
      serviceDate: "2026-10-02",
      departureAt: new Date(),
      depot: "Depot-1",
      vehicleId: "V-MULTI",
      driverId: new Types.ObjectId(),
      dispatcherId: new Types.ObjectId(),
      distanceKm: 50,
      routeIndex: 1,
    }

    const trip2 = { ...trip1, tripNumber: "TRP-402", routeIndex: 2 }

    await Trip.create(trip1)
    const saved = await Trip.create(trip2)
    
    expect(saved).toBeDefined()
    expect(saved.routeIndex).toBe(2)
  })

  it("should accept valid status enum including 'loading'", async () => {
    const trip = new Trip({
      tripNumber: "TRP-500",
      serviceDate: "2026-10-02",
      departureAt: new Date(),
      depot: "Depot-1",
      vehicleId: "V-123",
      driverId: new Types.ObjectId(),
      dispatcherId: new Types.ObjectId(),
      distanceKm: 50,
      status: "loading",
    })

    const saved = await trip.save()
    expect(saved.status).toBe("loading")
  })

  it("should reject routeIndex 3 per maximum-two-route domain rule", async () => {
    const trip = new Trip({
      tripNumber: "TRP-600",
      serviceDate: "2026-10-02",
      departureAt: new Date(),
      depot: "Depot-1",
      vehicleId: "V-123",
      driverId: new Types.ObjectId(),
      dispatcherId: new Types.ObjectId(),
      distanceKm: 50,
      routeIndex: 3,
    })

    let error: any
    try {
      await trip.save()
    } catch (e: any) {
      error = e
    }
    expect(error).toBeDefined()
    expect(error.name).toBe("ValidationError")
    expect(error.errors.routeIndex).toBeDefined()
  })

  it("should enforce optimistic concurrency using version key", async () => {
    const trip = new Trip({
      tripNumber: "TRP-700",
      serviceDate: "2026-10-02",
      departureAt: new Date(),
      depot: "Depot-1",
      vehicleId: "V-123",
      driverId: new Types.ObjectId(),
      dispatcherId: new Types.ObjectId(),
      distanceKm: 50,
      routeIndex: 1,
    })
    const saved = await trip.save()
    expect((saved as any).version).toBe(0)

    // Simulate two concurrent readers
    const doc1 = await Trip.findById(saved._id)
    const doc2 = await Trip.findById(saved._id)

    // First writer wins
    doc1!.status = "published"
    await doc1!.save()
    
    const updated = await Trip.findById(saved._id)
    expect((updated as any)?.version).toBe(1)

    // Second writer loses
    doc2!.status = "cancelled"
    let error: any
    try {
      await doc2!.save()
    } catch (e: any) {
      error = e
    }
    expect(error).toBeDefined()
    expect(error.name).toBe("VersionError")
  })
})
