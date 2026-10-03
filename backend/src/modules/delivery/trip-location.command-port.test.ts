import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest"
import mongoose from "mongoose"
import { TripLocationCommandPort } from "./trip-location.command-port.js"
import { TripLocation } from "./persistence/trip-location.model.js"

describe("TripLocationCommandPort", () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/waylink_test")
  })

  beforeEach(async () => {
    await TripLocation.deleteMany({})
    await TripLocation.syncIndexes()
  })

  afterAll(async () => {
    await mongoose.connection.close()
  })

  it("should securely deduplicate points by pointId during bulk insert", async () => {
    const tripId = new mongoose.Types.ObjectId()
    const driverId = new mongoose.Types.ObjectId()
    
    const point = {
      sequence: 1,
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy: 10,
      recordedAt: new Date(),
    }

    // Insert once
    const res1 = await TripLocationCommandPort.recordLocations(tripId, driverId, "V1", [point])
    expect(res1.acceptedCount).toBe(1)
    expect(res1.duplicateCount).toBe(0)

    // Insert exact same point again (same sequence -> same pointId)
    const res2 = await TripLocationCommandPort.recordLocations(tripId, driverId, "V1", [point])
    expect(res2.acceptedCount).toBe(0)
    expect(res2.duplicateCount).toBe(1)

    // Ensure it didn't create a second record
    const count = await TripLocation.countDocuments()
    expect(count).toBe(1)
  })

  it("should reject duplicates but accept new valid points in the same batch", async () => {
    const tripId = new mongoose.Types.ObjectId()
    const driverId = new mongoose.Types.ObjectId()
    
    const point1 = { sequence: 1, latitude: 10, longitude: 20, accuracy: 5, recordedAt: new Date() }
    const point2 = { sequence: 2, latitude: 11, longitude: 21, accuracy: 5, recordedAt: new Date() }

    await TripLocationCommandPort.recordLocations(tripId, driverId, "V1", [point1])

    const res = await TripLocationCommandPort.recordLocations(tripId, driverId, "V1", [point1, point2])
    expect(res.acceptedCount).toBe(1)
    expect(res.duplicateCount).toBe(1)

    const count = await TripLocation.countDocuments()
    expect(count).toBe(2)
  })

  it("should preserve distinction between recordedAt and receivedAt", async () => {
    const tripId = new mongoose.Types.ObjectId()
    const driverId = new mongoose.Types.ObjectId()
    const recordedAt = new Date("2023-01-01T10:00:00Z")

    await TripLocationCommandPort.recordLocations(tripId, driverId, "V1", [{
      sequence: 1, latitude: 10, longitude: 20, accuracy: 5, recordedAt
    }])

    const doc = await TripLocation.findOne()
    expect(doc?.recordedAt.getTime()).toBe(recordedAt.getTime())
    expect(doc?.receivedAt.getTime()).toBeGreaterThan(recordedAt.getTime())
  })
})
