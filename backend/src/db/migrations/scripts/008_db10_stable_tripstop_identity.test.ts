import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import mongoose, { Types } from "mongoose"
import { connectDatabase, disconnectDatabase } from "../../connection.js"
import { loadConfig } from "../../../config/env.js"
import { up } from "./008_db10_stable_tripstop_identity.js"

describe("Migration: 008_db10_stable_tripstop_identity", () => {
  beforeAll(async () => {
    const config = loadConfig()
    await connectDatabase(config.mongodbUri)
  })

  beforeEach(async () => {
    const db = mongoose.connection.db
    if (!db) throw new Error("DB not connected")
    await db.collection("trips").deleteMany({})
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  let seq = 0
  const makeTrip = (stops: object[]) => ({
    _id: new Types.ObjectId(),
    tripNumber: `TRP-MIGTEST-${++seq}`,
    serviceDate: "2026-10-02",
    departureAt: new Date(),
    depot: "Peliyagoda",
    vehicleId: "VH-001",
    driverId: new Types.ObjectId(),
    dispatcherId: new Types.ObjectId(),
    status: "draft",
    distanceKm: 50,
    stops,
    statusHistory: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 0,
  })

  const makeStop = (overrides: object = {}) => ({
    stopId: `STOP-${++seq}`,
    orderId: new Types.ObjectId(),
    outletId: "OUT001",
    sequence: seq,
    status: "planned",
    ...overrides,
  })

  it("should be a no-op on empty trips collection", async () => {
    await expect(up()).resolves.toBeUndefined()
    const db = mongoose.connection.db!
    const count = await db.collection("trips").countDocuments()
    expect(count).toBe(0)
  })

  it("should be idempotent on empty collection (second run)", async () => {
    await up()
    await expect(up()).resolves.toBeUndefined()
  })

  it("should assign tripStopId to stops that lack it", async () => {
    const db = mongoose.connection.db!
    const stop = makeStop()
    await db.collection("trips").insertOne(makeTrip([stop]))

    await up()

    const trip = await db.collection("trips").findOne({})
    expect(trip).toBeDefined()
    expect(trip!.stops[0].tripStopId).toBeInstanceOf(Types.ObjectId)
  })

  it("should populate orderIds[] from orderId for legacy stops", async () => {
    const db = mongoose.connection.db!
    const orderId = new Types.ObjectId()
    const stop = makeStop({ orderId })
    await db.collection("trips").insertOne(makeTrip([stop]))

    await up()

    const trip = await db.collection("trips").findOne({})
    const migratedStop = trip!.stops[0]
    expect(Array.isArray(migratedStop.orderIds)).toBe(true)
    expect(migratedStop.orderIds).toHaveLength(1)
    expect(String(migratedStop.orderIds[0])).toBe(String(orderId))
  })

  it("should preserve existing tripStopId on already-migrated stops", async () => {
    const db = mongoose.connection.db!
    const existingId = new Types.ObjectId()
    const stop = makeStop({ tripStopId: existingId, orderIds: [new Types.ObjectId()] })
    await db.collection("trips").insertOne(makeTrip([stop]))

    await up()

    const trip = await db.collection("trips").findOne({})
    expect(String(trip!.stops[0].tripStopId)).toBe(String(existingId))
  })

  it("should be idempotent: second run does not reassign IDs", async () => {
    const db = mongoose.connection.db!
    const stop = makeStop()
    await db.collection("trips").insertOne(makeTrip([stop]))

    await up()
    const after1 = await db.collection("trips").findOne({})
    const id1 = String(after1!.stops[0].tripStopId)

    await up()
    const after2 = await db.collection("trips").findOne({})
    const id2 = String(after2!.stops[0].tripStopId)

    expect(id1).toBe(id2)
  })

  it("should handle multiple stops in a trip, each receiving a unique tripStopId", async () => {
    const db = mongoose.connection.db!
    const stop1 = makeStop({ sequence: 1 })
    const stop2 = makeStop({ sequence: 2 })
    const stop3 = makeStop({ sequence: 3 })
    await db.collection("trips").insertOne(makeTrip([stop1, stop2, stop3]))

    await up()

    const trip = await db.collection("trips").findOne({})
    const ids = trip!.stops.map((s: { tripStopId: Types.ObjectId }) => String(s.tripStopId))
    const unique = new Set(ids)
    expect(unique.size).toBe(3)
  })

  it("should preserve sequence (route ordering) through migration", async () => {
    const db = mongoose.connection.db!
    const stop1 = makeStop({ sequence: 1, outletId: "OUT001" })
    const stop2 = makeStop({ sequence: 2, outletId: "OUT002" })
    await db.collection("trips").insertOne(makeTrip([stop1, stop2]))

    await up()

    const trip = await db.collection("trips").findOne({})
    expect(trip!.stops[0].sequence).toBe(1)
    expect(trip!.stops[0].outletId).toBe("OUT001")
    expect(trip!.stops[1].sequence).toBe(2)
    expect(trip!.stops[1].outletId).toBe("OUT002")
  })

  it("should preserve outletId as string through migration", async () => {
    const db = mongoose.connection.db!
    const stop = makeStop({ outletId: "OUTLET-XYZ-987" })
    await db.collection("trips").insertOne(makeTrip([stop]))

    await up()

    const trip = await db.collection("trips").findOne({})
    expect(typeof trip!.stops[0].outletId).toBe("string")
    expect(trip!.stops[0].outletId).toBe("OUTLET-XYZ-987")
  })

  it("should preserve legacy stopId string through migration", async () => {
    const db = mongoose.connection.db!
    const stop = makeStop({ stopId: "STOP-99" })
    await db.collection("trips").insertOne(makeTrip([stop]))

    await up()

    const trip = await db.collection("trips").findOne({})
    expect(trip!.stops[0].stopId).toBe("STOP-99")
  })

  it("should handle mixed: some stops already migrated, some not", async () => {
    const db = mongoose.connection.db!
    const existingId = new Types.ObjectId()
    const migratedStop = makeStop({ tripStopId: existingId, orderIds: [new Types.ObjectId()], sequence: 1 })
    const unmigrated = makeStop({ sequence: 2 })
    await db.collection("trips").insertOne(makeTrip([migratedStop, unmigrated]))

    await up()

    const trip = await db.collection("trips").findOne({})
    // First stop: existing ID preserved
    expect(String(trip!.stops[0].tripStopId)).toBe(String(existingId))
    // Second stop: new ID assigned
    expect(trip!.stops[1].tripStopId).toBeInstanceOf(Types.ObjectId)
    expect(String(trip!.stops[1].tripStopId)).not.toBe(String(existingId))
  })

  it("should handle multiple trips in the collection", async () => {
    const db = mongoose.connection.db!
    await db.collection("trips").insertMany([
      makeTrip([makeStop(), makeStop()]),
      makeTrip([makeStop()]),
    ])

    await up()

    const trips = await db.collection("trips").find({}).toArray()
    expect(trips).toHaveLength(2)
    for (const trip of trips) {
      for (const stop of trip.stops) {
        expect(stop.tripStopId).toBeDefined()
        expect(Array.isArray(stop.orderIds)).toBe(true)
        expect(stop.orderIds.length).toBeGreaterThan(0)
      }
    }
  })

  it("should fail preflight if a stop is missing orderId", async () => {
    const db = mongoose.connection.db!
    const badStop = { stopId: "STOP-BAD", outletId: "OUT001", sequence: 1, status: "planned" }
    // no orderId
    await db.collection("trips").insertOne(makeTrip([badStop]))

    await expect(up()).rejects.toThrow(/preflight failed/)
  })

  it("should fail preflight if a stop is missing outletId", async () => {
    const db = mongoose.connection.db!
    const badStop = { stopId: "STOP-BAD", orderId: new Types.ObjectId(), sequence: 1, status: "planned" }
    await db.collection("trips").insertOne(makeTrip([badStop]))

    await expect(up()).rejects.toThrow(/preflight failed/)
  })

  it("should preserve existing orderIds[] if already populated (not overwrite)", async () => {
    const db = mongoose.connection.db!
    const order1 = new Types.ObjectId()
    const order2 = new Types.ObjectId()
    const stop = makeStop({ orderId: order1, orderIds: [order1, order2] })
    await db.collection("trips").insertOne(makeTrip([stop]))

    await up()

    const trip = await db.collection("trips").findOne({})
    const migratedStop = trip!.stops[0]
    expect(migratedStop.orderIds).toHaveLength(2)
  })
})
