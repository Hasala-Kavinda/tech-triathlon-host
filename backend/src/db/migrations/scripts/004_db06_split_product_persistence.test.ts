import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import { loadConfig } from "../../../config/env.js"
import { connectDatabase, disconnectDatabase } from "../../connection.js"
import mongoose from "mongoose"
import { up } from "./004_db06_split_product_persistence.js"

const config = loadConfig()

describe("DB-06 Migration: 004_db06_split_product_persistence", () => {
  let db: mongoose.mongo.Db
  let products: mongoose.mongo.Collection

  beforeAll(async () => {
    await connectDatabase(config.mongodbUri)
    db = mongoose.connection.db!
    products = db.collection("products")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  beforeEach(async () => {
    await products.deleteMany({})
    await products.dropIndexes().catch(() => {}) // drop all indexes except _id
  })

  it("1. Fresh database executes successfully", async () => {
    await expect(up()).resolves.toBeUndefined()
  })

  it("2. Preflight fails on missing required fields", async () => {
    await products.insertOne({
      sku: "SKU1",
      brand: "Fresh",
      orderTypes: ["type_a"],
      unit: "box",
      weightKg: 10,
      volumeM3: 0.5,
      temperatureClass: "ambient",
      source: "EXPLICIT_DEMO_FIXTURE_NOT_CSC"
    }) // Missing name

    await expect(up()).rejects.toThrow(/Products missing required fields/)
  })

  it("3. Duplicate business identity detection", async () => {
    await products.insertMany([
      { sku: " SKU1 ", name: "Name", brand: "B", orderTypes: ["O"], unit: "U", weightKg: 1, volumeM3: 1, temperatureClass: "T", source: "S" },
      { sku: "sku1", name: "Name 2", brand: "B", orderTypes: ["O"], unit: "U", weightKg: 1, volumeM3: 1, temperatureClass: "T", source: "S" },
    ])

    await expect(up()).rejects.toThrow(/Duplicate normalized SKUs detected: SKU1/)
  })

  it("4. Idempotency and normalization", async () => {
    await products.insertOne({
      sku: " sku1 ",
      name: " Name 1 ",
      brand: " B ",
      orderTypes: ["O"],
      unit: "U",
      weightKg: 1,
      volumeM3: 1,
      temperatureClass: "T",
      source: "S"
    })
    
    await up() // first run normalizes SKU1 and Name 1
    await up() // second run should be a no-op

    const doc = await products.findOne({ sku: "SKU1" })
    expect(doc).toBeDefined()
    expect(doc!.name).toBe("Name 1")
    expect(doc!.brand).toBe(" B ") // brand is untouched
  })

  it("5. Final index configuration is canonical", async () => {
    await products.insertOne({
      sku: "SKU1", name: "Name 1", brand: "B", orderTypes: ["O"], unit: "U", weightKg: 1, volumeM3: 1, temperatureClass: "T", source: "S"
    })
    
    await up()

    const indexes = await products.indexes()
    
    // Canonical indexes exist
    expect(indexes.find(i => i.name === "sku_1")?.unique).toBe(true)
    expect(indexes.find(i => i.name === "brand_1_active_1_name_1")).toBeDefined()
  })
})
