import mongoose from "mongoose"
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import { MutationLedgerCommandPort } from "./mutation-ledger.command-port.js"
import { MutationLedger } from "./persistence/mutation-ledger.model.js"

describe("MutationLedgerCommandPort", () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/waylink_test")
    }
    await MutationLedger.collection.drop().catch(() => {})
    await MutationLedger.createCollection() // ensure collection for transactions
    await MutationLedger.init() // ensure indexes are built
  })

  beforeEach(async () => {
    await MutationLedger.deleteMany({})
  })

  afterAll(async () => {
    await mongoose.connection.close()
  })

  const actorId = new mongoose.Types.ObjectId().toHexString()

  it("API idempotency: records result and handles duplicate key+actor+operation uniquely", async () => {
    await MutationLedgerCommandPort.recordIdempotentResult({
      mutationId: "key1",
      requestHash: "hash1",
      operation: "POST /api",
      actorId,
      statusCode: 200,
      response: { data: "ok" }
    })

    const found = await MutationLedgerCommandPort.findIdempotentRecord("key1", actorId, "POST /api")
    expect(found).toBeDefined()
    expect(found!.statusCode).toBe(200)
    expect(found!.response).toEqual({ data: "ok" })
    expect(found!.expiresAt).toBeDefined() // TTL behavior

    // Mongoose schema validation ensures uniqueness constraint catches exact duplicate
    await expect(
      MutationLedgerCommandPort.recordIdempotentResult({
        mutationId: "key1",
        requestHash: "hash2",
        operation: "POST /api",
        actorId,
        statusCode: 400,
        response: { error: "bad" }
      })
    ).rejects.toThrow(/E11000 duplicate key error/)
  })

  it("API idempotency: allows same key for different actor or operation", async () => {
    await MutationLedgerCommandPort.recordIdempotentResult({
      mutationId: "key2",
      requestHash: "hash1",
      operation: "POST /api",
      actorId,
      statusCode: 200,
      response: { data: "ok" }
    })

    const actor2 = new mongoose.Types.ObjectId().toHexString()

    // Same key, different actor
    await MutationLedgerCommandPort.recordIdempotentResult({
      mutationId: "key2",
      requestHash: "hash1",
      operation: "POST /api",
      actorId: actor2,
      statusCode: 200,
      response: { data: "ok2" }
    })

    // Same key, same actor, different operation
    await MutationLedgerCommandPort.recordIdempotentResult({
      mutationId: "key2",
      requestHash: "hash1",
      operation: "POST /other",
      actorId,
      statusCode: 201,
      response: { data: "ok3" }
    })

    const count = await MutationLedger.countDocuments({ mutationId: "key2" })
    expect(count).toBe(3)
  })

  it("Driver sync: creates clientMutationId and preserves terminal result", async () => {
    await MutationLedgerCommandPort.recordSyncReceipt({
      mutationId: "sync1",
      actorId,
      operation: "location",
      entityId: "trip1",
      result: "applied",
      response: { accepted: true }
    })

    const found = await MutationLedgerCommandPort.findSyncReceipt("sync1", actorId)
    expect(found).toBeDefined()
    expect(found!.result).toBe("applied")
    expect(found!.response).toEqual({ accepted: true })
    expect(found!.expiresAt).toBeUndefined() // No TTL for driver sync

    // Driver replay duplicate test (TEST 3)
    await expect(
      MutationLedgerCommandPort.recordSyncReceipt({
        mutationId: "sync1",
        actorId,
        operation: "location",
        entityId: "trip1",
        result: "conflict",
        response: {}
      })
    ).rejects.toThrow(/E11000 duplicate key error/)
  })

  it("CRITICAL DRIVER IDENTITY TEST: Same driver + mutationId but different operation is duplicate (TEST 4)", async () => {
    await MutationLedgerCommandPort.recordSyncReceipt({
      mutationId: "sync-diff-op",
      actorId,
      operation: "location",
      entityId: "trip1",
      result: "applied",
      response: { accepted: true }
    })

    // Different operation must still fail unique index
    await expect(
      MutationLedgerCommandPort.recordSyncReceipt({
        mutationId: "sync-diff-op",
        actorId,
        operation: "something_else",
        entityId: "trip1",
        result: "conflict",
        response: {}
      })
    ).rejects.toThrow(/E11000 duplicate key error/)
    
    const found = await MutationLedgerCommandPort.findSyncReceipt("sync-diff-op", actorId)
    expect(found).toBeDefined()
    expect(found!.operation).toBe("location") // Preserves original
  })

  it("Different Driver isolation: Same mutationId but different driverId is independent (TEST 5)", async () => {
    await MutationLedgerCommandPort.recordSyncReceipt({
      mutationId: "sync-diff-driver",
      actorId,
      operation: "location",
      entityId: "trip1",
      result: "applied",
      response: { accepted: true }
    })

    const actor2 = new mongoose.Types.ObjectId().toHexString()
    
    await MutationLedgerCommandPort.recordSyncReceipt({
      mutationId: "sync-diff-driver",
      actorId: actor2,
      operation: "location",
      entityId: "trip1",
      result: "applied",
      response: { ok: true }
    })
    
    const count = await MutationLedger.countDocuments({ mutationId: "sync-diff-driver" })
    expect(count).toBe(2)
  })

  it("Unified collection coexistence: API and Sync can coexist with same ID (TEST 6)", async () => {
    await MutationLedgerCommandPort.recordIdempotentResult({
      mutationId: "shared-id",
      requestHash: "hash",
      operation: "POST /api",
      actorId,
      statusCode: 200,
      response: {}
    })
    
    // Sync using same shared-id
    await MutationLedgerCommandPort.recordSyncReceipt({
      mutationId: "shared-id",
      actorId,
      operation: "location",
      entityId: "trip",
      result: "applied",
      response: {}
    })
    
    const count = await MutationLedger.countDocuments({ mutationId: "shared-id" })
    expect(count).toBe(2)
  })

  it("Driver sync: verifies ClientSession behavior (TEST 7)", async () => {
    const session = await mongoose.startSession()
    try {
      session.startTransaction()

      await MutationLedgerCommandPort.recordSyncReceipt(
        {
          mutationId: "sync-tx",
          actorId,
          operation: "location",
          entityId: "trip2",
          result: "applied",
          response: { ok: 1 }
        },
        session
      )

      // Should be found inside session
      const foundInSession = await MutationLedgerCommandPort.findSyncReceipt("sync-tx", actorId, session)
      expect(foundInSession).toBeDefined()

      // Should NOT be found outside session before commit
      const foundOutside = await MutationLedgerCommandPort.findSyncReceipt("sync-tx", actorId)
      expect(foundOutside).toBeNull()

      await session.commitTransaction()

      // Found outside after commit
      const finalFound = await MutationLedgerCommandPort.findSyncReceipt("sync-tx", actorId)
      expect(finalFound).toBeDefined()
    } finally {
      session.endSession()
    }
  })

  it("Verifies runtime indexes (TEST 8)", async () => {
    const indexes = await MutationLedger.collection.indexes()
    
    // Look for unique API index
    const uniqueApiIndex = indexes.find((i) => i.name === "mutationId_1_actorId_1_operation_1")
    expect(uniqueApiIndex).toBeDefined()
    expect(uniqueApiIndex?.unique).toBe(true)
    expect(uniqueApiIndex?.partialFilterExpression).toEqual({ namespace: "api" })
    
    // Look for unique Sync index
    const uniqueSyncIndex = indexes.find((i) => i.name === "mutationId_1_actorId_1")
    expect(uniqueSyncIndex).toBeDefined()
    expect(uniqueSyncIndex?.unique).toBe(true)
    expect(uniqueSyncIndex?.partialFilterExpression).toEqual({ namespace: "sync" })

    // Look for TTL index
    const ttlIndex = indexes.find((i) => i.name === "expiresAt_1")
    expect(ttlIndex).toBeDefined()
    expect(ttlIndex?.expireAfterSeconds).toBe(0)
  })
})
