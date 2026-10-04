import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import { loadConfig } from "../../../config/env.js"
import { connectDatabase, disconnectDatabase } from "../../../db/connection.js"
import { Product } from "./product.model.js"

const config = loadConfig()

describe("DB-06: Product Persistence", () => {
  beforeAll(async () => {
    await connectDatabase(config.mongodbUri)
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  beforeEach(async () => {
    await Product.deleteMany({})
    await Product.syncIndexes()
  })

  it("1. Required fields and strict schema", async () => {
    // Missing fields should fail
    await expect(Product.create({ sku: "SKU1" })).rejects.toThrow(/validation failed/)
    
    // Successful creation
    const doc = await Product.create({
      sku: " sku1 ",
      name: " Name 1 ",
      brand: "Brand A",
      orderTypes: ["type_a"],
      unit: "box",
      weightKg: 10.5,
      volumeM3: 0.2,
      temperatureClass: "ambient",
      source: "EXPLICIT_DEMO_FIXTURE_NOT_CSC",
    })
    
    // sku and name are normalized
    expect(doc.sku).toBe("SKU1")
    expect(doc.name).toBe("Name 1")
    
    // Others aren't normalized
    expect(doc.brand).toBe("Brand A")
    
    expect(doc.active).toBe(true) // default
    expect(doc.fragile).toBe(false) // default
  })

  it("2. Negative planning attributes fail validation", async () => {
    await expect(Product.create({
      sku: "SKU2",
      name: "Name 2",
      brand: "Brand A",
      orderTypes: ["type_a"],
      unit: "box",
      weightKg: -1, // Negative weight
      volumeM3: 0.2,
      temperatureClass: "ambient",
      source: "test",
    })).rejects.toThrow(/weightKg/)
    
    await expect(Product.create({
      sku: "SKU3",
      name: "Name 3",
      brand: "Brand A",
      orderTypes: ["type_a"],
      unit: "box",
      weightKg: 1,
      volumeM3: -0.2, // Negative volume
      temperatureClass: "ambient",
      source: "test",
    })).rejects.toThrow(/volumeM3/)
  })

  it("3. Business-key uniqueness required", async () => {
    await Product.create({
      sku: "SKU4", name: "Name 4", brand: "B", orderTypes: ["O"], unit: "U", weightKg: 1, volumeM3: 1, temperatureClass: "T", source: "S"
    })
    
    await expect(Product.create({
      sku: "sku4", name: "Name 5", brand: "B", orderTypes: ["O"], unit: "U", weightKg: 1, volumeM3: 1, temperatureClass: "T", source: "S"
    })).rejects.toThrow(/E11000 duplicate key/)
  })
})
