import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import { loadConfig } from "../../../config/env.js"
import { connectDatabase, disconnectDatabase } from "../../connection.js"
import mongoose from "mongoose"
import { up } from "./002_db04_split_authhandoff_persistence.js"

const config = loadConfig()

describe("DB-04 Migration: 002_db04_split_authhandoff_persistence", () => {
  let db: mongoose.mongo.Db
  let handoffs: mongoose.mongo.Collection

  beforeAll(async () => {
    await connectDatabase(config.mongodbUri)
    db = mongoose.connection.db!
    handoffs = db.collection("authhandoffs")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  beforeEach(async () => {
    await handoffs.deleteMany({})
    await handoffs.dropIndexes().catch(() => {}) // drop all indexes except _id
  })

  it("A. Fresh database executes successfully", async () => {
    await expect(up()).resolves.toBeUndefined()
  })

  it("B, C. Preflight fails on missing required fields", async () => {
    await handoffs.insertOne({ userId: new mongoose.Types.ObjectId(), intendedOrigin: "https://test", expiresAt: new Date() })
    await expect(up()).rejects.toThrow(/AuthHandoffs missing required fields detected/)
    await handoffs.deleteMany({})

    await handoffs.insertOne({ codeHash: "hash1", intendedOrigin: "https://test", expiresAt: new Date() })
    await expect(up()).rejects.toThrow(/AuthHandoffs missing required fields detected/)
    await handoffs.deleteMany({})

    await handoffs.insertOne({ codeHash: "hash1", userId: new mongoose.Types.ObjectId(), expiresAt: new Date() })
    await expect(up()).rejects.toThrow(/AuthHandoffs missing required fields detected/)
    await handoffs.deleteMany({})
  })

  it("D. Duplicate codeHash fails and prevents index creation", async () => {
    await handoffs.insertMany([
      { codeHash: "conflict123", userId: new mongoose.Types.ObjectId(), intendedOrigin: "app1", expiresAt: new Date() },
      { codeHash: "conflict123", userId: new mongoose.Types.ObjectId(), intendedOrigin: "app2", expiresAt: new Date() },
    ])

    await expect(up()).rejects.toThrow(/Duplicate AuthHandoff codeHashes detected/)
  })

  it("E. Idempotency: Running twice produces no additional changes", async () => {
    await handoffs.insertOne({ codeHash: "valid1", userId: new mongoose.Types.ObjectId(), intendedOrigin: "app1", expiresAt: new Date() })
    
    await up() // first run
    await up() // second run
    const count = await handoffs.countDocuments()
    expect(count).toBe(1)
  })

  it("F. Index reconciliation installs DB-04 required indexes", async () => {
    await handoffs.insertOne({ codeHash: "idx1", userId: new mongoose.Types.ObjectId(), intendedOrigin: "app1", expiresAt: new Date(), createdAt: new Date() })
    
    await up()

    const indexes = await handoffs.indexes()
    expect(indexes.find(i => i.name === "codeHash_1")?.unique).toBe(true)
    expect(indexes.find(i => i.name === "expiresAt_1")?.expireAfterSeconds).toBe(0)
    expect(indexes.find(i => i.name === "userId_1_createdAt_-1")).toBeDefined()
  })
})
