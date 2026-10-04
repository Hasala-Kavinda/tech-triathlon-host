import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import { loadConfig } from "../../../config/env.js"
import { connectDatabase, disconnectDatabase } from "../../connection.js"
import mongoose from "mongoose"
import { up } from "./001_db03_split_user_persistence.js"

const config = loadConfig()

describe("DB-03 Migration: 001_db03_split_user_persistence", () => {
  let db: mongoose.mongo.Db
  let users: mongoose.mongo.Collection

  beforeAll(async () => {
    await connectDatabase(config.mongodbUri)
    db = mongoose.connection.db!
    users = db.collection("users")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  beforeEach(async () => {
    await users.deleteMany({})
    await users.dropIndexes().catch(() => {}) // drop all indexes except _id
  })

  it("A. Fresh database executes successfully", async () => {
    await expect(up()).resolves.toBeUndefined()
  })

  it("B, C, D, G, H. Transforms legacy data correctly", async () => {
    await users.insertOne({
      employeeId: " emp-01 ",
      email: " User@EXAMPLE.com ",
      name: "Test User",
      role: "driver",
      passwordHash: "hash123",
      depot: "DPT-01",
      active: true,
      lastLoginAt: new Date("2024-01-01")
    })

    await up()

    const transformed = await users.findOne({ name: "Test User" })
    expect(transformed).toBeDefined()
    expect(transformed?.employeeId).toBe("EMP-01")
    expect(transformed?.email).toBe("user@example.com")
    expect(transformed?.passwordHash).toBe("hash123")
    expect(transformed?.role).toBe("driver")
    expect(transformed?.depot).toBe("DPT-01")
    expect(transformed?.lastLoginAt).toBeInstanceOf(Date)
  })

  it("E. Duplicate normalized email fails and prevents index creation", async () => {
    await users.insertMany([
      { employeeId: "EMP-01", email: "conflict@example.com" },
      { employeeId: "EMP-02", email: " CONFLICT@example.com " },
    ])

    await expect(up()).rejects.toThrow(/Duplicate normalized emails detected: conflict@example.com/)

    // Ensure documents were NOT deleted or merged
    const count = await users.countDocuments()
    expect(count).toBe(2)

    // Ensure unique index was NOT created
    const indexes = await users.indexes()
    const emailIndex = indexes.find(i => i.name === "email_1")
    expect(emailIndex).toBeUndefined()
  })

  it("F. Duplicate normalized employee ID fails", async () => {
    await users.insertMany([
      { employeeId: "emp-99", email: "u1@example.com" },
      { employeeId: " EMP-99 ", email: "u2@example.com" },
    ])

    await expect(up()).rejects.toThrow(/Duplicate normalized employee IDs detected: EMP-99/)
  })

  it("Preflight A, C, E. Missing, null, empty/whitespace email fails", async () => {
    await users.insertOne({ employeeId: "EMP-100", name: "missing email" })
    await expect(up()).rejects.toThrow(/Users missing required 'email' field detected/)
    await users.deleteMany({})

    await users.insertOne({ employeeId: "EMP-100", email: null })
    await expect(up()).rejects.toThrow(/Users missing required 'email' field detected/)
    await users.deleteMany({})

    await users.insertOne({ employeeId: "EMP-100", email: "   " })
    await expect(up()).rejects.toThrow(/Users missing required 'email' field detected/)
  })

  it("Preflight B, D, F. Missing, null, empty/whitespace employeeId fails", async () => {
    await users.insertOne({ email: "missing@example.com", name: "missing emp" })
    await expect(up()).rejects.toThrow(/Users missing required 'employeeId' field detected/)
    await users.deleteMany({})

    await users.insertOne({ employeeId: null, email: "missing@example.com" })
    await expect(up()).rejects.toThrow(/Users missing required 'employeeId' field detected/)
    await users.deleteMany({})

    await users.insertOne({ employeeId: "   ", email: "missing@example.com" })
    await expect(up()).rejects.toThrow(/Users missing required 'employeeId' field detected/)
  })

  it("I. Idempotency: Running twice produces no additional changes", async () => {
    await users.insertOne({ employeeId: " e-1 ", email: " E1@test.com " })
    
    await up() // first run
    const first = await users.findOne({})
    expect(first?.employeeId).toBe("E-1")

    await up() // second run
    const second = await users.findOne({})
    expect(second?.employeeId).toBe("E-1")
    expect(second?._id.toString()).toBe(first?._id.toString()) // same doc
  })

  it("J. Index reconciliation installs DB-03 required indexes", async () => {
    await users.insertOne({ employeeId: "IDX-1", email: "idx@example.com", role: "driver", active: true })
    
    await up()

    const indexes = await users.indexes()
    expect(indexes.find(i => i.name === "employeeId_1")?.unique).toBe(true)
    expect(indexes.find(i => i.name === "email_1")?.unique).toBe(true)
    expect(indexes.find(i => i.name === "role_1_active_1")).toBeDefined()
  })
})
