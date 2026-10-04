import mongoose from "mongoose"

export async function connectDatabase(uri: string) {
  if (mongoose.connection.readyState === 1) return
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 })
  await mongoose.syncIndexes()
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect()
}

export function databaseReady() {
  return mongoose.connection.readyState === 1
}
