import { describe, it, expect, beforeAll, afterAll } from "vitest"
import mongoose from "mongoose"
import argon2 from "argon2"
import { loadConfig } from "../../../config/env.js"
import { connectDatabase, disconnectDatabase } from "../../../db/connection.js"
import { User, type UserDoc } from "./user.model.js"

const config = loadConfig()

describe("DB-03: User Persistence", () => {
  beforeAll(async () => {
    await connectDatabase(config.mongodbUri)
    await User.deleteMany({}) // Start clean for these focused tests
    await User.syncIndexes()
  })

  afterAll(async () => {
    await User.deleteMany({})
    await disconnectDatabase()
  })

  it("1. UNIQUE EMPLOYEE ID: prevents duplicate employeeIds", async () => {
    await User.create({ employeeId: "EMP-001", email: "emp1@example.com", name: "Emp One", role: "driver", passwordHash: "hash1", active: true })
    const dup = new User({ employeeId: "emp-001", email: "emp2@example.com", name: "Emp Two", role: "driver", passwordHash: "hash2", active: true })
    
    let error: any
    try {
      await dup.save()
    } catch (e: any) {
      error = e
    }
    expect(error).toBeDefined()
    expect(error.code).toBe(11000) // MongoDB Duplicate Key
  })

  it("2. UNIQUE NORMALIZED EMAIL: uniqueness works after normalization", async () => {
    await User.create({ employeeId: "EMP-002", email: "EMP3@EXAMPLE.COM ", name: "Emp Three", role: "driver", passwordHash: "hash3", active: true })
    const dup = new User({ employeeId: "EMP-004", email: "emp3@example.com", name: "Emp Four", role: "driver", passwordHash: "hash4", active: true })
    
    let error: any
    try {
      await dup.save()
    } catch (e: any) {
      error = e
    }
    expect(error).toBeDefined()
    expect(error.code).toBe(11000)
  })

  it("3. PASSWORD HASH HIDING: normal serialization does not expose password hash", async () => {
    const user = await User.create({ employeeId: "EMP-005", email: "emp5@example.com", name: "Emp Five", role: "loader", passwordHash: "hash5", active: true })
    
    // Default fetch
    const fetched = await User.findById(user._id).lean()
    expect(fetched).toBeDefined()
    expect((fetched as any).passwordHash).toBeUndefined()
    
    // Explicit selection
    const fetchedWithAuth = await User.findById(user._id).select("+passwordHash").lean()
    expect((fetchedWithAuth as any).passwordHash).toBe("hash5")
  })

  it("4. ROLE QUERY: can query/filter by role", async () => {
    await User.create({ employeeId: "EMP-006", email: "emp6@example.com", name: "Emp Six", role: "store_manager", passwordHash: "hash6", active: true })
    await User.create({ employeeId: "EMP-007", email: "emp7@example.com", name: "Emp Seven", role: "store_manager", passwordHash: "hash7", active: false })

    const managers = await User.find({ role: "store_manager", active: true })
    expect(managers.some(m => m.employeeId === "EMP-006")).toBe(true)
    expect(managers.some(m => m.employeeId === "EMP-007")).toBe(false)
  })

  it("5. OUTLET QUERY: can retrieve users by outlet identity", async () => {
    await User.create({ employeeId: "EMP-008", email: "emp8@example.com", name: "Emp Eight", role: "store_manager", outletId: "OUT-001", passwordHash: "hash8", active: true })
    
    const users = await User.find({ outletId: "OUT-001" })
    expect(users.length).toBeGreaterThan(0)
    expect(users[0]!.employeeId).toBe("EMP-008")
  })

  it("6. DEPOT QUERY: can retrieve users by depot identity", async () => {
    await User.create({ employeeId: "EMP-009", email: "emp9@example.com", name: "Emp Nine", role: "driver", depot: "DPT-001", passwordHash: "hash9", active: true })
    
    const users = await User.find({ depot: "DPT-001" })
    expect(users.length).toBeGreaterThan(0)
    expect(users[0]!.employeeId).toBe("EMP-009")
  })

  it("7. LEGACY MIGRATION: existing compatible data remains usable", async () => {
    // Simulate raw insertion bypassing Mongoose validation/normalization
    const rawUser = {
      employeeId: "EMP-LEGACY",
      email: "LEGACY@EXAMPLE.COM ", // Unnormalized
      name: "Legacy User",
      role: "driver",
      passwordHash: await argon2.hash("Legacy@123"),
      active: true,
      legacyField: "should_be_ignored",
      version: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    await mongoose.connection.collection("users").insertOne(rawUser)
    
    // Access through new model
    const legacyUser = await User.findOne({ employeeId: "EMP-LEGACY" })
    expect(legacyUser).toBeDefined()
    expect(legacyUser!.name).toBe("Legacy User")
    
    // Save to trigger normalization/strict behavior
    // We expect Mongoose to drop legacyField. Touching email triggers its setter.
    legacyUser!.name = "Updated Legacy User"
    legacyUser!.email = legacyUser!.email
    await legacyUser!.save()

    const updated = await User.findOne({ employeeId: "EMP-LEGACY" }).lean()
    expect(updated!.email).toBe("legacy@example.com")
  })

  it("8. EXISTING AUTH COMPATIBILITY: auth flow finds active user and verifies password", async () => {
    const hash = await argon2.hash("Auth@123")
    await User.create({ employeeId: "EMP-AUTH", email: "auth@example.com", name: "Auth User", role: "dispatcher", passwordHash: hash, active: true })
    
    // Mock the exact auth query from auth/routes.ts
    const user = await User.findOne({ employeeId: "EMP-AUTH", active: true }).select("+passwordHash")
    expect(user).toBeDefined()
    
    const passwordValid = await argon2.verify(user!.passwordHash, "Auth@123").catch(() => false)
    expect(passwordValid).toBe(true)
    
    const emailValid = user!.email === "auth@example.com"
    expect(emailValid).toBe(true)
  })
})
