import mongoose from "mongoose"
import { it, describe, expect, beforeAll, afterAll, beforeEach, vi } from "vitest"
import { connectDatabase, disconnectDatabase } from "../../db/connection.js"
import { loadConfig } from "../../config/env.js"
import { Trip, LoadRecord, User } from "../../database/models/index.js"
import { DeliveryRecord } from "../delivery/persistence/delivery-record.model.js"
import { DeliveryCommandPort } from "../delivery/delivery.command-port.js"
import { UserReadPort } from "../auth/user.read-port.js"
import { loadingRoutes } from "./routes.js"
import Fastify from "fastify"

describe("Loading-Delivery Boundary (DB-13)", () => {
  let app: any
  const authUserId = new mongoose.Types.ObjectId().toHexString()

  beforeAll(async () => {
    const config = loadConfig()
    await connectDatabase(config.mongodbUri)
    app = Fastify()
    app.decorate("authenticate", async (req: any) => { req.auth = { userId: authUserId, role: "loader" } })
    await loadingRoutes(app)
    
    // Mock user to give a depot
    vi.spyOn(UserReadPort, "findById").mockResolvedValue({ depot: "D-001" } as any)
    
    const originalStartSession = mongoose.startSession.bind(mongoose)
    vi.spyOn(mongoose, "startSession").mockImplementation(async (...args) => {
      const session = await originalStartSession(...args)
      session.withTransaction = async (cb: any) => await cb(session)
      return session
    })
  })

  beforeEach(async () => {
    await Trip.deleteMany({})
    await LoadRecord.deleteMany({})
    await DeliveryRecord.deleteMany({})
  })

  afterAll(async () => {
    await disconnectDatabase()
    vi.restoreAllMocks()
  })

  it("1. Loader confirmation updates delivery record expected quantities", async () => {
    const tripStopId1 = new mongoose.Types.ObjectId()
    const tripId = new mongoose.Types.ObjectId()
    
    await Trip.create({
      _id: tripId,
      tripNumber: 1,
      serviceDate: "2026-10-10",
      vehicleId: "V-001",
      driverId: new mongoose.Types.ObjectId(),
      dispatcherId: new mongoose.Types.ObjectId(),
      departureAt: new Date(),
      depot: "D-001",
      status: "published", // Ready for confirm
      routeIndex: 1,
      distanceKm: 10,
      stops: [
        {
          tripStopId: tripStopId1,
          stopId: "stop-1",
          orderId: new mongoose.Types.ObjectId(),
          orderIds: [new mongoose.Types.ObjectId()],
          outletId: "O-001",
          sequence: 1
        }
      ]
    })
    
    await DeliveryRecord.create({
      tripId,
      tripStopId: tripStopId1,
      outletId: "O-001",
      driverId: new mongoose.Types.ObjectId(),
      status: "pending",
      items: [
        {
          sku: "SKU-1",
          orderIds: [new mongoose.Types.ObjectId()],
          expected: 100 // Planned originally
        }
      ]
    })
    
    const loadRecord = await LoadRecord.create({
      tripId,
      depot: "D-001",
      status: "reconciled",
      claimedBy: authUserId,
      items: [
        {
          itemId: `${tripStopId1}-SKU-1`,
          tripStopId: tripStopId1,
          orderIds: [new mongoose.Types.ObjectId()],
          sku: "SKU-1",
          name: "Prod",
          expectedQuantity: 100,
          loadedQuantity: 95, // Short by 5
          status: "loaded"
        }
      ]
    })

    const res = await app.inject({ method: "POST", url: `/load-jobs/${tripId}/confirm`, payload: { expectedVersion: loadRecord.version ?? 0 } })
    if (res.statusCode !== 200) console.log("Confirm Error:", res.json())
    expect(res.statusCode).toBe(200)

    const deliveryRecord = await DeliveryRecord.findOne({ tripId, tripStopId: tripStopId1 })
    expect(deliveryRecord).toBeDefined()
    expect(deliveryRecord!.items[0]!.expected).toBe(95) // Should match loaded quantity
  })
})
