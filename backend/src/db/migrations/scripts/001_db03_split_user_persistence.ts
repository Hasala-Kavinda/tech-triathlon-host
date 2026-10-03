import mongoose from "mongoose"

export async function up() {
  const db = mongoose.connection.db
  if (!db) throw new Error("Database not connected")
  
  const usersCollection = db.collection("users")

  // 0. Preflight Validation: Detect Missing/Invalid Identity Fields
  const invalidEmails = await usersCollection.find({
    $or: [
      { email: { $not: { $type: "string" } } },
      { email: { $regex: /^\s*$/ } }
    ]
  }, { projection: { _id: 1 } }).toArray()

  if (invalidEmails.length > 0) {
    const ids = invalidEmails.map(d => d._id.toString()).join(", ")
    throw new Error(`Migration blocked: Users missing required 'email' field detected: ${ids}`)
  }

  const invalidEmpIds = await usersCollection.find({
    $or: [
      { employeeId: { $not: { $type: "string" } } },
      { employeeId: { $regex: /^\s*$/ } }
    ]
  }, { projection: { _id: 1 } }).toArray()

  if (invalidEmpIds.length > 0) {
    const ids = invalidEmpIds.map(d => d._id.toString()).join(", ")
    throw new Error(`Migration blocked: Users missing required 'employeeId' field detected: ${ids}`)
  }

  // 1. Detect Duplicate Normalized Emails
  const emailDuplicates = await usersCollection.aggregate([
    { $project: { normalizedEmail: { $toLower: { $trim: { input: "$email" } } } } },
    { $group: { _id: "$normalizedEmail", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 }, _id: { $ne: null } } }
  ]).toArray()

  if (emailDuplicates.length > 0) {
    const dupes = emailDuplicates.map(d => d._id).join(", ")
    throw new Error(`Migration blocked: Duplicate normalized emails detected: ${dupes}`)
  }

  // 2. Detect Duplicate Normalized Employee IDs
  const empIdDuplicates = await usersCollection.aggregate([
    { $project: { normalizedEmp: { $toUpper: { $trim: { input: "$employeeId" } } } } },
    { $group: { _id: "$normalizedEmp", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 }, _id: { $ne: null } } }
  ]).toArray()

  if (empIdDuplicates.length > 0) {
    const dupes = empIdDuplicates.map(d => d._id).join(", ")
    throw new Error(`Migration blocked: Duplicate normalized employee IDs detected: ${dupes}`)
  }

  // 3. Normalize existing data safely in-place
  const usersCursor = usersCollection.find({})
  const bulkOps = []
  
  for await (const user of usersCursor) {
    const updates: any = {}
    
    if (typeof user.email === 'string') {
      const normalizedEmail = user.email.trim().toLowerCase()
      if (user.email !== normalizedEmail) updates.email = normalizedEmail
    }
    
    if (typeof user.employeeId === 'string') {
      const normalizedEmp = user.employeeId.trim().toUpperCase()
      if (user.employeeId !== normalizedEmp) updates.employeeId = normalizedEmp
    }
    
    if (Object.keys(updates).length > 0) {
      bulkOps.push({
        updateOne: {
          filter: { _id: user._id },
          update: { $set: updates }
        }
      })
    }
  }

  if (bulkOps.length > 0) {
    await usersCollection.bulkWrite(bulkOps)
  }

  // 4. Reconcile Indexes safely
  // Create required DB-03 indexes using background: true for safety (though not strictly necessary for tiny collections)
  await usersCollection.createIndex({ employeeId: 1 }, { unique: true, name: "employeeId_1", background: true })
  await usersCollection.createIndex({ email: 1 }, { unique: true, name: "email_1", background: true })
  await usersCollection.createIndex({ role: 1, active: 1 }, { name: "role_1_active_1", background: true })
  
  // Note: we do not blindly drop other indexes (e.g. email_1_role_1) here without a specific reason, 
  // as other parts of the system might still use them. Mongoose will manage them on restart via User.syncIndexes() anyway.
}
