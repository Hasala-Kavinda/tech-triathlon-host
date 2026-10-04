import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import { loadConfig } from "../../../config/env.js"
import { connectDatabase, disconnectDatabase } from "../../../db/connection.js"
import { AuthHandoff } from "./auth-handoff.model.js"
import { User } from "./user.model.js"
import mongoose from "mongoose"

const config = loadConfig()

describe("DB-04: AuthHandoff Persistence", () => {
  beforeAll(async () => {
    await connectDatabase(config.mongodbUri)
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  beforeEach(async () => {
    await AuthHandoff.deleteMany({})
    await User.deleteMany({})
    await AuthHandoff.syncIndexes()
    await User.syncIndexes()
  })

  it("A. Required fields and schema constraints", async () => {
    const user = await User.create({ employeeId: "EMP-01", email: "e@t.com", name: "T", role: "driver", passwordHash: "h", active: true })
    
    // Missing fields should fail
    await expect(AuthHandoff.create({ codeHash: "h1" })).rejects.toThrow(/validation failed/)
    
    // Successful creation
    const doc = await AuthHandoff.create({
      codeHash: "h1",
      userId: user._id,
      intendedOrigin: "app1",
      expiresAt: new Date(Date.now() + 60000)
    })
    
    expect(doc.codeHash).toBe("h1")
    expect(doc.userId).toEqual(user._id)
    expect(doc.intendedOrigin).toBe("app1")
    expect(doc.consumedAt).toBeUndefined()
  })

  it("B. Secrecy: plaintext is not stored", async () => {
    const user = await User.create({ employeeId: "EMP-02", email: "e2@t.com", name: "T", role: "driver", passwordHash: "h", active: true })
    const doc = await AuthHandoff.create({
      codeHash: "hashed-version",
      userId: user._id,
      intendedOrigin: "app1",
      expiresAt: new Date(Date.now() + 60000)
    })
    
    const fetched = await AuthHandoff.findById(doc._id).lean()
    expect(fetched!.codeHash).toBe("hashed-version")
    expect((fetched as any).code).toBeUndefined()
  })

  it("C. Unique codeHash", async () => {
    const user = await User.create({ employeeId: "EMP-03", email: "e3@t.com", name: "T", role: "driver", passwordHash: "h", active: true })
    await AuthHandoff.create({ codeHash: "dup", userId: user._id, intendedOrigin: "app", expiresAt: new Date() })
    await expect(AuthHandoff.create({ codeHash: "dup", userId: user._id, intendedOrigin: "app", expiresAt: new Date() })).rejects.toThrow(/E11000 duplicate key/)
  })

  it("F. Wrong origin rejected", async () => {
    const user = await User.create({ employeeId: "EMP-04", email: "e4@t.com", name: "T", role: "driver", passwordHash: "h", active: true })
    await AuthHandoff.create({ codeHash: "hash", userId: user._id, intendedOrigin: "correct-origin", expiresAt: new Date(Date.now() + 60000) })
    
    const exchange = await AuthHandoff.findOneAndUpdate(
      { codeHash: "hash", intendedOrigin: "wrong-origin", consumedAt: { $exists: false }, expiresAt: { $gt: new Date() } },
      { $set: { consumedAt: new Date() } }
    )
    expect(exchange).toBeNull()
  })

  it("G. Expired handoff rejected", async () => {
    const user = await User.create({ employeeId: "EMP-05", email: "e5@t.com", name: "T", role: "driver", passwordHash: "h", active: true })
    await AuthHandoff.create({ codeHash: "hash", userId: user._id, intendedOrigin: "app", expiresAt: new Date(Date.now() - 1000) }) // already expired
    
    const exchange = await AuthHandoff.findOneAndUpdate(
      { codeHash: "hash", intendedOrigin: "app", consumedAt: { $exists: false }, expiresAt: { $gt: new Date() } },
      { $set: { consumedAt: new Date() } }
    )
    expect(exchange).toBeNull() // should fail due to application-level `$gt` logic
  })

  it("H. Consumed handoff rejected", async () => {
    const user = await User.create({ employeeId: "EMP-06", email: "e6@t.com", name: "T", role: "driver", passwordHash: "h", active: true })
    await AuthHandoff.create({ codeHash: "hash", userId: user._id, intendedOrigin: "app", expiresAt: new Date(Date.now() + 60000), consumedAt: new Date() }) 
    
    const exchange = await AuthHandoff.findOneAndUpdate(
      { codeHash: "hash", intendedOrigin: "app", consumedAt: { $exists: false }, expiresAt: { $gt: new Date() } },
      { $set: { consumedAt: new Date() } }
    )
    expect(exchange).toBeNull()
  })

  it("I. Replay race exactly one succeeds", async () => {
    const user = await User.create({ employeeId: "EMP-07", email: "e7@t.com", name: "T", role: "driver", passwordHash: "h", active: true })
    await AuthHandoff.create({ codeHash: "race-hash", userId: user._id, intendedOrigin: "app", expiresAt: new Date(Date.now() + 60000) }) 
    
    // Simulate concurrent consume
    const attempt1 = AuthHandoff.findOneAndUpdate(
      { codeHash: "race-hash", intendedOrigin: "app", consumedAt: { $exists: false }, expiresAt: { $gt: new Date() } },
      { $set: { consumedAt: new Date() } },
      { new: true }
    )
    const attempt2 = AuthHandoff.findOneAndUpdate(
      { codeHash: "race-hash", intendedOrigin: "app", consumedAt: { $exists: false }, expiresAt: { $gt: new Date() } },
      { $set: { consumedAt: new Date() } },
      { new: true }
    )
    const attempt3 = AuthHandoff.findOneAndUpdate(
      { codeHash: "race-hash", intendedOrigin: "app", consumedAt: { $exists: false }, expiresAt: { $gt: new Date() } },
      { $set: { consumedAt: new Date() } },
      { new: true }
    )

    const results = await Promise.all([attempt1, attempt2, attempt3])
    const successes = results.filter(r => r !== null)
    
    expect(successes.length).toBe(1) // Exactly one won the race
    expect(successes[0]!.consumedAt).toBeInstanceOf(Date)
  })
})
