import { describe, it, expect, beforeAll, afterEach } from "vitest"
import mongoose from "mongoose"
import { RemarkCommandPort } from "./remark.command-port.js"
import { RemarkReadPort } from "./remark.read-port.js"
import { Remark } from "./persistence/remark.model.js"
import { OperationalEvent } from "./persistence/operational-event.model.js"

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/waylink_test"

describe("RemarkCommandPort (DB-20)", () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(MONGODB_URI)
    }
    await Remark.collection.drop().catch(() => {})
    await Remark.createCollection()
    await Remark.syncIndexes()
    await OperationalEvent.collection.drop().catch(() => {})
    await OperationalEvent.createCollection()
    await OperationalEvent.syncIndexes()
  })

  afterEach(async () => {
    await Remark.deleteMany({})
    await OperationalEvent.deleteMany({})
  })

  const mockObjectId = new mongoose.Types.ObjectId()

  // ---------------------------------------------------------------------------
  // A & B: Create remark and persist with required fields
  // ---------------------------------------------------------------------------
  it("A, B. Creates and persists remark with required fields", async () => {
    const remark = await RemarkCommandPort.createRemark({
      text: "Issue at store",
      entityType: "trip",
      entityId: "TRP-1",
      actorId: mockObjectId,
      actorRole: "driver",
      audienceRoles: ["dispatcher"],
      requestId: "req-1",
    })

    expect(remark).toBeDefined()
    expect(remark!.status).toBe("pending")
    expect(remark!.text).toBe("Issue at store")

    const persisted = await Remark.findById(remark._id).lean()
    expect(persisted).toBeDefined()
    expect(persisted!.status).toBe("pending")
  })

  // ---------------------------------------------------------------------------
  // C: Read remark
  // ---------------------------------------------------------------------------
  it("C. Reads remarks via ReadPort", async () => {
    await RemarkCommandPort.createRemark({
      text: "Test 1", entityType: "order", entityId: "ORD-1",
      actorId: mockObjectId, actorRole: "driver", audienceRoles: ["dispatcher"],
    })
    
    const byEntity = await RemarkReadPort.findByEntity("order", "ORD-1")
    expect(byEntity.length).toBe(1)
    expect(byEntity[0]!.text).toBe("Test 1")

    const pending = await RemarkReadPort.findByStatus("pending")
    expect(pending.length).toBe(1)
  })

  // ---------------------------------------------------------------------------
  // D & H: Review remark & Status persistence
  // ---------------------------------------------------------------------------
  it("D, H. Reviews remark and correctly persists status change", async () => {
    const created = await RemarkCommandPort.createRemark({
      text: "Needs review", entityType: "trip", entityId: "TRP-2",
      actorId: mockObjectId, actorRole: "driver", audienceRoles: ["dispatcher"],
    })

    const dispatcherId = new mongoose.Types.ObjectId()
    const reviewed = await RemarkCommandPort.reviewRemark({
      remarkId: String(created._id),
      reviewedBy: dispatcherId,
      response: "Acknowledged",
      notifyRoles: ["driver"],
    })

    expect(reviewed).not.toBeNull()
    expect(reviewed!.status).toBe("reviewed")
    expect(reviewed!.reviewResponse).toBe("Acknowledged")

    const persisted = await RemarkReadPort.findById(String(created._id))
    expect(persisted!.status).toBe("reviewed")
    expect(persisted!.reviewedAt).toBeDefined()
  })

  // ---------------------------------------------------------------------------
  // E, F, G: Separation of Remark and OperationalEvent persistence (Append-Only)
  // ---------------------------------------------------------------------------
  it("E, F, G. Event separation and append-only preservation", async () => {
    const remark = await RemarkCommandPort.createRemark({
      text: "Append only test", entityType: "trip", entityId: "TRP-3",
      actorId: mockObjectId, actorRole: "driver", audienceRoles: ["dispatcher"],
    })

    // Check the 'created' event
    const createdEvents = await OperationalEvent.find({ "data.remarkId": String(remark._id) })
    expect(createdEvents.length).toBe(1)
    expect(createdEvents[0]!.eventType).toBe("remark.created")
    const originalEventId = createdEvents[0]!._id

    // Perform review
    const dispatcherId = new mongoose.Types.ObjectId()
    await RemarkCommandPort.reviewRemark({
      remarkId: String(remark._id),
      reviewedBy: dispatcherId,
      response: "Reviewed",
    })

    // The original event must remain unchanged
    const originalEventAfter = await OperationalEvent.findById(originalEventId)
    expect(originalEventAfter?.data.reviewed).toBeUndefined() // The mutation shouldn't happen here anymore

    // A new 'reviewed' event must have been created
    const allEvents = await OperationalEvent.find({ "data.remarkId": String(remark._id) }).sort({ createdAt: 1 })
    expect(allEvents.length).toBe(2)
    expect(allEvents[1]?.eventType).toBe("remark.reviewed")
    expect(allEvents[1]?.data.response).toBe("Reviewed")
  })

  // ---------------------------------------------------------------------------
  // I: Runtime index check
  // ---------------------------------------------------------------------------
  it("I. Runtime { status: 1, createdAt: -1 } index exists", async () => {
    const indexes = await Remark.collection.indexes()
    const found = indexes.some(idx => 
      idx.key.status === 1 && idx.key.createdAt === -1
    )
    expect(found).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // J: Concurrent/repeated review
  // ---------------------------------------------------------------------------
  it("J. Concurrent/repeated reviews are safe (idempotent/ignored)", async () => {
    const remark = await RemarkCommandPort.createRemark({
      text: "Concurrent test", entityType: "trip", entityId: "TRP-4",
      actorId: mockObjectId, actorRole: "driver", audienceRoles: ["dispatcher"],
    })

    const dispatcherId = new mongoose.Types.ObjectId()
    
    // First review works
    const r1 = await RemarkCommandPort.reviewRemark({
      remarkId: String(remark._id),
      reviewedBy: dispatcherId,
      response: "First review",
    })
    expect(r1).not.toBeNull()

    // Second review on same remark returns null (because status is no longer "pending")
    const r2 = await RemarkCommandPort.reviewRemark({
      remarkId: String(remark._id),
      reviewedBy: dispatcherId,
      response: "Second review",
    })
    expect(r2).toBeNull()

    // Ensure only ONE reviewed event was created
    const reviewEvents = await OperationalEvent.find({ 
      eventType: "remark.reviewed", 
      "data.remarkId": String(remark._id)
    })
    expect(reviewEvents.length).toBe(1)
  })

  // ---------------------------------------------------------------------------
  // K: Session-aware transactional writes
  // ---------------------------------------------------------------------------
  it("K. Session-aware transactional behavior (Atomicity)", async () => {
    const session = await mongoose.startSession()
    let remarkId: string
    
    try {
      await session.withTransaction(async () => {
        const remark = await RemarkCommandPort.createRemark({
          text: "Tx test", entityType: "trip", entityId: "TRP-5",
          actorId: mockObjectId, actorRole: "driver", audienceRoles: ["dispatcher"],
        }, session)
        remarkId = String(remark._id)

        // Verify inside tx
        const inside = await Remark.findById(remarkId).session(session)
        expect(inside).not.toBeNull()

        // Force a rollback
        throw new Error("Intentional rollback")
      })
    } catch { /* expected */ } finally {
      await session.endSession()
    }

    // Verify after rollback
    const after = await Remark.findById(remarkId!)
    expect(after).toBeNull()

    // Ensure the event also rolled back
    const events = await OperationalEvent.find({ "data.remarkId": remarkId! })
    expect(events.length).toBe(0)
  })

})
