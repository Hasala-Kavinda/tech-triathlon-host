import mongoose from "mongoose"
import { TripLocation } from "./persistence/trip-location.model.js"
import { randomUUID } from "node:crypto"

export interface RecordLocationInput {
  pointId?: string
  sequence?: number
  latitude: number
  longitude: number
  accuracy: number
  speed?: number | undefined
  heading?: number | undefined
  recordedAt: Date
  source?: string
}

export const TripLocationCommandPort = {
  async recordLocations(tripId: mongoose.Types.ObjectId | string, driverId: mongoose.Types.ObjectId | string, vehicleId: string, points: RecordLocationInput[]) {
    if (points.length === 0) return { acceptedCount: 0, duplicateCount: 0 }
    
    const docs = points.map(p => ({
      pointId: p.pointId ?? `${tripId.toString()}-${p.sequence ?? randomUUID()}`,
      tripId: new mongoose.Types.ObjectId(tripId),
      driverId: new mongoose.Types.ObjectId(driverId),
      vehicleId,
      location: {
        type: "Point" as const,
        coordinates: [p.longitude, p.latitude] as [number, number]
      },
      accuracy: p.accuracy,
      speed: p.speed,
      heading: p.heading,
      recordedAt: p.recordedAt,
      receivedAt: new Date(),
      source: p.source
    }))

    try {
      const result = await TripLocation.insertMany(docs, { ordered: false })
      return { acceptedCount: result.length, duplicateCount: points.length - result.length }
    } catch (err: any) {
      if (err.code === 11000) {
        // console.log("BulkWriteError keys:", Object.keys(err), "insertedCount:", err.insertedCount, "result.nInserted:", err.result?.nInserted)
        const insertedCount = err.insertedCount ?? err.result?.nInserted ?? 0
        return { acceptedCount: insertedCount, duplicateCount: points.length - insertedCount }
      }
      throw err
    }
  }
}
