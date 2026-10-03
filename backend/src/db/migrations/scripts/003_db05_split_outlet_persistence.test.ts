import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import { loadConfig } from "../../../config/env.js"
import { connectDatabase, disconnectDatabase } from "../../connection.js"
import mongoose from "mongoose"
import { up } from "./003_db05_split_outlet_persistence.js"

const config = loadConfig()

describe("DB-05 Migration: 003_db05_split_outlet_persistence", () => {
  let db: mongoose.mongo.Db
  let outlets: mongoose.mongo.Collection

  beforeAll(async () => {
    await connectDatabase(config.mongodbUri)
    db = mongoose.connection.db!
    outlets = db.collection("outlets")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  beforeEach(async () => {
    await outlets.deleteMany({})
    await outlets.dropIndexes().catch(() => {}) // drop all indexes except _id
  })

  it("H. Fresh database executes successfully", async () => {
    await expect(up()).resolves.toBeUndefined()
  })

  it("J. Preflight fails on missing required fields", async () => {
    await outlets.insertOne({
      outletId: "OUT1",
      brand: "Fresh",
      district: "Colombo",
      depot: "DEPOT",
      windowOpenTime: "05:00",
      windowCloseTime: "08:00"
    }) // Missing displayName

    await expect(up()).rejects.toThrow(/Outlets missing required fields detected/)
    await outlets.deleteMany({})
  })

  it("K. Duplicate business identity detection", async () => {
    await outlets.insertMany([
      { outletId: " OUT1 ", displayName: "O1", brand: "B", district: "D", depot: "DEP", windowOpenTime: "05", windowCloseTime: "08" },
      { outletId: "out1", displayName: "O2", brand: "B", district: "D", depot: "DEP", windowOpenTime: "05", windowCloseTime: "08" },
    ])

    await expect(up()).rejects.toThrow(/Duplicate normalized outlet IDs detected: OUT1/)
  })

  it("M. Idempotency and Legacy human-readable preservation", async () => {
    // Insert with spaces in human readable fields
    await outlets.insertOne({ outletId: " out1 ", displayName: " O1 ", brand: " B ", district: " D ", depot: " DEP ", windowOpenTime: " 05 ", windowCloseTime: " 08 " })
    
    await up() // first run normalizes OUT1 and creates indexes
    await up() // second run should be a no-op

    const doc = await outlets.findOne({ outletId: "OUT1" })
    expect(doc).toBeDefined()
    expect(doc!.displayName).toBe(" O1 ") // NOT trimmed
    expect(doc!.brand).toBe(" B ")
    expect(doc!.district).toBe(" D ")
    expect(doc!.depot).toBe(" DEP ")
    expect(doc!.windowOpenTime).toBe(" 05 ")
    expect(doc!.windowCloseTime).toBe(" 08 ")
  })

  it("N, I, J, K. Final index configuration is canonical", async () => {
    // Create the obsolete index first
    await outlets.createIndex({ brand: 1, depot: 1, district: 1 }, { name: "brand_1_depot_1_district_1" })
    
    await outlets.insertOne({ outletId: "OUT1", displayName: "O1", brand: "B", district: "D", depot: "DEP", windowOpenTime: "05", windowCloseTime: "08" })
    
    await up()

    const indexes = await outlets.indexes()
    
    // Canonical indexes exist
    expect(indexes.find(i => i.name === "outletId_1")?.unique).toBe(true)
    expect(indexes.find(i => i.name === "depot_1_brand_1")).toBeDefined()
    expect(indexes.find(i => i.name === "district_1")).toBeDefined()
    
    // Obsolete index removed
    expect(indexes.find(i => i.name === "brand_1_depot_1_district_1")).toBeUndefined()
    
    // No 2dsphere index exists
    expect(indexes.some(i => Object.values(i.key).includes("2dsphere"))).toBe(false)
  })
})
