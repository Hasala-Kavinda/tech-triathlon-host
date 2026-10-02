import mongoose from "mongoose"
import { it, describe, expect, beforeAll, afterAll, beforeEach } from "vitest"
import { connectDatabase, disconnectDatabase } from "../../db/connection.js"
import { loadConfig } from "../../config/env.js"
import { LoadRecord } from "./persistence/load-record.model.js"
import { Trip } from "../../database/models/index.js"
import { loadingRoutes } from "./routes.js"
import Fastify from "fastify"
import { vi } from "vitest"

describe("Loading State Machine (DB-12)", () => {
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
    // Loader user setup
    authUser = { userId: new mongoose.Types.ObjectId().toHexString(), role: "loader" }
    // We must mock UserReadPort in tests or seed a user!
    // Since routes.ts calls UserReadPort.findById(auth.userId), we should seed it.
    await mongoose.connection.collection("users").insertOne({ _id: new mongoose.Types.ObjectId(authUser.userId), employeeId: "EMP-1", email: "emp1@example.com", depot: "D1", role: "loader" })
  })

  afterAll(async () => {
    await LoadRecord.deleteMany({})
    await Trip.deleteMany({})
    await mongoose.connection.collection("users").deleteMany({})
    await disconnectDatabase()
  })

  it("should progress through full STATE-03 machine", async () => {
    const trip = await Trip.create({
      tripNumber: "TRP-STATE", serviceDate: "2023-01-01", departureAt: new Date(),
      depot: "D1", vehicleId: "V1", driverId: new mongoose.Types.ObjectId(), dispatcherId: new mongoose.Types.ObjectId(),
      distanceKm: 10, status: "published", routeIndex: 1, stops: []
    })

    const record = await LoadRecord.create({
      tripId: trip._id, depot: "D1", status: "available",
      items: [{ itemId: "I1", tripStopId: new mongoose.Types.ObjectId(), orderIds: [new mongoose.Types.ObjectId()], sku: "S1", name: "S", expectedQuantity: 10 }]
    })

    // 1. available -> claimed
    let res = await app.inject({ method: "POST", url: `/load-jobs/${trip._id}/claim`, payload: { expectedVersion: record.version } })
    expect(res.statusCode).toBe(200)
    let state = await LoadRecord.findById(record._id)
    expect(state!.status).toBe("claimed")
    expect(String(state!.claimedBy)).toBe(authUser.userId)
    expect(state!.claimedAt).toBeDefined()
    let currentVersion = state!.version

    // 1b. unauthorized claimant rejection
    const otherUser = new mongoose.Types.ObjectId().toHexString()
    await mongoose.connection.collection("users").insertOne({ _id: new mongoose.Types.ObjectId(otherUser), employeeId: "EMP-2", email: "emp2@example.com", depot: "D1", role: "loader" })
    authUser = { userId: otherUser, role: "loader" }
    res = await app.inject({ method: "POST", url: `/load-jobs/${trip._id}/start-loading`, payload: { expectedVersion: currentVersion } })
    expect(res.statusCode).toBe(409) // conflict: not claimed by this user

    authUser = { userId: state!.claimedBy, role: "loader" } // revert back

    // 1c. stale version rejection
    res = await app.inject({ method: "POST", url: `/load-jobs/${trip._id}/start-loading`, payload: { expectedVersion: 0 } })
    expect(res.statusCode).toBe(409) // conflict: version mismatch

    // 2. claimed -> loading
    res = await app.inject({ method: "POST", url: `/load-jobs/${trip._id}/start-loading`, payload: { expectedVersion: currentVersion } })
    expect(res.statusCode).toBe(200)
    state = await LoadRecord.findById(record._id)
    expect(state!.status).toBe("loading")
    expect(state!.loadingStartedAt).toBeDefined()
    currentVersion = state!.version

    // 3. loading -> reconciled
    // Must update items first to match expected
    res = await app.inject({ method: "PATCH", url: `/load-jobs/${trip._id}/items/I1`, payload: { status: "loaded", loadedQuantity: 10, expectedVersion: currentVersion } })
    expect(res.statusCode).toBe(200)
    currentVersion = JSON.parse(res.payload).data.version

    res = await app.inject({ method: "POST", url: `/load-jobs/${trip._id}/reconcile`, payload: { expectedVersion: currentVersion } })
    expect(res.statusCode).toBe(200)
    state = await LoadRecord.findById(record._id)
    expect(state!.status).toBe("reconciled")
    currentVersion = state!.version

    // 4. reconciled -> confirmed
    res = await app.inject({ method: "POST", url: `/load-jobs/${trip._id}/confirm`, payload: { expectedVersion: currentVersion } })
    if (res.statusCode !== 200) console.error("Confirm error:", res.payload)
    expect(res.statusCode).toBe(200)
    state = await LoadRecord.findById(record._id)
    expect(state!.status).toBe("confirmed")
    expect(state!.confirmedAt).toBeDefined()
    
    console.log("BLOCKER 2 VERIFIED: Full STATE-03 machine completed successfully.")
  })
})
