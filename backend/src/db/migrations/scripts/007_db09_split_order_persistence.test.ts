import { describe, it, expect, beforeEach, afterAll, beforeAll } from "vitest"
import mongoose from "mongoose"
import { connectDatabase, disconnectDatabase } from "../../connection.js"
import { loadConfig } from "../../../config/env.js"
import { up } from "./007_db09_split_order_persistence.js"

describe("Migration: 007_db09_split_order_persistence", () => {
  beforeAll(async () => {
    const config = loadConfig()
    await connectDatabase(config.mongodbUri)
  })

  beforeEach(async () => {
    const db = mongoose.connection.db
    if (!db) throw new Error("DB not connected")
    await db.collection("orders").deleteMany({})
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  let seq = 0
  const validOrder = () => ({
    orderNumber: `ORD-MIGTEST-${++seq}`,
    outletId: "OUT001",
    storeManagerId: new mongoose.Types.ObjectId(),
    brand: "Fresh",
    orderType: "dry",
    requestedDate: "2026-10-02",
    cutoffBucket: "before_cutoff",
    status: "submitted",
    items: [{
      productId: new mongoose.Types.ObjectId(),
      sku: "DEMO-001",
      name: "Test Product",
      unit: "unit",
      quantity: 2,
      unitWeightKg: 1.0,
      unitVolumeM3: 0.01,
      temperatureClass: "ambient",
      fragile: false,
    }],
    totalWeightKg: 2.0,
    totalVolumeM3: 0.02,
    statusHistory: [{ status: "submitted", at: new Date() }],
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  it("should create all required indexes", async () => {
    const db = mongoose.connection.db!
    await db.collection("orders").insertOne(validOrder())
    await up()
    const indexes = await db.collection("orders").indexes()
    const keys = indexes.map(i => JSON.stringify(Object.keys(i.key)))
    expect(keys).toContain(JSON.stringify(["orderNumber"]))
    expect(keys).toContain(JSON.stringify(["outletId", "createdAt"]))
    expect(keys).toContain(JSON.stringify(["requestedDate", "status", "brand"]))
    expect(keys).toContain(JSON.stringify(["allocatedTripId"]))
    expect(keys).toContain(JSON.stringify(["cutoffBucket", "status"]))
  })

  it("should enforce unique orderNumber index", async () => {
    const db = mongoose.connection.db!
    const order = validOrder()
    // Drop all indexes so raw inserts with duplicate orderNumber can succeed
    await db.collection("orders").dropIndexes()
    await db.collection("orders").insertMany([order, { ...order, _id: new mongoose.Types.ObjectId() }])
    // up() must detect the duplicate via preflight aggregate check
    await expect(up()).rejects.toThrow(/duplicate orderNumber/)
  })

  it("should fail on invalid requestedDate format", async () => {
    const db = mongoose.connection.db!
    await db.collection("orders").insertOne({ ...validOrder(), requestedDate: "02/10/2026" })
    await expect(up()).rejects.toThrow(/YYYY-MM-DD format/)
  })

  it("should fail on invalid status value", async () => {
    const db = mongoose.connection.db!
    await db.collection("orders").insertOne({ ...validOrder(), status: "pending_approval" })
    await expect(up()).rejects.toThrow(/unknown status/)
  })

  it("should fail on missing outletId", async () => {
    const db = mongoose.connection.db!
    await db.collection("orders").insertOne({ ...validOrder(), outletId: "" })
    await expect(up()).rejects.toThrow(/outletId/)
  })

  it("should remove legacy __v field", async () => {
    const db = mongoose.connection.db!
    const order = validOrder()
    await db.collection("orders").insertOne({ ...order, __v: 0 })
    await up()
    const doc = await db.collection("orders").findOne({})
    expect(doc?.__v).toBeUndefined()
  })

  it("should succeed and be idempotent on empty collection", async () => {
    await up()
    await up()
    const db = mongoose.connection.db!
    const count = await db.collection("orders").countDocuments()
    expect(count).toBe(0)
  })

  it("should succeed on valid existing orders and preserve all fields", async () => {
    const db = mongoose.connection.db!
    const order = validOrder()
    await db.collection("orders").insertOne(order)
    await up()
    const doc = await db.collection("orders").findOne({ orderNumber: order.orderNumber })
    expect(doc?.outletId).toBe(order.outletId)
    expect(doc?.brand).toBe(order.brand)
    expect(doc?.items).toHaveLength(1)
    expect(doc?.items[0].sku).toBe("DEMO-001")
    expect(doc?.statusHistory).toHaveLength(1)
  })
})
