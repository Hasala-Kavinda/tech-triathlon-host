import { ObjectId } from "mongodb"
import mongoose from "mongoose"

/**
 * DB-10: Stable embedded TripStop identity
 *
 * Problem:
 *   TripStop.stopId was generated as "STOP-${index+1}" — array-position-dependent.
 *   There was no stable ObjectId on embedded stops.
 *
 * Solution:
 *   1. Assign tripStopId (ObjectId) to every embedded stop that lacks one (idempotent).
 *   2. Ensure orderIds[] mirrors orderId for all existing stops that lack it (idempotent).
 *   3. Verify required fields (orderId, outletId, sequence) for all existing stops.
 *   4. Create no separate collection — TripStop remains embedded inside Trip.
 *
 * Invariants:
 *   - Already-migrated stops (tripStopId present) are NOT modified.
 *   - Running this migration twice is safe: second run is a no-op.
 *   - Route ordering (sequence) is preserved unchanged.
 *   - Legacy stopId string is preserved for DeliveryRecord backward compat.
 */
export async function up() {
  const db = mongoose.connection.db
  if (!db) throw new Error("Database is not connected")

  const trips = db.collection("trips")

  // 1. Preflight: verify every stop has required fields before mutating
  const cursor = trips.find({ "stops.0": { $exists: true } })
  const errors: string[] = []
  for await (const trip of cursor) {
    const ObjectStops = (trip.stops ?? []) as Array<Record<string, unknown> | undefined>
    for (let i = 0; i < ObjectStops.length; i++) {
      const stop = ObjectStops[i]
      if (!stop) continue
      if (!stop.orderId) errors.push(`Trip ${trip._id} stop[${i}] is missing orderId`)
      if (!stop.outletId) errors.push(`Trip ${trip._id} stop[${i}] is missing outletId`)
      if (stop.sequence === null || stop.sequence === undefined) errors.push(`Trip ${trip._id} stop[${i}] is missing sequence`)
    }
    if (errors.length >= 10) break // fail fast
  }
  if (errors.length > 0) {
    throw new Error(`Migration 008 preflight failed:\n- ${errors.join("\n- ")}`)
  }

  // 2. Assign tripStopId and populate orderIds[] for stops that lack them (idempotent)
  //    We use arrayFilters to update only elements without tripStopId.
  //    We process in batches to avoid holding large cursor.
  const tripsCursor = trips.find({ "stops": { $elemMatch: { tripStopId: { $exists: false } } }, "stops.0": { $exists: true } })

  let migratedTrips = 0
  let migratedStops = 0

  for await (const trip of tripsCursor) {
    const stops = (trip.stops ?? []) as Array<Record<string, unknown>>
    const newStops = stops.map((stop) => {
      // If this stop already has tripStopId, preserve it exactly
      if (stop.tripStopId) return stop
      // Assign a new stable ObjectId
      const tripStopId = new ObjectId()
      // Populate orderIds from existing orderId if absent
      const orderIds = (stop.orderIds && Array.isArray(stop.orderIds) && stop.orderIds.length > 0)
        ? stop.orderIds
        : [stop.orderId]
      return { ...stop, tripStopId, orderIds }
    })

    const migratedCount = stops.filter((s) => !s.tripStopId).length
    if (migratedCount === 0) continue // all already migrated

    await trips.updateOne(
      { _id: trip._id },
      { $set: { stops: newStops } },
    )
    migratedTrips++
    migratedStops += migratedCount
  }

  // 3. Create indexes on the trips collection for stop-level lookups
  //    (idempotent — createIndex is a no-op if already exists)
  await trips.createIndex({ serviceDate: 1, vehicleId: 1, status: 1 })
  await trips.createIndex({ driverId: 1, serviceDate: 1 })

  console.info(JSON.stringify({
    event: "migration_008_db10_complete",
    migratedTrips,
    migratedStops,
  }))
}
