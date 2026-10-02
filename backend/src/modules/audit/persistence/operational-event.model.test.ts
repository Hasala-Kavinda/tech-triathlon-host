import { describe, it, expect, beforeAll, afterAll } from "vitest"
import mongoose from "mongoose"
import { OperationalEvent } from "./operational-event.model.js"

describe("OperationalEvent Model (DB-17)", () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/waylink_test")
    }
  })

  afterAll(async () => {
    // cleanup
  })

  it("should enforce required canonical fields", () => {
    const doc = new OperationalEvent({})
    const err = doc.validateSync()
    expect(err?.errors.eventType).toBeDefined()
    expect(err?.errors.entityType).toBeDefined()
    expect(err?.errors.entityId).toBeDefined()
  })

  it("should allow valid event insertion", async () => {
    const doc = new OperationalEvent({
      eventType: "order.created",
      entityType: "order",
      entityId: "ORD123",
      actorRole: "store_manager",
      scope: {
        outletIds: ["OUTLET1"]
      }
    })
    const err = doc.validateSync()
    expect(err).toBeUndefined()
  })

  it("should support the exact scope structure for all roles", () => {
    const doc = new OperationalEvent({
      eventType: "trip.started",
      entityType: "trip",
      entityId: "TRIP123",
      scope: {
        outletIds: ["O1", "O2"],
        depot: "DEPOT_A",
        tripId: "TRIP123",
        driverId: "DRIVER99",
        loaderId: "LOADER77"
      }
    })
    const err = doc.validateSync()
    expect(err).toBeUndefined()
    expect(doc.scope?.outletIds).toContain("O1")
    expect(doc.scope?.depot).toBe("DEPOT_A")
    expect(doc.scope?.tripId).toBe("TRIP123")
    expect(doc.scope?.driverId).toBe("DRIVER99")
    expect(doc.scope?.loaderId).toBe("LOADER77")
  })
})
