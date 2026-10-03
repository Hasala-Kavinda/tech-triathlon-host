import mongoose from "mongoose"

export async function up() {
  const db = mongoose.connection.db
  if (!db) throw new Error("Database not connected")
  
  const outletsCollection = db.collection("outlets")

  // 1. Preflight Validation: Detect Missing Required Fields
  const invalidDocs = await outletsCollection.find({
    $or: [
      { outletId: { $not: { $type: "string" } } },
      { outletId: { $regex: /^\s*$/ } },
      { displayName: { $not: { $type: "string" } } },
      { displayName: { $regex: /^\s*$/ } },
      { brand: { $not: { $type: "string" } } },
      { brand: { $regex: /^\s*$/ } },
      { district: { $not: { $type: "string" } } },
      { district: { $regex: /^\s*$/ } },
      { depot: { $not: { $type: "string" } } },
      { depot: { $regex: /^\s*$/ } },
      { windowOpenTime: { $not: { $type: "string" } } },
      { windowOpenTime: { $regex: /^\s*$/ } },
      { windowCloseTime: { $not: { $type: "string" } } },
      { windowCloseTime: { $regex: /^\s*$/ } },
    ]
  }, { projection: { _id: 1, outletId: 1 } }).toArray()

  if (invalidDocs.length > 0) {
    const ids = invalidDocs.map(d => d.outletId || d._id.toString()).join(", ")
    throw new Error(`Migration blocked: Outlets missing required fields detected: ${ids}`)
  }

  // 2. Detect Duplicate Normalized Outlet IDs
  const idDuplicates = await outletsCollection.aggregate([
    { $project: { normalizedId: { $toUpper: { $trim: { input: "$outletId" } } } } },
    { $group: { _id: "$normalizedId", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 }, _id: { $ne: null } } }
  ]).toArray()

  if (idDuplicates.length > 0) {
    const dupes = idDuplicates.map(d => d._id).join(", ")
    throw new Error(`Migration blocked: Duplicate normalized outlet IDs detected: ${dupes}`)
  }

  // 3. Normalize existing data safely in-place
  const cursor = outletsCollection.find({})
  const bulkOps = []
  
  for await (const outlet of cursor) {
    const updates: any = {}
    
    if (typeof outlet.outletId === 'string') {
      const normalizedId = outlet.outletId.trim().toUpperCase()
      if (outlet.outletId !== normalizedId) updates.outletId = normalizedId
    }
    
    if (Object.keys(updates).length > 0) {
      bulkOps.push({
        updateOne: {
          filter: { _id: outlet._id },
          update: { $set: updates }
        }
      })
    }
  }

  if (bulkOps.length > 0) {
    await outletsCollection.bulkWrite(bulkOps)
  }

  // 4. Reconcile Indexes safely
  await outletsCollection.createIndex({ outletId: 1 }, { unique: true, name: "outletId_1", background: true })
  await outletsCollection.createIndex({ depot: 1, brand: 1 }, { name: "depot_1_brand_1", background: true })
  await outletsCollection.createIndex({ district: 1 }, { name: "district_1", background: true })

  try {
    await outletsCollection.dropIndex("brand_1_depot_1_district_1")
  } catch (err: any) {
    // Ignore if it doesn't exist
    if (err.codeName !== "IndexNotFound") throw err
  }
}
