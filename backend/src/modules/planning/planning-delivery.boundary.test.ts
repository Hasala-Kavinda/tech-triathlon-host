import mongoose from "mongoose"
import { it, describe, expect, beforeAll, afterAll, beforeEach, vi } from "vitest"
import { connectDatabase, disconnectDatabase } from "../../db/connection.js"
import { loadConfig } from "../../config/env.js"
import { Trip, LoadRecord, User } from "../../database/models/index.js"
import { Order } from "../orders/persistence/order.model.js"
import { DeliveryRecord } from "../delivery/persistence/delivery-record.model.js"
import { DeliveryCommandPort } from "../delivery/delivery.command-port.js"
import { planningRoutes } from "./routes.js"
import Fastify from "fastify"

vi.mock("./constraints.js", () => ({
  validateTrip: vi.fn().mockResolvedValue({ valid: true, rules: [] })
}))

describe("Planning-Delivery Boundary (DB-13)", () => {
  let app: any

  beforeAll(async () => {
    const config = loadConfig()
    await connectDatabase(config.mongodbUri)
    app = Fastify()
    app.decorate("authenticate", async (req: any) => { req.auth = { userId: new mongoose.Types.ObjectId().toHexString(), role: "dispatcher" } })
    await planningRoutes(app)
    
    const originalStartSession = mongoose.startSession.bind(mongoose)
    vi.spyOn(mongoose, "startSession").mockImplementation(async (...args) => {
      const session = await originalStartSession(...args)
      session.withTransaction = async (cb: any) => await cb(session)
      return session
    })
  })

  beforeEach(async () => {
    await Trip.deleteMany({})
    await Order.deleteMany({})
    await LoadRecord.deleteMany({})
    await DeliveryRecord.deleteMany({})
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("1. Creates one pending DeliveryRecord per physical TripStop on publish", async () => {
    const driverId = new mongoose.Types.ObjectId()
    const tripStopId1 = new mongoose.Types.ObjectId()
    
    const baseItem = { productId: new mongoose.Types.ObjectId(), unit: "box", unitWeightKg: 1, unitVolumeM3: 0.1, temperatureClass: "ambient", fragile: false }
    const order1 = await Order.create({
      orderNumber: "O1",
      outletId: "O-001",
      storeManagerId: new mongoose.Types.ObjectId(),
      brand: "B1",
      orderType: "regular",
      requestedDate: "2026-10-10",
      cutoffBucket: "before_cutoff",
      status: "submitted",
      items: [{ ...baseItem, sku: "SKU-1", name: "Product 1", quantity: 50 }],
      totalWeightKg: 1,
      totalVolumeM3: 1
    })
    
    const order2 = await Order.create({
      orderNumber: "O2",
      outletId: "O-001",
      storeManagerId: new mongoose.Types.ObjectId(),
      brand: "B1",
      orderType: "regular",
      requestedDate: "2026-10-10",
      cutoffBucket: "before_cutoff",
      status: "submitted",
      items: [{ ...baseItem, sku: "SKU-2", name: "Product 2", quantity: 30 }],
      totalWeightKg: 1,
      totalVolumeM3: 1
    })

    const trip = await Trip.create({
      serviceDate: "2026-10-10",
      vehicleId: "V-001",
      driverId,
      dispatcherId: new mongoose.Types.ObjectId(),
      departureAt: new Date(),
      tripNumber: 1,
      depot: "D-001",
      status: "draft",
      routeIndex: 1,
      distanceKm: 10,
      stops: [
        {
          tripStopId: tripStopId1,
          stopId: "stop-1",
          orderId: order1._id, // legacy compat
          orderIds: [order1._id, order2._id],
          outletId: "O-001",
          sequence: 1
        }
      ]
    })

    const res = await app.inject({ method: "POST", url: `/planning/trips/${trip._id}/publish`, payload: { expectedVersion: trip.version ?? 0 } })
    expect(res.statusCode).toBe(200)

    const deliveryRecords = await DeliveryRecord.find({ tripId: trip._id })
    expect(deliveryRecords).toHaveLength(1)
    
    const record = deliveryRecords[0]!
    expect(record.tripStopId.toString()).toBe(tripStopId1.toString())
    expect(record.outletId).toBe("O-001")
    expect(record.driverId.toString()).toBe(driverId.toString())
    expect(record.status).toBe("pending")
    expect(record.proof.status).toBe("none")
    
    // Check items mapping (Consolidated order)
    expect(record.items).toHaveLength(2)
    const item1 = record.items.find(i => i.sku === "SKU-1")!
    expect(item1.expected).toBe(50)
    expect(item1.orderIds.map(String)).toContain(order1.id)
    
    const item2 = record.items.find(i => i.sku === "SKU-2")!
    expect(item2.expected).toBe(30)
    expect(item2.orderIds.map(String)).toContain(order2.id)
  })
})
