import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import { loadConfig } from "../../config/env.js"
import { connectDatabase, disconnectDatabase } from "../connection.js"
import { MigrationRunner, Migration } from "./runner.js"
import { SchemaMigration, MigrationLock } from "./ledger.model.js"

const config = loadConfig()

describe("DB-01: Migration Runner", () => {
  beforeAll(async () => {
    await connectDatabase(config.mongodbUri)
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  beforeEach(async () => {
    await SchemaMigration.deleteMany({})
    await MigrationLock.deleteMany({})
  })

  it("1. fresh migration runs successfully and records to ledger", async () => {
    let runCount = 0
    const m1: Migration = { name: "001_first", up: async () => { runCount++ } }
    
    await MigrationRunner.run(undefined, [m1])
    
    expect(runCount).toBe(1)
    const ledger = await SchemaMigration.find({ status: "applied" })
    expect(ledger).toHaveLength(1)
    expect(ledger[0]!.name).toBe("001_first")
  })

  it("2. repeated migration is a no-op", async () => {
    let runCount = 0
    const m1: Migration = { name: "001_first", up: async () => { runCount++ } }
    
    await MigrationRunner.run(undefined, [m1])
    await MigrationRunner.run(undefined, [m1])
    
    expect(runCount).toBe(1) // only ran once
    const ledger = await SchemaMigration.find({ status: "applied" })
    expect(ledger).toHaveLength(1)
  })

  it("3. out-of-order handling / deterministic ordering", async () => {
    const executed: string[] = []
    const migrations: Migration[] = [
      { name: "003_third", up: async () => { executed.push("003_third") } },
      { name: "001_first", up: async () => { executed.push("001_first") } },
      { name: "002_second", up: async () => { executed.push("002_second") } },
    ]
    
    // Ensure the runner executes them in deterministic string order despite array order
    await MigrationRunner.run(undefined, migrations)
    
    expect(executed).toEqual(["001_first", "002_second", "003_third"])
  })

  it("4. failed migration is not recorded as applied", async () => {
    let runCount = 0
    const m1: Migration = { name: "001_success", up: async () => { runCount++ } }
    const m2: Migration = { name: "002_fail", up: async () => { throw new Error("forced failure") } }
    const m3: Migration = { name: "003_skipped", up: async () => { runCount++ } }
    
    let caught = false
    try {
      await MigrationRunner.run(undefined, [m1, m2, m3])
    } catch (error: any) {
      caught = true
      expect(error.message).toBe("forced failure")
    }
    
    expect(caught).toBe(true)
    
    const ledger = await SchemaMigration.find({ status: "applied" })
    expect(ledger).toHaveLength(1)
    expect(ledger[0]!.name).toBe("001_success")
    
    // m3 should not have run because m2 failed and halted
    expect(runCount).toBe(1)
    
    // If we fix m2, it should pick up from m2
    const m2Fixed: Migration = { name: "002_fail", up: async () => { runCount++ } }
    await MigrationRunner.run(undefined, [m1, m2Fixed, m3])
    
    // Total runs: m1 ran once previously, m2 ran once now, m3 ran once now. Total 3.
    expect(runCount).toBe(3)
    const ledgerAfter = await SchemaMigration.find({ status: "applied" })
    expect(ledgerAfter).toHaveLength(3)
  })

  it("5. fails to run if lock cannot be acquired", async () => {
    // Manually hold the lock
    await MigrationLock.create({ _id: "global_lock", lockedAt: new Date() })
    
    let caught = false
    try {
      await MigrationRunner.run(undefined, [{ name: "001", up: async () => {} }])
    } catch (e: any) {
      caught = true
      expect(e.message).toMatch(/lock/)
    }
    expect(caught).toBe(true)
  })
})
