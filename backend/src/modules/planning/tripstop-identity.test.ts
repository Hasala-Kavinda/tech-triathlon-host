/**
 * DB-10: TripStop stable identity contract tests
 *
 * These tests verify:
 * 1. tripStopId is always an ObjectId (stable, not array-position)
 * 2. orderIds[] is populated and contains ObjectIds
 * 3. outletId remains a string (DB-05 convention)
 * 4. sequence preserves route order deterministically
 * 5. Legacy stopId string is preserved
 * 6. Two stops cannot accidentally share a tripStopId
 * 7. tripStopId survives document save/reload
 * 8. orderId (legacy single) is preserved
 * 9. TripStop remains embedded (no separate collection)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import mongoose, { Types } from "mongoose"
import { connectDatabase, disconnectDatabase } from "../../db/connection.js"
import { loadConfig } from "../../config/env.js"
import { Trip } from "../../database/models/index.js"

const baseTrip = () => ({
  tripNumber: `TRP-DB10-${new Types.ObjectId().toString().slice(-6)}`,
  serviceDate: "2026-10-02",
  departureAt: new Date(),
  depot: "Peliyagoda",
  vehicleId: "VH-001",
  driverId: new Types.ObjectId(),
  dispatcherId: new Types.ObjectId(),
  status: "draft" as const,
  distanceKm: 50,
  statusHistory: [],
})

const baseStop = (overrides: object = {}) => ({
  tripStopId: new Types.ObjectId(),
  stopId: `STOP-${Math.random().toString(36).slice(2, 6)}`,
  orderId: new Types.ObjectId(),
  orderIds: [new Types.ObjectId()],
  outletId: "OUT001",
  sequence: 1,
  status: "planned",
  ...overrides,
})

describe("DB-10: TripStop stable identity", () => {
  beforeAll(async () => {
    const config = loadConfig()
    await connectDatabase(config.mongodbUri)
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  beforeEach(async () => {
    await Trip.deleteMany({})
  })

  it("1. tripStopId is an ObjectId and is required", async () => {
    const stop = baseStop()
    const trip = await Trip.create({ ...baseTrip(), stops: [stop] })
    const reloaded = await Trip.findById(trip._id).lean()
    expect(reloaded!.stops[0]!.tripStopId).toBeInstanceOf(Types.ObjectId)
  })

  it("2. tripStopId survives a save/reload cycle (stable identity)", async () => {
    const stopId = new Types.ObjectId()
    const trip = await Trip.create({ ...baseTrip(), stops: [baseStop({ tripStopId: stopId })] })
    const reloaded = await Trip.findById(trip._id).lean()
    expect(String(reloaded!.stops[0]!.tripStopId)).toBe(String(stopId))
  })

  it("3. Two stops in a trip receive unique tripStopIds", async () => {
    const stop1 = baseStop({ sequence: 1, outletId: "OUT001" })
    const stop2 = baseStop({ sequence: 2, outletId: "OUT002" })
    const trip = await Trip.create({ ...baseTrip(), stops: [stop1, stop2] })
    const reloaded = await Trip.findById(trip._id).lean()
    const ids = reloaded!.stops.map((s) => String(s.tripStopId))
    expect(new Set(ids).size).toBe(2)
  })

  it("4. orderIds[] contains ObjectIds", async () => {
    const order1 = new Types.ObjectId()
    const order2 = new Types.ObjectId()
    const stop = baseStop({ orderIds: [order1, order2] })
    const trip = await Trip.create({ ...baseTrip(), stops: [stop] })
    const reloaded = await Trip.findById(trip._id).lean()
    const orderIds = reloaded!.stops[0]!.orderIds
    expect(Array.isArray(orderIds)).toBe(true)
    expect(orderIds.length).toBe(2)
    for (const id of orderIds) {
      expect(id).toBeInstanceOf(Types.ObjectId)
    }
  })

  it("5. Multiple orders can be represented per stop", async () => {
    const orders = [new Types.ObjectId(), new Types.ObjectId(), new Types.ObjectId()]
    const stop = baseStop({ orderIds: orders })
    const trip = await Trip.create({ ...baseTrip(), stops: [stop] })
    const reloaded = await Trip.findById(trip._id).lean()
    expect(reloaded!.stops[0]!.orderIds).toHaveLength(3)
  })

  it("6. outletId is a string (DB-05 convention preserved)", async () => {
    const trip = await Trip.create({ ...baseTrip(), stops: [baseStop({ outletId: "OUTLET-ABC" })] })
    const reloaded = await Trip.findById(trip._id).lean()
    expect(typeof reloaded!.stops[0]!.outletId).toBe("string")
    expect(reloaded!.stops[0]!.outletId).toBe("OUTLET-ABC")
  })

  it("7. sequence preserves route order deterministically", async () => {
    const stops = [
      baseStop({ sequence: 1, outletId: "OUT001" }),
      baseStop({ sequence: 2, outletId: "OUT002" }),
      baseStop({ sequence: 3, outletId: "OUT003" }),
    ]
    const trip = await Trip.create({ ...baseTrip(), stops })
    const reloaded = await Trip.findById(trip._id).lean()
    expect(reloaded!.stops[0]!.sequence).toBe(1)
    expect(reloaded!.stops[1]!.sequence).toBe(2)
    expect(reloaded!.stops[2]!.sequence).toBe(3)
    expect(reloaded!.stops[0]!.outletId).toBe("OUT001")
    expect(reloaded!.stops[1]!.outletId).toBe("OUT002")
    expect(reloaded!.stops[2]!.outletId).toBe("OUT003")
  })

  it("8. tripStopId identity does NOT depend on array position", async () => {
    const idA = new Types.ObjectId()
    const idB = new Types.ObjectId()
    const stopA = baseStop({ tripStopId: idA, sequence: 1, outletId: "OUT001" })
    const stopB = baseStop({ tripStopId: idB, sequence: 2, outletId: "OUT002" })
    const trip = await Trip.create({ ...baseTrip(), stops: [stopA, stopB] })

    // Reorder by updating sequence values — simulate a stop re-ordering
    await Trip.findByIdAndUpdate(trip._id, {
      $set: {
        "stops.0.sequence": 2,
        "stops.0.outletId": "OUT002",
        "stops.1.sequence": 1,
        "stops.1.outletId": "OUT001",
      },
    })

    const reloaded = await Trip.findById(trip._id).lean()
    // tripStopId A remains at position 0, B at position 1 — IDs unchanged despite sequence flip
    expect(String(reloaded!.stops[0]!.tripStopId)).toBe(String(idA))
    expect(String(reloaded!.stops[1]!.tripStopId)).toBe(String(idB))
  })

  it("9. Legacy orderId (single) is preserved", async () => {
    const orderId = new Types.ObjectId()
    const trip = await Trip.create({ ...baseTrip(), stops: [baseStop({ orderId, orderIds: [orderId] })] })
    const reloaded = await Trip.findById(trip._id).lean()
    expect(String(reloaded!.stops[0]!.orderId)).toBe(String(orderId))
  })

  it("10. Legacy stopId string is preserved for DeliveryRecord compat", async () => {
    const stop = baseStop({ stopId: "STOP-LEGACY-42" })
    const trip = await Trip.create({ ...baseTrip(), stops: [stop] })
    const reloaded = await Trip.findById(trip._id).lean()
    expect(reloaded!.stops[0]!.stopId).toBe("STOP-LEGACY-42")
  })

  it("11. TripStop does NOT exist in a separate collection", async () => {
    const db = mongoose.connection.db!
    const collections = await db.listCollections().toArray()
    const names = collections.map((c) => c.name)
    expect(names).not.toContain("tripstops")
    expect(names).not.toContain("trip_stops")
  })

  it("12. Saving the parent Trip does not alter existing tripStopIds", async () => {
    const stopId = new Types.ObjectId()
    const trip = await Trip.create({ ...baseTrip(), stops: [baseStop({ tripStopId: stopId })] })

    // Update trip metadata (not stops) and save
    trip.status = "draft"
    await trip.save()

    const reloaded = await Trip.findById(trip._id).lean()
    expect(String(reloaded!.stops[0]!.tripStopId)).toBe(String(stopId))
  })
})
