import mongoose from "mongoose"

export async function up() {
  const db = mongoose.connection.db
  if (!db) throw new Error("Database not connected")
  
  const handoffsCollection = db.collection("authhandoffs")

  // 1. Preflight Validation: Detect Missing/Invalid Required Fields
  const invalidDocs = await handoffsCollection.find({
    $or: [
      { codeHash: { $not: { $type: "string" } } },
      { codeHash: { $regex: /^\s*$/ } },
      { userId: { $exists: false } },
      { userId: null },
      { intendedOrigin: { $not: { $type: "string" } } },
      { intendedOrigin: { $regex: /^\s*$/ } },
      { expiresAt: { $not: { $type: "date" } } }
    ]
  }, { projection: { _id: 1 } }).toArray()

  if (invalidDocs.length > 0) {
    const ids = invalidDocs.map(d => d._id.toString()).join(", ")
    throw new Error(`Migration blocked: AuthHandoffs missing required fields detected: ${ids}`)
  }

  // 2. Detect Duplicate codeHash
  const duplicates = await handoffsCollection.aggregate([
    { $group: { _id: "$codeHash", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 }, _id: { $ne: null } } }
  ]).toArray()

  if (duplicates.length > 0) {
    const dupes = duplicates.map(d => d._id).join(", ")
    throw new Error(`Migration blocked: Duplicate AuthHandoff codeHashes detected: ${dupes}`)
  }

  // 3. Reconcile Indexes safely
  await handoffsCollection.createIndex({ codeHash: 1 }, { unique: true, name: "codeHash_1", background: true })
  await handoffsCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "expiresAt_1", background: true })
  await handoffsCollection.createIndex({ userId: 1, createdAt: -1 }, { name: "userId_1_createdAt_-1", background: true })
}
