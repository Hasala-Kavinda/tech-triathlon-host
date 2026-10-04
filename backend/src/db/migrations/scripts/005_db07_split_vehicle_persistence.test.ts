import { describe, it, expect, beforeEach, afterAll, beforeAll } from "vitest"
import mongoose from "mongoose"
import { connectDatabase, disconnectDatabase } from "../../connection.js"
import { loadConfig } from "../../../config/env.js"
import { up } from "./005_db07_split_vehicle_persistence.js"

describe("Migration: 005_db07_split_vehicle_persistence", () => {
  beforeAll(async () => {
    const config = loadConfig()
    await connectDatabase(config.mongodbUri)
  })

  beforeEach(async () => {
    const db = mongoose.connection.db
    if (!db) throw new Error("DB not connected")
    await db.collection("vehicles").deleteMany({})
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("should normalize vehicleId successfully", async () => {
    const db = mongoose.connection.db!
    await db.collection("vehicles").insertOne({
      vehicleId: "  veh-123 ",
      type: "van",
      temperatureClass: "ambient",
      weightCapacityKg: 1000,
      volumeCapacityM3: 5,
      fuelType: "diesel",
      kmPerL: 10,
      weeklyFuelQuotaL: 50,
      depot: "DEPOT-1",
      active: true
    })

    await up()

    const vehicle = await db.collection("vehicles").findOne({ type: "van" })
    expect(vehicle?.vehicleId).toBe("VEH-123")
  })

  it("should fail on duplicate normalized vehicleId", async () => {
    const db = mongoose.connection.db!
    await db.collection("vehicles").insertMany([
      { vehicleId: "VEH-123", type: "van", temperatureClass: "ambient", weightCapacityKg: 1000, volumeCapacityM3: 5, fuelType: "diesel", kmPerL: 10, weeklyFuelQuotaL: 50, depot: "DEPOT-1", active: true },
      { vehicleId: "veh-123", type: "truck", temperatureClass: "ambient", weightCapacityKg: 1000, volumeCapacityM3: 5, fuelType: "diesel", kmPerL: 10, weeklyFuelQuotaL: 50, depot: "DEPOT-1", active: true }
    ])

    await expect(up()).rejects.toThrow(/Migration blocked: Duplicate normalized vehicleIds detected/)
  })

  it("should fail on negative capacity", async () => {
    const db = mongoose.connection.db!
    await db.collection("vehicles").insertOne({
      vehicleId: "VEH-123",
      type: "van",
      temperatureClass: "ambient",
      weightCapacityKg: -10, // Invalid
      volumeCapacityM3: 5,
      fuelType: "diesel",
      kmPerL: 10,
      weeklyFuelQuotaL: 50,
      depot: "DEPOT-1",
      active: true
    })

    await expect(up()).rejects.toThrow(/Migration blocked/)
  })
  
  it("should fail on zero capacity", async () => {
    const db = mongoose.connection.db!
    await db.collection("vehicles").insertOne({
      vehicleId: "VEH-123",
      type: "van",
      temperatureClass: "ambient",
      weightCapacityKg: 0, // Invalid per preflight
      volumeCapacityM3: 5,
      fuelType: "diesel",
      kmPerL: 10,
      weeklyFuelQuotaL: 50,
      depot: "DEPOT-1",
      active: true
    })

    await expect(up()).rejects.toThrow(/Migration blocked/)
  })

  it("should create correct canonical indexes", async () => {
    const db = mongoose.connection.db!
    await db.collection("vehicles").insertOne({
      vehicleId: "VEH-123",
      type: "van",
      temperatureClass: "ambient",
      weightCapacityKg: 1000,
      volumeCapacityM3: 5,
      fuelType: "diesel",
      kmPerL: 10,
      weeklyFuelQuotaL: 50,
      depot: "DEPOT-1",
      active: true
    })

    await up()

    const indexes = await db.collection("vehicles").indexes()
    const names = indexes.map(i => i.name)
    expect(names).toContain("vehicleId_1")
    expect(names).toContain("depot_1_type_1_temperatureClass_1_active_1")
  })
})
