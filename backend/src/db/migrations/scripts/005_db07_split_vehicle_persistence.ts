import mongoose from "mongoose"

export async function up() {
  const db = mongoose.connection.db
  if (!db) throw new Error("Database not connected")
  
  const vehiclesCollection = db.collection("vehicles")

  // 1. Preflight Validation: Detect Missing Required Fields or Invalid Values
  const invalidDocs = await vehiclesCollection.find({
    $or: [
      { vehicleId: { $not: { $type: "string" } } },
      { vehicleId: { $regex: /^\s*$/ } },
      { type: { $not: { $type: "string" } } },
      { type: { $regex: /^\s*$/ } },
      { temperatureClass: { $not: { $type: "string" } } },
      { temperatureClass: { $regex: /^\s*$/ } },
      { fuelType: { $not: { $type: "string" } } },
      { fuelType: { $regex: /^\s*$/ } },
      { depot: { $not: { $type: "string" } } },
      { depot: { $regex: /^\s*$/ } },
      { weightCapacityKg: { $not: { $type: "number" } } },
      { weightCapacityKg: { $lte: 0 } }, // Preflight explicitly validated > 0
      { volumeCapacityM3: { $not: { $type: "number" } } },
      { volumeCapacityM3: { $lte: 0 } }, // Preflight explicitly validated > 0
      { kmPerL: { $not: { $type: "number" } } },
      { kmPerL: { $lt: 0.01 } },
      { weeklyFuelQuotaL: { $not: { $type: "number" } } },
      { weeklyFuelQuotaL: { $lt: 0 } },
    ]
  }, { projection: { _id: 1, vehicleId: 1 } }).toArray()

  if (invalidDocs.length > 0) {
    const ids = invalidDocs.map(d => d.vehicleId || d._id.toString()).join(", ")
    throw new Error(`Migration blocked: Vehicles missing required fields or having invalid values detected: ${ids}`)
  }

  // 2. Detect Duplicate Normalized vehicleIds
  const duplicates = await vehiclesCollection.aggregate([
    { $project: { normalizedVehicleId: { $toUpper: { $trim: { input: "$vehicleId" } } } } },
    { $group: { _id: "$normalizedVehicleId", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 }, _id: { $ne: null } } }
  ]).toArray()

  if (duplicates.length > 0) {
    const dupes = duplicates.map(d => d._id).join(", ")
    throw new Error(`Migration blocked: Duplicate normalized vehicleIds detected: ${dupes}`)
  }

  // 3. Normalize existing data safely in-place (ONLY vehicleId trimming based on typical business keys, though not explicitly in schema previously, it's safe to trim/uppercase if we matched existing)
  // Wait, did the legacy schema have trim/uppercase?
  // No, legacy `vehicleId: { type: String, required: true, unique: true }`.
  // Preflight: `const value = row[column]?.trim().toUpperCase()` -> it enforces uniqueness on trimmed/uppercased.
  // We will normalize it to match preflight logic.
  const cursor = vehiclesCollection.find({})
  const bulkOps = []
  
  for await (const vehicle of cursor) {
    const updates: any = {}
    
    if (typeof vehicle.vehicleId === 'string') {
      const normalizedVehicleId = vehicle.vehicleId.trim().toUpperCase()
      if (vehicle.vehicleId !== normalizedVehicleId) updates.vehicleId = normalizedVehicleId
    }
    
    if (Object.keys(updates).length > 0) {
      bulkOps.push({
        updateOne: {
          filter: { _id: vehicle._id },
          update: { $set: updates }
        }
      })
    }
  }

  if (bulkOps.length > 0) {
    await vehiclesCollection.bulkWrite(bulkOps)
  }

  // 4. Reconcile Indexes safely
  await vehiclesCollection.createIndex({ vehicleId: 1 }, { unique: true, name: "vehicleId_1", background: true })
  await vehiclesCollection.createIndex({ depot: 1, type: 1, temperatureClass: 1, active: 1 }, { name: "depot_1_type_1_temperatureClass_1_active_1", background: true })
}
