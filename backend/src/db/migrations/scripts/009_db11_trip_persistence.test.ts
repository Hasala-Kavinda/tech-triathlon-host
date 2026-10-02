import mongoose from "mongoose"
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import { connectDatabase, disconnectDatabase } from "../../connection.js"
import { loadConfig } from "../../../config/env.js"
import { up } from "./009_db11_trip_persistence.js"
import { Trip } from "../../../database/models/index.js"

describe("009_db11_trip_persistence", () => {
  const session = undefined as any

  beforeAll(async () => {
    const config = loadConfig()
    await connectDatabase(config.mongodbUri)
  })

  beforeEach(async () => {
    await Trip.deleteMany({})
    try { await Trip.collection.dropIndex("vehicleId_1_serviceDate_1_routeIndex_1") } catch (e) {}
  })

  afterAll(async () => {
    await Trip.deleteMany({})
    await disconnectDatabase()
  })

  it("should assign sequential routeIndex to trips for the same vehicle and serviceDate", async () => {
    await Trip.collection.insertMany([
      {
        _id: new mongoose.Types.ObjectId(),
        tripNumber: "TRP-1",
        serviceDate: "2023-01-01",
        departureAt: new Date("2023-01-01T08:00:00Z"),
        depot: "DEPOT1",
        vehicleId: "V1",
        driverId: new mongoose.Types.ObjectId(),
        dispatcherId: new mongoose.Types.ObjectId(),
        distanceKm: 100,
        status: "draft",
      },
      {
        _id: new mongoose.Types.ObjectId(),
        tripNumber: "TRP-2",
        serviceDate: "2023-01-01",
        departureAt: new Date("2023-01-01T14:00:00Z"),
        depot: "DEPOT1",
        vehicleId: "V1",
        driverId: new mongoose.Types.ObjectId(),
        dispatcherId: new mongoose.Types.ObjectId(),
        distanceKm: 50,
        status: "draft",
      },
      {
        _id: new mongoose.Types.ObjectId(),
        tripNumber: "TRP-3",
        serviceDate: "2023-01-02",
        departureAt: new Date("2023-01-02T08:00:00Z"),
        depot: "DEPOT1",
        vehicleId: "V1",
        driverId: new mongoose.Types.ObjectId(),
        dispatcherId: new mongoose.Types.ObjectId(),
        distanceKm: 200,
        status: "draft",
      },
    ])

    await up(session)

    const trip1 = await Trip.findOne({ tripNumber: "TRP-1" })
    const trip2 = await Trip.findOne({ tripNumber: "TRP-2" })
    const trip3 = await Trip.findOne({ tripNumber: "TRP-3" })

    expect(trip1?.routeIndex).toBe(1)
    expect(trip2?.routeIndex).toBe(2)
    expect(trip3?.routeIndex).toBe(1)
    
    expect(trip1?.totals?.distanceKm).toBe(100)
    expect(trip2?.totals?.distanceKm).toBe(50)
  })

  it("should be idempotent", async () => {
    await Trip.collection.insertMany([
      {
        _id: new mongoose.Types.ObjectId(),
        tripNumber: "TRP-1",
        serviceDate: "2023-01-01",
        departureAt: new Date("2023-01-01T08:00:00Z"),
        depot: "DEPOT1",
        vehicleId: "V1",
        driverId: new mongoose.Types.ObjectId(),
        dispatcherId: new mongoose.Types.ObjectId(),
        distanceKm: 100,
        status: "draft",
        routeIndex: 1,
        totals: { distanceKm: 100, weightKg: 0, volumeM3: 0, fuelLitres: 0 },
      },
    ])

    await up(session)
    const trip1Before = await Trip.findOne({ tripNumber: "TRP-1" })
    await up(session)
    const trip1After = await Trip.findOne({ tripNumber: "TRP-1" })

    expect(trip1Before?.routeIndex).toBe(1)
    expect(trip1After?.routeIndex).toBe(1)
  })

  it("should fail preflight if >2 trips exist for same vehicle and serviceDate", async () => {
    await Trip.collection.insertMany([
      {
        _id: new mongoose.Types.ObjectId(),
        tripNumber: "TRP-MAX-1",
        serviceDate: "2023-12-01",
        departureAt: new Date("2023-12-01T08:00:00Z"),
        depot: "D1",
        vehicleId: "V-MAX",
        driverId: new mongoose.Types.ObjectId(),
        dispatcherId: new mongoose.Types.ObjectId(),
        distanceKm: 10,
        status: "draft",
      },
      {
        _id: new mongoose.Types.ObjectId(),
        tripNumber: "TRP-MAX-2",
        serviceDate: "2023-12-01",
        departureAt: new Date("2023-12-01T12:00:00Z"),
        depot: "D1",
        vehicleId: "V-MAX",
        driverId: new mongoose.Types.ObjectId(),
        dispatcherId: new mongoose.Types.ObjectId(),
        distanceKm: 20,
        status: "draft",
      },
      {
        _id: new mongoose.Types.ObjectId(),
        tripNumber: "TRP-MAX-3",
        serviceDate: "2023-12-01",
        departureAt: new Date("2023-12-01T16:00:00Z"),
        depot: "D1",
        vehicleId: "V-MAX",
        driverId: new mongoose.Types.ObjectId(),
        dispatcherId: new mongoose.Types.ObjectId(),
        distanceKm: 30,
        status: "draft",
      },
    ])

    await expect(up(session)).rejects.toThrow(/violates the maximum-two-route rule/)
  })
})
