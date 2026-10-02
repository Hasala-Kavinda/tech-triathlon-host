import { describe, it, expect, beforeEach, afterAll, beforeAll } from "vitest"
import mongoose from "mongoose"
import { connectDatabase, disconnectDatabase } from "../../connection.js"
import { loadConfig } from "../../../config/env.js"
import { up } from "./006_db08_split_calendar_day_persistence.js"

describe("Migration: 006_db08_split_calendar_day_persistence", () => {
  beforeAll(async () => {
    const config = loadConfig()
    await connectDatabase(config.mongodbUri)
  })

  beforeEach(async () => {
    const db = mongoose.connection.db
    if (!db) throw new Error("DB not connected")
    await db.collection("calendardays").deleteMany({})
    await db.collection("calendardays").dropIndexes()
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("should create unique index on date", async () => {
    const db = mongoose.connection.db!
    await up()
    const indexes = await db.collection("calendardays").indexes()
    const dateIndex = indexes.find(i => i.key.date === 1)
    expect(dateIndex).toBeDefined()
    expect(dateIndex?.unique).toBe(true)
  })

  it("should validate and trim existing fields", async () => {
    const db = mongoose.connection.db!
    await db.collection("calendardays").insertOne({
      date: "  2026-10-02  ",
      dayOfWeek: " Fri ",
      isWeekend: false,
      isoYear: 2026,
      isoWeek: 40,
      isPayday: false,
      isHoliday: false,
      monsoon: false,
      isOperating: true,
      version: 1
    })

    await up()

    const doc = await db.collection("calendardays").findOne({})
    expect(doc?.date).toBe("2026-10-02")
    expect(doc?.dayOfWeek).toBe("Fri")
    expect(doc?.version).toBeUndefined()
  })

  it("should fail on invalid date format", async () => {
    const db = mongoose.connection.db!
    await db.collection("calendardays").insertOne({
      date: "2026/10/02",
      dayOfWeek: "Fri",
      isWeekend: false,
      isoYear: 2026,
      isoWeek: 40,
      isPayday: false,
      isHoliday: false,
      monsoon: false,
      isOperating: true
    })

    await expect(up()).rejects.toThrow(/invalid date format/)
  })

  it("should deduplicate dates, keeping the first", async () => {
    const db = mongoose.connection.db!
    await db.collection("calendardays").insertMany([
      { date: "2026-10-02", isOperating: true },
      { date: "2026-10-02", isOperating: false } // duplicate
    ])

    await up()

    const count = await db.collection("calendardays").countDocuments({ date: "2026-10-02" })
    expect(count).toBe(1)
  })

  it("is idempotent", async () => {
    const db = mongoose.connection.db!
    await db.collection("calendardays").insertOne({
      date: "2026-10-02",
      dayOfWeek: "Fri",
      isWeekend: false,
      isoYear: 2026,
      isoWeek: 40,
      isPayday: false,
      isHoliday: false,
      monsoon: false,
      isOperating: true
    })

    await up()
    await up() // Second run should not throw

    const count = await db.collection("calendardays").countDocuments()
    expect(count).toBe(1)
  })
})
