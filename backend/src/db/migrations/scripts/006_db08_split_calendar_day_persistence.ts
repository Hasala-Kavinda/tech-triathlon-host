import mongoose from "mongoose"

export async function up() {
  const db = mongoose.connection.db
  if (!db) throw new Error("Database connection is not established")

  const collection = db.collection("calendardays")

  // Ensure unique dates and remove duplicates if any exist
  const dates = await collection.aggregate([
    { $group: { _id: "$date", count: { $sum: 1 }, docs: { $push: "$_id" } } },
    { $match: { count: { $gt: 1 } } }
  ]).toArray()

  for (const date of dates) {
    const [keep, ...remove] = date.docs
    if (remove.length > 0) {
      await collection.deleteMany({ _id: { $in: remove } })
    }
  }

  // Create unique index
  await collection.createIndex({ date: 1 }, { unique: true, background: true })

  // Normalize existing documents
  const bulkOps = []
  const cursor = collection.find({})

  for await (const doc of cursor) {
    let changed = false
    const update: any = { $set: {}, $unset: {} }

    // Validate string fields are trimmed
    if (typeof doc.date === "string" && doc.date !== doc.date.trim()) {
      update.$set.date = doc.date.trim()
      changed = true
    }

    if (typeof doc.dayOfWeek === "string" && doc.dayOfWeek !== doc.dayOfWeek.trim()) {
      update.$set.dayOfWeek = doc.dayOfWeek.trim()
      changed = true
    }

    if (doc.version !== undefined) {
      update.$unset.version = ""
      changed = true
    }
    
    // Ensure format matches YYYY-MM-DD
    if (doc.date && !/^\d{4}-\d{2}-\d{2}$/.test(update.$set.date ?? doc.date)) {
      throw new Error(`Migration 006: calendar record has invalid date format: ${doc.date}`)
    }

    if (changed) {
      if (Object.keys(update.$set).length === 0) delete update.$set
      if (Object.keys(update.$unset).length === 0) delete update.$unset
      bulkOps.push({
        updateOne: {
          filter: { _id: doc._id },
          update
        }
      })
    }
  }

  if (bulkOps.length > 0) {
    await collection.bulkWrite(bulkOps)
  }
}
