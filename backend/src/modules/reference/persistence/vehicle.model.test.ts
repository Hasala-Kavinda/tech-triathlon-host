import { describe, it, expect, beforeEach, afterAll, beforeAll } from "vitest"
import mongoose from "mongoose"
import { connectDatabase, disconnectDatabase } from "../../../db/connection.js"
import { loadConfig } from "../../../config/env.js"
import { Vehicle } from "./vehicle.model.js"

describe("Vehicle Model", () => {
  beforeAll(async () => {
    const config = loadConfig()
    await connectDatabase(config.mongodbUri)
  })

  beforeEach(async () => {
    await Vehicle.deleteMany({})
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("should create a valid vehicle", async () => {
    const vehicle = await Vehicle.create({
      vehicleId: "VEH-1",
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

    expect(vehicle.vehicleId).toBe("VEH-1")
    expect(vehicle.active).toBe(true)
  })

  it("should fail if required fields are missing", async () => {
    await expect(Vehicle.create({ vehicleId: "VEH-2" })).rejects.toThrow(mongoose.Error.ValidationError)
  })

  it("should enforce vehicleId uniqueness", async () => {
    const data = {
      vehicleId: "VEH-1",
      type: "van",
      temperatureClass: "ambient",
      weightCapacityKg: 1000,
      volumeCapacityM3: 5,
      fuelType: "diesel",
      kmPerL: 10,
      weeklyFuelQuotaL: 50,
      depot: "DEPOT-1",
    }
    await Vehicle.create(data)
    await expect(Vehicle.create(data)).rejects.toThrow(/duplicate key error/)
  })

  it("should fail on negative capacity", async () => {
    await expect(Vehicle.create({
      vehicleId: "VEH-3",
      type: "van",
      temperatureClass: "ambient",
      weightCapacityKg: -10, // Invalid
      volumeCapacityM3: 5,
      fuelType: "diesel",
      kmPerL: 10,
      weeklyFuelQuotaL: 50,
      depot: "DEPOT-1",
    })).rejects.toThrow(mongoose.Error.ValidationError)
  })
})
