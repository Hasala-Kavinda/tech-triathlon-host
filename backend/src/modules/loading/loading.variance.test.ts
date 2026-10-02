import mongoose from "mongoose"
import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest"
import { connectDatabase, disconnectDatabase } from "../../db/connection.js"
import { loadConfig } from "../../config/env.js"
import { Trip } from "../../database/models/index.js"
import { LoadRecord } from "./persistence/load-record.model.js"
import { loadingRoutes } from "./routes.js"
import Fastify from "fastify"
import { vi } from "vitest"

describe("Loading Variance Mutation (DB-12)", () => {
  let app: any
  const authUser = { userId: new mongoose.Types.ObjectId().toHexString(), role: "loader" }

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

  afterAll(async () => {
    await mongoose.connection.collection("users").deleteMany({})
    await disconnectDatabase()
  })

  beforeEach(async () => {
    await Trip.deleteMany({})
    await LoadRecord.deleteMany({})
    await mongoose.connection.collection("users").deleteMany({})
    await mongoose.connection.collection("users").insertOne({ _id: new mongoose.Types.ObjectId(authUser.userId), employeeId: "EMP-V1", email: "empv1@example.com", depot: "D1", role: "loader" })
  })

  it("should preserve varianceQuantity dynamically through the production PATCH route", async () => {
    const trip = await Trip.create({
      tripNumber: "TRP-V1", serviceDate: "2023-01-01", departureAt: new Date(), plannedEndAt: new Date(),
      depot: "D1", vehicleId: "V1", driverId: new mongoose.Types.ObjectId(), dispatcherId: new mongoose.Types.ObjectId(),
      distanceKm: 10, status: "published", routeIndex: 1,
      stops: [{ tripStopId: new mongoose.Types.ObjectId(), stopId: "S1", orderId: new mongoose.Types.ObjectId(), orderIds: [new mongoose.Types.ObjectId()], outletId: "OUT1", sequence: 1, plannedArrivalAt: new Date() }]
    })

    const record = await LoadRecord.create({
      tripId: trip._id,
      depot: "D1",
      status: "loading",
      claimedBy: authUser.userId,
      items: [{
        itemId: "I1",
        tripStopId: new mongoose.Types.ObjectId(),
        orderIds: [new mongoose.Types.ObjectId()],
        sku: "SKU-V1",
        name: "Item V1",
        expectedQuantity: 10,
        loadedQuantity: 0,
        status: "pending"
      }]
    })
    
    let currentVersion = record.version
    expect(record.items[0]!.varianceQuantity).toBe(-10)

    // Mutate to 7
    let res = await app.inject({ method: "PATCH", url: `/load-jobs/${trip._id}/items/I1`, payload: { status: "pending", loadedQuantity: 7, expectedVersion: currentVersion } })
    if (res.statusCode !== 200) console.error("Update to 7 failed:", res.payload)
    expect(res.statusCode).toBe(200)
    
    let state = await LoadRecord.findById(record._id)
    expect(state!.items[0]!.loadedQuantity).toBe(7)
    expect(state!.items[0]!.varianceQuantity).toBe(-3)
    currentVersion = state!.version

    // Mutate to 12
    res = await app.inject({ method: "PATCH", url: `/load-jobs/${trip._id}/items/I1`, payload: { status: "loaded", loadedQuantity: 12, expectedVersion: currentVersion } })
    if (res.statusCode !== 200) console.error("Update to 12 failed:", res.payload)
    expect(res.statusCode).toBe(200)

    state = await LoadRecord.findById(record._id)
    expect(state!.items[0]!.loadedQuantity).toBe(12)
    expect(state!.items[0]!.varianceQuantity).toBe(2)
  })
})
