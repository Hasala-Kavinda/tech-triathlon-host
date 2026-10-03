import { describe, it, expect, beforeEach, afterAll, beforeAll } from "vitest"
import mongoose from "mongoose"
import { connectDatabase, disconnectDatabase } from "../../../db/connection.js"
import { loadConfig } from "../../../config/env.js"
import { Order, ORDER_STATUSES, CUTOFF_BUCKETS } from "./order.model.js"

const validOrder = () => ({
  orderNumber: `ORD-${Date.now()}-TEST`,
  outletId: "OUT001",
  storeManagerId: new mongoose.Types.ObjectId(),
  brand: "Fresh",
  orderType: "dry",
  requestedDate: "2026-10-02",
  cutoffBucket: "before_cutoff" as const,
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
})

describe("Order Model (DB-09)", () => {
  beforeAll(async () => {
    const config = loadConfig()
    await connectDatabase(config.mongodbUri)
  })

  beforeEach(async () => {
    await Order.deleteMany({})
    await Order.syncIndexes()
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("should create a valid order with all required fields", async () => {
    const order = await Order.create(validOrder())
    expect(order.orderNumber).toMatch(/^ORD-/)
    expect(order.outletId).toBe("OUT001")
    expect(order.brand).toBe("Fresh")
    expect(order.status).toBe("submitted")
    expect(order.items).toHaveLength(1)
    expect(order.version).toBeDefined()
    expect(order.createdAt).toBeDefined()
  })

  it("should fail if required fields are missing", async () => {
    await expect(Order.create({ orderNumber: "ORD-001" })).rejects.toThrow(mongoose.Error.ValidationError)
  })

  it("should enforce orderNumber uniqueness", async () => {
    const fixed = { ...validOrder(), orderNumber: "ORD-FIXED-UNIQUE-TEST" }
    await Order.create(fixed)
    const duplicate = validOrder()
    duplicate.orderNumber = "ORD-FIXED-UNIQUE-TEST"
    await expect(Order.create(duplicate)).rejects.toThrow(/duplicate key error/)
  })

  it("should reject invalid status values", async () => {
    await expect(Order.create({ ...validOrder(), status: "pending_approval" as any })).rejects.toThrow(mongoose.Error.ValidationError)
  })

  it("should reject invalid cutoffBucket values", async () => {
    await expect(Order.create({ ...validOrder(), cutoffBucket: "at_cutoff" as any })).rejects.toThrow(mongoose.Error.ValidationError)
  })

  it("should preserve product snapshot in items", async () => {
    const order = await Order.create(validOrder())
    const item = order.items[0]!
    expect(item.sku).toBe("DEMO-001")
    expect(item.name).toBe("Test Product")
    expect(item.unitWeightKg).toBe(1.0)
    expect(item.temperatureClass).toBe("ambient")
    expect(item.fragile).toBe(false)
  })

  it("should store outletId as string (DB-05 canonical)", async () => {
    const order = await Order.create(validOrder())
    expect(typeof order.outletId).toBe("string")
  })

  it("should store storeManagerId as ObjectId (User reference)", async () => {
    const order = await Order.create(validOrder())
    expect(order.storeManagerId).toBeInstanceOf(mongoose.Types.ObjectId)
  })

  it("should store requestedDate as YYYY-MM-DD string without coercion", async () => {
    const order = await Order.create({ ...validOrder(), requestedDate: "2026-10-02" })
    expect(order.requestedDate).toBe("2026-10-02")
    expect(typeof order.requestedDate).toBe("string")
  })

  it("should support deferral fields", async () => {
    const order = await Order.create({
      ...validOrder(),
      status: "deferred",
      deferredTo: "2026-10-05",
      deferralReason: "VEHICLE_UNAVAILABLE",
    })
    expect(order.status).toBe("deferred")
    expect(order.deferredTo).toBe("2026-10-05")
    expect(order.deferralReason).toBe("VEHICLE_UNAVAILABLE")
  })

  it("should support allocation field", async () => {
    const tripId = new mongoose.Types.ObjectId()
    const order = await Order.create({
      ...validOrder(),
      status: "allocated",
      allocatedTripId: tripId,
    })
    expect(String(order.allocatedTripId)).toBe(String(tripId))
  })

  it("should track status history", async () => {
    const order = await Order.create({
      ...validOrder(),
      statusHistory: [
        { status: "submitted", at: new Date() },
        { status: "deferred", at: new Date(), note: "VEHICLE_UNAVAILABLE" },
      ],
    })
    expect(order.statusHistory).toHaveLength(2)
    expect(order.statusHistory[1]?.status).toBe("deferred")
  })

  it("should have version for optimistic concurrency", async () => {
    const order = await Order.create(validOrder())
    expect(order.version).toBe(0)
  })

  it("should enforce all canonical ORDER_STATUSES values", () => {
    expect(ORDER_STATUSES).toContain("submitted")
    expect(ORDER_STATUSES).toContain("deferred")
    expect(ORDER_STATUSES).toContain("allocated")
    expect(ORDER_STATUSES).toContain("in_transit")
    expect(ORDER_STATUSES).toContain("delivered")
    expect(ORDER_STATUSES).toContain("cancelled")
  })

  it("should enforce all canonical CUTOFF_BUCKETS values", () => {
    expect(CUTOFF_BUCKETS).toContain("before_cutoff")
    expect(CUTOFF_BUCKETS).toContain("after_cutoff")
  })
})
