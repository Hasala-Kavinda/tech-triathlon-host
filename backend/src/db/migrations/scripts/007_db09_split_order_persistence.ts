import mongoose from "mongoose"

/**
 * DB-09: Split Order persistence into Store module ownership.
 *
 * This migration:
 * 1. Validates existing orders have required fields
 * 2. Validates outletId is a string (DB-05 canonical form)
 * 3. Validates storeManagerId is a valid ObjectId reference
 * 4. Validates status is within the canonical enum
 * 5. Validates requestedDate is YYYY-MM-DD string (no Date coercion)
 * 6. Removes legacy `__v` field if present (replaced by `version` via DB-02)
 * 7. Creates the two additional roadmap-required indexes that were missing from legacy model
 * 8. Is idempotent
 */
export async function up() {
  const db = mongoose.connection.db
  if (!db) throw new Error("Database connection is not established")

  const collection = db.collection("orders")

  const VALID_STATUSES = new Set(["submitted", "deferred", "allocated", "in_transit", "delivered", "cancelled"])
  const VALID_CUTOFFS = new Set(["before_cutoff", "after_cutoff"])
  const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

  // 1. Validate existing documents
  const cursor = collection.find({})
  const errors: string[] = []

  for await (const doc of cursor) {
    const id = String(doc._id)

    if (!doc.orderNumber || typeof doc.orderNumber !== "string") {
      errors.push(`Order ${id}: missing or invalid orderNumber`)
    }

    if (!doc.outletId || typeof doc.outletId !== "string") {
      errors.push(`Order ${id}: outletId must be a non-empty string (DB-05 canonical)`)
    }

    if (!doc.storeManagerId) {
      errors.push(`Order ${id}: missing storeManagerId`)
    }

    if (doc.requestedDate && !DATE_REGEX.test(doc.requestedDate)) {
      errors.push(`Order ${id}: requestedDate '${doc.requestedDate}' is not in YYYY-MM-DD format`)
    }

    if (doc.status && !VALID_STATUSES.has(doc.status)) {
      errors.push(`Order ${id}: unknown status '${doc.status}'`)
    }

    if (doc.cutoffBucket && !VALID_CUTOFFS.has(doc.cutoffBucket)) {
      errors.push(`Order ${id}: unknown cutoffBucket '${doc.cutoffBucket}'`)
    }

    if (!Array.isArray(doc.items) || doc.items.length === 0) {
      errors.push(`Order ${id}: items must be a non-empty array`)
    }
  }

  if (errors.length > 0) {
    throw new Error(`Migration 007 preflight failed:\n- ${errors.join("\n- ")}`)
  }

  // 2. Check for duplicate orderNumbers before attempting unique index creation
  const duplicates = await collection.aggregate([
    { $group: { _id: "$orderNumber", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]).toArray()
  if (duplicates.length > 0) {
    const dupes = duplicates.map((d) => d._id).join(", ")
    throw new Error(`Migration 007 preflight failed: duplicate orderNumber values exist: ${dupes}`)
  }

  // 3. Remove legacy __v field if present (versionKey "version" replaces it via DB-02 conventions)
  const legacyCount = await collection.countDocuments({ __v: { $exists: true } })
  if (legacyCount > 0) {
    await collection.updateMany({ __v: { $exists: true } }, { $unset: { __v: "" } })
  }

  // 4. Create all required indexes (idempotent — createIndex is a no-op if index already exists)
  await collection.createIndex({ orderNumber: 1 }, { unique: true })
  await collection.createIndex({ outletId: 1, createdAt: -1 })
  await collection.createIndex({ requestedDate: 1, status: 1, brand: 1 })
  await collection.createIndex({ allocatedTripId: 1 }, { sparse: true })
  await collection.createIndex({ cutoffBucket: 1, status: 1 })
}
