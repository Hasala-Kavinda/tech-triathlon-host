import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import mongoose from "mongoose"
import { OperationalEventCommandPort } from "./operational-event.command-port.js"
import { OperationalEvent } from "./persistence/operational-event.model.js"

let isStandalone = false

describe("OperationalEventCommandPort (DB-17)", () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/waylink_test")
    }
    const admin = mongoose.connection.db?.admin()
    if (admin) {
      const info = await admin.command({ isMaster: 1 })
      isStandalone = !info.setName
    }
  })

  beforeEach(async () => {
    await OperationalEvent.deleteMany({})
  })

  afterAll(async () => {
    // cleanup
  })

  it("should successfully emit an event through the boundary and commit", async () => {
    if (isStandalone) return
    const session = await mongoose.startSession()
    session.startTransaction()

    try {
      await OperationalEventCommandPort.emitEvent(session, {
        eventType: "order.created",
        entityType: "order",
        entityId: "O123",
        actorRole: "store_manager",
        scope: { outletIds: ["OUTLET1"] }
      })
      await session.commitTransaction()
    } finally {
      await session.endSession()
    }

    const count = await OperationalEvent.countDocuments()
    expect(count).toBe(1)
    
    const event = await OperationalEvent.findOne()
    expect(event?.eventType).toBe("order.created")
    expect(event?.entityId).toBe("O123")
  })

  it("should guarantee that an event rolls back if the business transaction fails", async () => {
    if (isStandalone) return
    const session = await mongoose.startSession()
    session.startTransaction()

    try {
      await OperationalEventCommandPort.emitEvent(session, {
        eventType: "business.action",
        entityType: "action",
        entityId: "A123",
        scope: { driverId: "D1" }
      })
      
      // Simulate business failure causing rollback
      throw new Error("Business validation failed")
      
      await session.commitTransaction()
    } catch (err) {
      await session.abortTransaction()
    } finally {
      await session.endSession()
    }

    const count = await OperationalEvent.countDocuments()
    expect(count).toBe(0) // Event was rolled back!
  })

  it("enforces append-only by not exposing update/delete in the command port", async () => {
    // We verify the port structure
    const keys = Object.getOwnPropertyNames(OperationalEventCommandPort)
    expect(keys).not.toContain("updateEvent")
    expect(keys).not.toContain("deleteEvent")
    expect(keys).toContain("emitEvent")
  })
})
