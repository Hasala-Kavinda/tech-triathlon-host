import mongoose from "mongoose"
import { it, describe, expect, beforeAll, afterAll, beforeEach } from "vitest"
import { connectDatabase, disconnectDatabase } from "../../db/connection.js"
import { loadConfig } from "../../config/env.js"
import { Trip, LoadRecord } from "../../database/models/index.js"
import { Order } from "../orders/persistence/order.model.js"
import { allocateOrdersToTrip } from "../orders/order.commands.js"
import { planningRoutes } from "./routes.js"
import Fastify from "fastify"
import { vi } from "vitest"

vi.mock("./constraints.js", () => ({
  validateTrip: vi.fn().mockResolvedValue({ valid: true, rules: [] })
}))

describe("Planning-Loading Boundary (DB-12)", () => {
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
  })

  afterAll(async () => {
    await Trip.deleteMany({})
    await Order.deleteMany({})
    await LoadRecord.deleteMany({})
    await disconnectDatabase()
  })

  it("should aggregate items by SKU and correctly map contributing orderIds", async () => {
    const baseItem = { productId: new mongoose.Types.ObjectId(), unit: "box", unitWeightKg: 1, unitVolumeM3: 0.1, temperatureClass: "ambient", fragile: false }
    const o1 = await Order.create({ orderNumber: "O1", outletId: "OUT1", storeManagerId: new mongoose.Types.ObjectId(), brand: "B1", orderType: "regular", requestedDate: "2023-01-01", cutoffBucket: "before_cutoff", items: [{ ...baseItem, sku: "SKU-A", name: "A", quantity: 5 }], totalWeightKg: 10, totalVolumeM3: 1, status: "submitted" })
    const o2 = await Order.create({ orderNumber: "O2", outletId: "OUT1", storeManagerId: new mongoose.Types.ObjectId(), brand: "B1", orderType: "regular", requestedDate: "2023-01-01", cutoffBucket: "before_cutoff", items: [{ ...baseItem, sku: "SKU-B", name: "B", quantity: 10 }], totalWeightKg: 20, totalVolumeM3: 2, status: "submitted" })
    const o3 = await Order.create({ orderNumber: "O3", outletId: "OUT1", storeManagerId: new mongoose.Types.ObjectId(), brand: "B1", orderType: "regular", requestedDate: "2023-01-01", cutoffBucket: "before_cutoff", items: [{ ...baseItem, sku: "SKU-A", name: "A", quantity: 2 }], totalWeightKg: 5, totalVolumeM3: 1, status: "submitted" })

    const trip = await Trip.create({
      tripNumber: "TRP-1", serviceDate: "2023-01-01", departureAt: new Date(), plannedEndAt: new Date(),
      depot: "D1", vehicleId: "V1", driverId: new mongoose.Types.ObjectId(), dispatcherId: new mongoose.Types.ObjectId(),
      distanceKm: 10, status: "draft", routeIndex: 1,
      stops: [{ tripStopId: new mongoose.Types.ObjectId(), stopId: "S1", orderId: o1._id, orderIds: [o1._id, o2._id, o3._id], outletId: "OUT1", sequence: 1, plannedArrivalAt: new Date() }]
    })

    const dispatcherId = new mongoose.Types.ObjectId().toHexString()
    const res = await app.inject({ method: "POST", url: `/planning/trips/${trip._id}/publish`, payload: { expectedVersion: trip.version ?? 0 } })
    if (res.statusCode !== 200) console.error(res.payload)
    expect(res.statusCode).toBe(200)

    const loadJob = await LoadRecord.findOne({ tripId: trip._id })
    expect(loadJob).toBeDefined()
    
    // Validate SKU-B
    const skuB = loadJob!.items.find(i => i.sku === "SKU-B")
    expect(skuB!.orderIds.length).toBe(1)
    expect(String(skuB!.orderIds[0])).toBe(String(o2._id))
    expect(skuB!.expectedQuantity).toBe(10)
    
    // Validate SKU-A (contributed by O1 and O3)
    const skuA = loadJob!.items.find(i => i.sku === "SKU-A")
    expect(skuA!.orderIds.length).toBe(2)
    const skuAOrderIds = skuA!.orderIds.map(id => String(id)).sort()
    const expectedOrderIds = [String(o1._id), String(o3._id)].sort()
    expect(skuAOrderIds).toEqual(expectedOrderIds)
    expect(skuA!.expectedQuantity).toBe(7) // 5 + 2
    
    console.log("BLOCKER 1 VERIFIED: SKU-A orderIds:", skuAOrderIds, "SKU-B orderIds:", skuB!.orderIds.map(String))
  })
})
