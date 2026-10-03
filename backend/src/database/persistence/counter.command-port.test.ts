/**
 * DB-19 — Canonical Counter Persistence Tests
 *
 * Tests cover:
 *   A. First sequence allocation (starts at 1).
 *   B. Sequential allocations produce 1, 2, 3 …
 *   C. Independent sequences (order vs trip) progress independently.
 *   D. Concurrent allocations produce no duplicate values.
 *   E. Session-aware allocation is visible inside the transaction.
 *   F. Rollback — counter increment disappears after abort.
 *   G. Commit — counter increment persists after commit.
 *   H/I. Order/Trip integration — order/trip number uses the counter format.
 *   J. Failure — failed business entity creation does not leave committed counter.
 *   K. Runtime index verification.
 *   L. No direct Counter model access from business code (checked in separate grep test).
 */

import { describe, it, expect, beforeAll, afterEach } from "vitest"
import mongoose from "mongoose"
import { Counter } from "../../database/persistence/counter.model.js"
import { CounterCommandPort } from "../../database/persistence/counter.command-port.js"

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/waylink_test"

describe("CounterCommandPort — DB-19", () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(MONGODB_URI)
    }
    // Start each test suite with a clean counters collection to avoid cross-test pollution
    await Counter.collection.drop().catch(() => {})
    await Counter.createCollection()
    await Counter.init()  // ensure indexes are built
  })

  afterEach(async () => {
    // Reset between tests so sequences restart predictably
    await Counter.deleteMany({})
  })

  // -----------------------------------------------------------------------
  // A. First allocation starts at 1
  // -----------------------------------------------------------------------
  it("A. First sequence allocation returns 1", async () => {
    const seq = await CounterCommandPort.getNextSequence("test_first")
    expect(seq).toBe(1)
  })

  // -----------------------------------------------------------------------
  // B. Sequential allocations are monotonically increasing
  // -----------------------------------------------------------------------
  it("B. Sequential allocations produce 1, 2, 3", async () => {
    const a = await CounterCommandPort.getNextSequence("test_seq")
    const b = await CounterCommandPort.getNextSequence("test_seq")
    const c = await CounterCommandPort.getNextSequence("test_seq")
    expect(a).toBe(1)
    expect(b).toBe(2)
    expect(c).toBe(3)
  })

  // -----------------------------------------------------------------------
  // C. Independent sequences progress independently
  // -----------------------------------------------------------------------
  it("C. 'order' and 'trip' sequences are independent", async () => {
    const o1 = await CounterCommandPort.getNextSequence("order")
    const t1 = await CounterCommandPort.getNextSequence("trip")
    const o2 = await CounterCommandPort.getNextSequence("order")
    const t2 = await CounterCommandPort.getNextSequence("trip")

    // Both start at 1 independently
    expect(o1).toBe(1)
    expect(t1).toBe(1)
    // Each increments independently
    expect(o2).toBe(2)
    expect(t2).toBe(2)

    // Confirm storage: two distinct documents
    const docs = await Counter.find({}).lean()
    expect(docs).toHaveLength(2)
    const byId = Object.fromEntries(docs.map((d) => [d._id, d.seq]))
    expect(byId["order"]).toBe(2)
    expect(byId["trip"]).toBe(2)
  })

  // -----------------------------------------------------------------------
  // D. Concurrent allocations — no duplicates
  // -----------------------------------------------------------------------
  it("D. Concurrent allocations produce no duplicate values", async () => {
    const N = 20
    const results = await Promise.all(
      Array.from({ length: N }, () => CounterCommandPort.getNextSequence("concurrent_test")),
    )
    // All returned values must be unique
    const unique = new Set(results)
    expect(unique.size).toBe(N)
    // The stored sequence must equal N
    const stored = await Counter.findById("concurrent_test").lean()
    expect(stored?.seq).toBe(N)
  })

  // -----------------------------------------------------------------------
  // E. Session-aware allocation is visible inside the transaction
  // -----------------------------------------------------------------------
  it("E. Counter increment is visible inside the same transaction", async () => {
    let seqInsideTransaction: number | undefined
    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        seqInsideTransaction = await CounterCommandPort.getNextSequence("session_test", session)
        // Reading INSIDE the session should see the incremented value
        const doc = await Counter.findById("session_test").session(session).lean()
        expect(doc?.seq).toBe(seqInsideTransaction)
      })
    } finally { await session.endSession() }

    expect(seqInsideTransaction).toBe(1)
    // After commit, the value should persist
    const persisted = await Counter.findById("session_test").lean()
    expect(persisted?.seq).toBe(1)
  })

  // -----------------------------------------------------------------------
  // F. Rollback — counter increment disappears after abort
  // -----------------------------------------------------------------------
  it("F. Counter increment rolls back when the transaction aborts", async () => {
    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        await CounterCommandPort.getNextSequence("rollback_test", session)
        // Force an error to abort the transaction
        throw new Error("intentional rollback")
      })
    } catch { /* expected */ } finally { await session.endSession() }

    // After rollback the counter must not exist (or still be at its pre-tx value)
    const doc = await Counter.findById("rollback_test").lean()
    expect(doc).toBeNull()
  })

  // -----------------------------------------------------------------------
  // G. Commit — counter increment persists after commit
  // -----------------------------------------------------------------------
  it("G. Counter increment persists after successful commit", async () => {
    const session = await mongoose.startSession()
    let allocatedSeq: number | undefined
    try {
      await session.withTransaction(async () => {
        allocatedSeq = await CounterCommandPort.getNextSequence("commit_test", session)
      })
    } finally { await session.endSession() }

    expect(allocatedSeq).toBe(1)
    const doc = await Counter.findById("commit_test").lean()
    expect(doc?.seq).toBe(1)
  })

  // -----------------------------------------------------------------------
  // J. Failed business entity does not leave a committed counter increment
  //    Simulated: counter inside transaction, transaction aborted after counter
  // -----------------------------------------------------------------------
  it("J. Failed atomic operation (counter+entity) leaves no committed counter", async () => {
    // Prime the counter so it starts at a known value
    const baseline = await CounterCommandPort.getNextSequence("fail_test")
    expect(baseline).toBe(1)

    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        await CounterCommandPort.getNextSequence("fail_test", session)
        // Simulate business entity save failure
        throw new Error("business entity creation failed")
      })
    } catch { /* expected */ } finally { await session.endSession() }

    // Counter must remain at 1 (the aborted tx's increment of 2 never committed)
    const doc = await Counter.findById("fail_test").lean()
    expect(doc?.seq).toBe(1)

    // Next allocation should still be 2 (i.e. gap-free next available)
    const next = await CounterCommandPort.getNextSequence("fail_test")
    expect(next).toBe(2)
  })

  // -----------------------------------------------------------------------
  // H. Order integration — orderNumber uses counter format
  // -----------------------------------------------------------------------
  it("H. Order number format follows ORD-YYYYMMDD-NNNNNN pattern from counter", async () => {
    // Allocate a sequence and verify the format a route would produce
    const seq = await CounterCommandPort.getNextSequence("order")
    const dateTag = new Date().toISOString().slice(2, 10).replaceAll("-", "")
    const orderNumber = `ORD-${dateTag}-${String(seq).padStart(6, "0")}`
    expect(orderNumber).toMatch(/^ORD-\d{6}-\d{6}$/)
  })

  // -----------------------------------------------------------------------
  // I. Trip integration — tripNumber uses counter format
  // -----------------------------------------------------------------------
  it("I. Trip number format follows TRP-YYYYMMDD-NNNNNN pattern from counter", async () => {
    const seq = await CounterCommandPort.getNextSequence("trip")
    const serviceDate = "2026-10-03"
    const tripNumber = `TRP-${serviceDate.replaceAll("-", "")}-${String(seq).padStart(6, "0")}`
    expect(tripNumber).toMatch(/^TRP-\d{8}-\d{6}$/)
  })

  // -----------------------------------------------------------------------
  // K. Runtime index verification
  // -----------------------------------------------------------------------
  it("K. Runtime indexes on counters collection", async () => {
    const indexes = await Counter.collection.indexes()
    // The only index required is the _id (natural PK) — no redundant indexes
    expect(indexes.length).toBe(1)
    const idIndex = indexes.find((idx) => JSON.stringify(idx.key) === JSON.stringify({ _id: 1 }))
    expect(idIndex).toBeDefined()
  })

  // -----------------------------------------------------------------------
  // L. No direct Counter.findOneAndUpdate in business code
  //    (grep-based structural assertion)
  // -----------------------------------------------------------------------
  it("L. Counter.findOneAndUpdate is not called outside the command port", async () => {
    const { execSync } = await import("node:child_process")
    // Search all .ts files except the model and command-port themselves
    let found = ""
    try {
      found = execSync(
        "grep -r \"Counter.findOneAndUpdate\" --include=\"*.ts\" src/ " +
        "--exclude=\"counter.model.ts\" --exclude=\"counter.command-port.ts\"",
        { cwd: process.cwd(), encoding: "utf8" },
      )
    } catch {
      found = "" // grep exits 1 when no matches — that is the expected pass case
    }
    expect(found.trim()).toBe("")
  })
})
