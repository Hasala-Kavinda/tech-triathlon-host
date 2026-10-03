import mongoose, { type ClientSession } from "mongoose"
import { Trip } from "../../../database/models/index.js"

export const id = "010_db12_load_record_persistence"

export async function up(session: ClientSession): Promise<void> {
  const loadRecords = await mongoose.connection.collection("loadrecords").find({}).toArray()

  for (const record of loadRecords) {
    let changed = false
    const updates: any = {}

    // Find parent trip
    const trip = await Trip.findById(record.tripId).lean().session(session)
    if (!trip) {
      throw new Error(`Migration blocked: LoadRecord ${record._id} references missing trip ${record.tripId}`)
    }

    const newItems = []
    
    for (const item of record.items) {
      const newItem = { ...item }

      // Map stopId -> tripStopId
      if (item.stopId && !item.tripStopId) {
        const matchingStops = trip.stops.filter((s: any) => s.stopId === item.stopId)
        if (matchingStops.length !== 1) {
          throw new Error(`Migration blocked: LoadRecord ${record._id} item ${item.itemId} has ambiguous or missing legacy stopId ${item.stopId}`)
        }
        newItem.tripStopId = matchingStops[0]!.tripStopId
        
        if (item.orderId && !item.orderIds) {
          newItem.orderIds = [item.orderId]
        } else if (!item.orderIds) {
           newItem.orderIds = matchingStops[0]!.orderIds // fallback to all orders at that stop
        }
        
        delete newItem.stopId
        delete newItem.orderId
        changed = true
      }
      
      // Enforce exception type
      if (newItem.exception && (!newItem.exception.type || !newItem.exception.reasonCode)) {
        throw new Error(`Migration blocked: LoadRecord ${record._id} item ${item.itemId} has untyped/mixed exception. Cannot safely migrate.`)
      }

      // Compute varianceQuantity
      if (typeof newItem.varianceQuantity !== "number") {
        newItem.varianceQuantity = (newItem.loadedQuantity || 0) - (newItem.expectedQuantity || 0)
        changed = true
      }

      newItems.push(newItem)
    }

    if (changed) {
      updates.items = newItems
      await mongoose.connection.collection("loadrecords").updateOne({ _id: record._id }, { $set: updates }, { session })
    }
  }
}
