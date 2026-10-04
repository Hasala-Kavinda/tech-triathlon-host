import mongoose from "mongoose"
import { it, describe, expect, beforeAll, afterAll, beforeEach } from "vitest"
import { connectDatabase, disconnectDatabase } from "../../db/connection.js"
import { loadConfig } from "../../config/env.js"
import { LoadRecord } from "./persistence/load-record.model.js"
import { Trip } from "../../database/models/index.js"
import { loadingRoutes } from "./routes.js"
import Fastify from "fastify"
import { vi } from "vitest"

describe("Loading Plan Change Acknowledgement API (Phase 1.4.6C)", () => {
  let app: any
  const depot = "D1"
  let authUser: any

  beforeAll(async () => {
    const config = loadConfig()
    await connectDatabase(config.mongodbUri)
    app = Fastify()
    app.decorate("authenticate", async (req: any) => { req.auth = authUser })
    await loadingRoutes(app)
    
    const originalStartSession = mongoose.startSession.bind(mongoose)
    vi.spyOn(mongoose, "startSession").mockImplementation(async (...args) => {
      const session = await originalStartSession(...args)
      session.withTransaction = async (cb: any) => await cb(session)
      return session
    })
  })

  beforeEach(async () => {
    await LoadRecord.deleteMany({})
    await Trip.deleteMany({})
    authUser = { userId: new mongoose.Types.ObjectId().toHexString(), role: "loader" }
    await mongoose.connection.collection("users").insertOne({ _id: new mongoose.Types.ObjectId(authUser.userId), employeeId: "EMP-1", email: "emp1@example.com", depot: "D1", role: "loader" })
  })

  afterAll(async () => {
    await LoadRecord.deleteMany({})
    await Trip.deleteMany({})
    await mongoose.connection.collection("users").deleteMany({})
    await disconnectDatabase()
  })

  it("should reject start-loading if unacknowledged plan change exists, and allow after acknowledge", async () => {
    const trip = await Trip.create({
      tripNumber: "TRP-PLAN", serviceDate: "2023-01-01", departureAt: new Date(),
      depot: "D1", vehicleId: "V1", driverId: new mongoose.Types.ObjectId(), dispatcherId: new mongoose.Types.ObjectId(),
      distanceKm: 10, status: "published", routeIndex: 1, stops: []
    })

    const record = await LoadRecord.create({
      tripId: trip._id, depot: "D1", status: "claimed", claimedBy: new mongoose.Types.ObjectId(authUser.userId), claimedAt: new Date(),
      items: [{ itemId: "I1", tripStopId: new mongoose.Types.ObjectId(), orderIds: [new mongoose.Types.ObjectId()], sku: "S1", name: "S", expectedQuantity: 10 }],
      planChanges: [{
        changeId: new mongoose.Types.ObjectId().toHexString(),
        type: "ORDER_DEFERRED",
        orderId: new mongoose.Types.ObjectId(),
        description: "Order deferred",
        reason: "Test",
        createdAt: new Date()
      }]
    })

    let currentVersion = record.version

    // 1. start-loading should fail
    let res = await app.inject({ method: "POST", url: `/load-jobs/${trip._id}/start-loading`, payload: { expectedVersion: currentVersion } })
    expect(res.statusCode).toBe(409)
    let payload = JSON.parse(res.payload)
    expect(payload.code).toBe("PLAN_CHANGE_UNACKNOWLEDGED")

    // 2. acknowledge
    res = await app.inject({ method: "POST", url: `/load-jobs/${trip._id}/acknowledge`, payload: { expectedVersion: currentVersion } })
    expect(res.statusCode).toBe(200)
    
    let state = await LoadRecord.findById(record._id)
    expect(state!.planChanges[0]!.acknowledgedAt).toBeDefined()
    expect(String(state!.planChanges[0]!.acknowledgedBy)).toBe(authUser.userId)
    currentVersion = state!.version

    // 3. duplicate acknowledge safely succeeds
    res = await app.inject({ method: "POST", url: `/load-jobs/${trip._id}/acknowledge`, payload: { expectedVersion: currentVersion } })
    expect(res.statusCode).toBe(200)
    // version should not change because no changes made
    state = await LoadRecord.findById(record._id)
    expect(state!.version).toBe(currentVersion)

    // 4. start-loading should succeed
    res = await app.inject({ method: "POST", url: `/load-jobs/${trip._id}/start-loading`, payload: { expectedVersion: currentVersion } })
    expect(res.statusCode).toBe(200)
    state = await LoadRecord.findById(record._id)
    expect(state!.status).toBe("loading")
  })
})
