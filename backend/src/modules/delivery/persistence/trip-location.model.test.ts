import { describe, it, expect } from "vitest"
import mongoose from "mongoose"
import { TripLocation } from "./trip-location.model.js"

describe("TripLocation Model", () => {
  const validPoint = {
    pointId: new mongoose.Types.ObjectId().toString(),
    tripId: new mongoose.Types.ObjectId(),
    driverId: new mongoose.Types.ObjectId(),
    vehicleId: "V1",
    location: { type: "Point" as const, coordinates: [-122.4194, 37.7749] as [number, number] },
    accuracy: 10,
    recordedAt: new Date(),
    receivedAt: new Date()
  }

  it("should create a valid TripLocation", () => {
    const doc = new TripLocation(validPoint)
    const err = doc.validateSync()
    expect(err).toBeUndefined()
  })

  it("should require pointId, tripId, driverId, vehicleId, location, accuracy, recordedAt", () => {
    const doc = new TripLocation({})
    const err = doc.validateSync()
    expect(err?.errors.pointId).toBeDefined()
    expect(err?.errors.tripId).toBeDefined()
    expect(err?.errors.driverId).toBeDefined()
    expect(err?.errors.vehicleId).toBeDefined()
    expect(err?.errors.location).toBeDefined()
    expect(err?.errors.accuracy).toBeDefined()
    expect(err?.errors.recordedAt).toBeDefined()
  })

  it("should reject invalid latitude (> 90)", () => {
    const doc = new TripLocation({ ...validPoint, location: { type: "Point", coordinates: [-122.4194, 91] } })
    const err = doc.validateSync()
    expect(err?.errors["location.coordinates"]).toBeDefined()
  })

  it("should reject invalid longitude (< -180)", () => {
    const doc = new TripLocation({ ...validPoint, location: { type: "Point", coordinates: [-181, 37.7749] } })
    const err = doc.validateSync()
    expect(err?.errors["location.coordinates"]).toBeDefined()
  })
})
