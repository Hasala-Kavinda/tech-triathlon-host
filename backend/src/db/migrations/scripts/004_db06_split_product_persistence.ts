import mongoose from "mongoose"

export async function up() {
  const db = mongoose.connection.db
  if (!db) throw new Error("Database not connected")
  
  const productsCollection = db.collection("products")

  // 1. Preflight Validation: Detect Missing Required Fields
  const invalidDocs = await productsCollection.find({
    $or: [
      { sku: { $not: { $type: "string" } } },
      { sku: { $regex: /^\s*$/ } },
      { name: { $not: { $type: "string" } } },
      { name: { $regex: /^\s*$/ } },
      { brand: { $not: { $type: "string" } } },
      { brand: { $regex: /^\s*$/ } },
      { orderTypes: { $not: { $type: "array" } } },
      { unit: { $not: { $type: "string" } } },
      { unit: { $regex: /^\s*$/ } },
      { weightKg: { $not: { $type: "number" } } },
      { weightKg: { $lt: 0 } },
      { volumeM3: { $not: { $type: "number" } } },
      { volumeM3: { $lt: 0 } },
      { temperatureClass: { $not: { $type: "string" } } },
      { temperatureClass: { $regex: /^\s*$/ } },
      { source: { $not: { $type: "string" } } },
      { source: { $regex: /^\s*$/ } },
    ]
  }, { projection: { _id: 1, sku: 1 } }).toArray()

  if (invalidDocs.length > 0) {
    const ids = invalidDocs.map(d => d.sku || d._id.toString()).join(", ")
    throw new Error(`Migration blocked: Products missing required fields or having invalid values detected: ${ids}`)
  }

  // 2. Detect Duplicate Normalized SKUs
  const skuDuplicates = await productsCollection.aggregate([
    { $project: { normalizedSku: { $toUpper: { $trim: { input: "$sku" } } } } },
    { $group: { _id: "$normalizedSku", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 }, _id: { $ne: null } } }
  ]).toArray()

  if (skuDuplicates.length > 0) {
    const dupes = skuDuplicates.map(d => d._id).join(", ")
    throw new Error(`Migration blocked: Duplicate normalized SKUs detected: ${dupes}`)
  }

  // 3. Normalize existing data safely in-place (ONLY sku normalization and name trimming based on current behavior)
  const cursor = productsCollection.find({})
  const bulkOps = []
  
  for await (const product of cursor) {
    const updates: any = {}
    
    if (typeof product.sku === 'string') {
      const normalizedSku = product.sku.trim().toUpperCase()
      if (product.sku !== normalizedSku) updates.sku = normalizedSku
    }
    
    if (typeof product.name === 'string' && product.name !== product.name.trim()) updates.name = product.name.trim()

    if (Object.keys(updates).length > 0) {
      bulkOps.push({
        updateOne: {
          filter: { _id: product._id },
          update: { $set: updates }
        }
      })
    }
  }

  if (bulkOps.length > 0) {
    await productsCollection.bulkWrite(bulkOps)
  }

  // 4. Reconcile Indexes safely
  await productsCollection.createIndex({ sku: 1 }, { unique: true, name: "sku_1", background: true })
  await productsCollection.createIndex({ brand: 1, active: 1, name: 1 }, { name: "brand_1_active_1_name_1", background: true })
}
