import mongoose from "mongoose"
import { it, describe, expect, beforeAll, afterAll, beforeEach } from "vitest"
import { connectDatabase, disconnectDatabase } from "../../db/connection.js"
import { loadConfig } from "../../config/env.js"
import { Trip, LoadRecord, DeliveryRecord } from "../../database/models/index.js"
import { Order } from "../orders/persistence/order.model.js"
import { planningRoutes } from "../planning/routes.js"
import { loadingRoutes } from "./routes.js"
import Fastify from "fastify"
import { vi } from "vitest"

vi.mock("../planning/constraints.js", () => ({
  validateTrip: vi.fn().mockResolvedValue({ valid: true, rules: [] })
}))

describe("Cross-Role Plan Change Workflow (Phase 1.4.6B + 1.4.6C)", () => {
  let app: any
  let activeUser: any

  const dispatcherUser = { userId: new mongoose.Types.ObjectId().toHexString(), role: "dispatcher" }
  const loaderUser = { userId: new mongoose.Types.ObjectId().toHexString(), role: "loader" }
  const unauthorizedUser = { userId: new mongoose.Types.ObjectId().toHexString(), role: "driver" }
  const otherLoaderUser = { userId: new mongoose.Types.ObjectId().toHexString(), role: "loader" }

  beforeAll(async () => {
    const config = loadConfig()
    await connectDatabase(config.mongodbUri)
    app = Fastify()
    app.decorate("config", { devMode: true })
    app.decorate("authenticate", async (req: any) => { req.auth = activeUser })
    await planningRoutes(app)
    await loadingRoutes(app)

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
    await mongoose.connection.collection("users").deleteMany({})

    await mongoose.connection.collection("users").insertMany([
      { _id: new mongoose.Types.ObjectId(dispatcherUser.userId), role: "dispatcher", depot: "D1", email: "disp@e.com", employeeId: "1" },
      { _id: new mongoose.Types.ObjectId(loaderUser.userId), role: "loader", depot: "D1", email: "load@e.com", employeeId: "2" },
      { _id: new mongoose.Types.ObjectId(otherLoaderUser.userId), role: "loader", depot: "D1", email: "other@e.com", employeeId: "3" },
      { _id: new mongoose.Types.ObjectId(unauthorizedUser.userId), role: "driver", depot: "D1", email: "driv@e.com", employeeId: "4" }
    ])
  })

  afterAll(async () => {
    await Trip.deleteMany({})
    await Order.deleteMany({})
    await LoadRecord.deleteMany({})
    await DeliveryRecord.deleteMany({})
    await mongoose.connection.collection("users").deleteMany({})
    await disconnectDatabase()
  })

  it("should execute end-to-end plan change workflow securely", async () => {
    // 0. Setup: Create Orders and Draft Trip
    const order1Id = new mongoose.Types.ObjectId()
    const order2Id = new mongoose.Types.ObjectId()
    await mongoose.connection.collection("orders").insertMany([
      {
        _id: order1Id, orderNumber: "ORD-1", outletId: "OUT1", status: "submitted",
        items: [{ sku: "SKU1", name: "Item 1", quantity: 5, unitWeightKg: 1, unitVolumeM3: 1 }],
        totalWeightKg: 5, totalVolumeM3: 5, createdAt: new Date()
      },
      {
        _id: order2Id, orderNumber: "ORD-2", outletId: "OUT2", status: "submitted",
        items: [{ sku: "SKU2", name: "Item 2", quantity: 10, unitWeightKg: 1, unitVolumeM3: 1 }],
        totalWeightKg: 10, totalVolumeM3: 10, createdAt: new Date()
      }
    ])
    const order1 = await Order.findById(order1Id)
    const order2 = await Order.findById(order2Id)

    let trip = await Trip.create({
      tripNumber: "TRP-E2E", serviceDate: "2026-10-01", departureAt: new Date(),
      depot: "D1", vehicleId: "V1", driverId: new mongoose.Types.ObjectId(), dispatcherId: new mongoose.Types.ObjectId(dispatcherUser.userId),
      distanceKm: 10, status: "draft", routeIndex: 1,
      stops: [
        { stopId: "STP-1", sequence: 1, tripStopId: new mongoose.Types.ObjectId(), outletId: "OUT1", orderId: order1!._id, orderIds: [order1!._id], plannedArrivalAt: new Date() },
        { stopId: "STP-2", sequence: 2, tripStopId: new mongoose.Types.ObjectId(), outletId: "OUT2", orderId: order2!._id, orderIds: [order2!._id], plannedArrivalAt: new Date() }
      ],
      totals: { weightKg: 0, volumeM3: 0 },
      statusHistory: []
    })

    // Publish Trip as Dispatcher
    activeUser = dispatcherUser
    let res = await app.inject({ method: "POST", url: `/planning/trips/${trip._id}/publish`, payload: { expectedVersion: 0 } })
    if (res.statusCode !== 200) console.error("Publish error:", res.payload)
    expect(res.statusCode).toBe(200)

    // Claim LoadRecord as Loader
    activeUser = loaderUser
    const initialLr = await LoadRecord.findOne({ tripId: trip._id })
    expect(initialLr!.status).toBe("available")

    res = await app.inject({ method: "POST", url: `/load-jobs/${trip._id}/claim`, payload: { expectedVersion: initialLr!.version } })
    expect(res.statusCode).toBe(200)
    let lr = await LoadRecord.findOne({ tripId: trip._id })
    expect(lr!.status).toBe("claimed")
    expect(lr!.planChanges).toHaveLength(0)

    // TEST 1 — DISPATCHER PLAN CHANGE
    activeUser = dispatcherUser
    res = await app.inject({ 
      method: "POST", 
      url: `/planning/trips/${trip._id}/orders/${order2!._id}/defer`,
      payload: { nextDate: "2026-10-05", reasonCode: "Reefer shortage" }
    })
    expect(res.statusCode).toBe(200)

    // Verify DB State After Deferral
    const updatedOrder2 = await Order.findById(order2!._id)
    expect(updatedOrder2!.status).toBe("deferred")
    expect(updatedOrder2!.allocatedTripId).toBeUndefined()

    const updatedTrip = await Trip.findById(trip._id)
    expect(updatedTrip!.stops).toHaveLength(1) // only OUT1 remains

    lr = await LoadRecord.findOne({ tripId: trip._id })
    expect(lr!.status).toBe("claimed") // Remains claimed
    expect(String(lr!.claimedBy)).toBe(loaderUser.userId)
    expect(lr!.items).toHaveLength(1) // only SKU1 remains
    expect(lr!.planChanges).toHaveLength(1)
    
    const planChange = lr!.planChanges[0]
    expect(planChange!.type).toBe("ORDER_DEFERRED")
    expect(String(planChange!.orderId)).toBe(String(order2!._id))
    expect(planChange!.description).toContain("Reefer shortage")
    expect(planChange!.acknowledgedAt).toBeUndefined()
    
    let currentVersion = lr!.version

    // TEST 2 — START LOADING BLOCKED
    activeUser = loaderUser
    res = await app.inject({ method: "POST", url: `/load-jobs/${trip._id}/start-loading`, payload: { expectedVersion: currentVersion } })
    expect(res.statusCode).toBe(409)
    expect(JSON.parse(res.payload).code).toBe("PLAN_CHANGE_UNACKNOWLEDGED")

    lr = await LoadRecord.findOne({ tripId: trip._id })
    expect(lr!.status).toBe("claimed") // No mutation occurred

    // TEST 7 — UNAUTHORIZED ACKNOWLEDGEMENT
    activeUser = otherLoaderUser
    res = await app.inject({ method: "POST", url: `/load-jobs/${trip._id}/acknowledge`, payload: { expectedVersion: currentVersion } })
    expect(res.statusCode).toBe(409) // Cannot acknowledge a load claimed by another
    
    activeUser = unauthorizedUser
    res = await app.inject({ method: "POST", url: `/load-jobs/${trip._id}/acknowledge`, payload: { expectedVersion: currentVersion } })
    expect(res.statusCode).toBe(403) // FORBIDDEN role

    // TEST 8 — INVALID VERSION
    activeUser = loaderUser
    res = await app.inject({ method: "POST", url: `/load-jobs/${trip._id}/acknowledge`, payload: { expectedVersion: 999 } })
    expect(res.statusCode).toBe(409) // ACKNOWLEDGE_CONFLICT version mismatch

    // TEST 3 — ACKNOWLEDGE
    activeUser = loaderUser
    res = await app.inject({ method: "POST", url: `/load-jobs/${trip._id}/acknowledge`, payload: { expectedVersion: currentVersion } })
    expect(res.statusCode).toBe(200)

    lr = await LoadRecord.findOne({ tripId: trip._id })
    expect(lr!.planChanges[0]!.acknowledgedAt).toBeDefined()
    expect(String(lr!.planChanges[0]!.acknowledgedBy)).toBe(loaderUser.userId)
    expect(lr!.status).toBe("claimed")
    currentVersion = lr!.version

    // TEST 4 — REPEATED ACKNOWLEDGEMENT
    res = await app.inject({ method: "POST", url: `/load-jobs/${trip._id}/acknowledge`, payload: { expectedVersion: currentVersion } })
    expect(res.statusCode).toBe(200)
    lr = await LoadRecord.findOne({ tripId: trip._id })
    expect(lr!.planChanges).toHaveLength(1) // No duplicates created
    expect(lr!.version).toBe(currentVersion) // No unnecessary increment

    // TEST 5 — START LOADING AFTER ACK
    res = await app.inject({ method: "POST", url: `/load-jobs/${trip._id}/start-loading`, payload: { expectedVersion: currentVersion } })
    expect(res.statusCode).toBe(200)
    
    lr = await LoadRecord.findOne({ tripId: trip._id })
    expect(lr!.status).toBe("loading")
    expect(lr!.loadingStartedAt).toBeDefined()
    expect(lr!.planChanges[0]!.acknowledgedAt).toBeDefined()

    // TEST 6 — DISPATCHER LOCK AFTER PHYSICAL LOADING
    activeUser = dispatcherUser
    res = await app.inject({ 
      method: "POST", 
      url: `/planning/trips/${trip._id}/orders/${order1!._id}/defer`,
      payload: { nextDate: "2026-10-05", reasonCode: "Reefer shortage" }
    })
    expect(res.statusCode).toBe(409)
    expect(JSON.parse(res.payload).code).toBe("PLAN_LOCKED")

    // TEST 9 — FULL DATABASE CONSISTENCY
    const allLrs = await LoadRecord.find({ tripId: trip._id })
    expect(allLrs).toHaveLength(1) // Only one LoadRecord exists

    const allDrs = await DeliveryRecord.find({ tripId: trip._id })
    expect(allDrs).toHaveLength(1) // Only DeliveryRecords for order1 (OUT1) exist
    expect(allDrs[0]!.items[0]!.sku).toBe("SKU1")
  })
})
