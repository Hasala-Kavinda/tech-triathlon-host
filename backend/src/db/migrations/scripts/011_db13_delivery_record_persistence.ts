import mongoose from "mongoose"

export async function up(connection: mongoose.Connection) {
  const collection = connection.collection("delivery_records")
  // Find records that don't have tripStopId yet (legacy records)
  const records = await collection.find({ tripStopId: { $exists: false } }).toArray()

  if (records.length === 0) return

  const tripIds = [...new Set(records.map(r => r.tripId))]
  const trips = await connection.collection("trips").find({ _id: { $in: tripIds } }).toArray()
  const tripMap = new Map(trips.map(t => [String(t._id), t]))

  const bulkOps = []

  for (const record of records) {
    const trip = tripMap.get(String(record.tripId))
    if (!trip) throw new Error(`Trip ${record.tripId} not found for legacy delivery record ${record._id}`)

    const matchingStops = trip.stops.filter((s: any) => String(s.stopId) === String(record.stopId))
    if (matchingStops.length === 0) {
      throw new Error(`Could not map legacy stopId ${record.stopId} in trip ${record.tripId} to a tripStopId.`)
    }
    if (matchingStops.length > 1) {
      throw new Error(`Ambiguous mapping: found ${matchingStops.length} canonical TripStops for legacy stopId ${record.stopId} in trip ${record.tripId}.`)
    }
    const stop = matchingStops[0]

    let canonicalStatus = "pending"
    let proofStatus = "none"

    if (record.status === "planned") {
      canonicalStatus = "pending"
    } else if (record.status === "arrived") {
      canonicalStatus = "arrived"
    } else if (record.status === "proof_verified") {
      canonicalStatus = "delivered"
      proofStatus = "verified"
    } else if (record.status === "completed") {
      canonicalStatus = "delivered"
      proofStatus = "verified"
    }

    // Default to the record's orderId if items array is missing/empty
    let mappedItems = record.items?.map((item: any) => ({
      sku: item.sku || "UNKNOWN",
      orderIds: item.orderId ? [item.orderId] : (record.orderId ? [record.orderId] : []),
      expected: item.expected ?? 0,
      delivered: item.delivered ?? 0,
      short: item.short ?? 0,
      damaged: item.damaged ?? 0,
      outcome: item.outcome ?? undefined,
      note: item.note ?? undefined
    })) || []

    if (mappedItems.length === 0 && record.orderId) {
      mappedItems.push({
        sku: "UNKNOWN",
        orderIds: [record.orderId],
        expected: 0,
      })
    }

    bulkOps.push({
      updateOne: {
        filter: { _id: record._id },
        update: {
          $set: {
            tripStopId: stop.tripStopId,
            status: canonicalStatus,
            proof: {
              status: proofStatus,
              enteredAt: record.completedAt || record.updatedAt || new Date()
            },
            items: mappedItems
          },
          $unset: {
            stopId: "",
            orderId: "",
            outcome: ""
          }
        }
      }
    })
  }

  if (bulkOps.length > 0) {
    await collection.bulkWrite(bulkOps)
  }
}
