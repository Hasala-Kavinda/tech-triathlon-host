import mongoose, { type ClientSession } from "mongoose"
import { Trip } from "../../../database/models/index.js"

export const id = "009_db11_trip_persistence"

export async function up(session: ClientSession): Promise<void> {
  const trips = await mongoose.connection.collection("trips").find({}).sort({ vehicleId: 1, serviceDate: 1, routeIndex: 1, departureAt: 1 }).toArray()

  const groups = new Map<string, any[]>()
  for (const trip of trips) {
    const key = `${trip.vehicleId}_${trip.serviceDate}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(trip)
  }

  for (const [key, group] of groups.entries()) {
    if (group.length > 2) {
      throw new Error(`Migration blocked: Vehicle ${group[0].vehicleId} on ${group[0].serviceDate} has more than 2 trips, which violates the maximum-two-route rule. Resolve data ambiguity manually before migrating.`)
    }

    let currentIndex = 1
    for (const trip of group) {
      const updates: any = {}

      if (!trip.totals) {
        updates.totals = {
          distanceKm: trip.distanceKm || 0,
          weightKg: 0,
          volumeM3: 0,
          fuelLitres: 0,
        }
      } else if (trip.totals.distanceKm !== trip.distanceKm) {
        updates["totals.distanceKm"] = trip.distanceKm
      }

      const assignedRouteIndex = trip.routeIndex ?? currentIndex
      if (trip.routeIndex !== assignedRouteIndex) {
        updates.routeIndex = assignedRouteIndex
      }

      if (Object.keys(updates).length > 0) {
        await mongoose.connection.collection("trips").updateOne({ _id: trip._id }, { $set: updates }, { session })
      }
      currentIndex = assignedRouteIndex + 1
    }
  }
}
