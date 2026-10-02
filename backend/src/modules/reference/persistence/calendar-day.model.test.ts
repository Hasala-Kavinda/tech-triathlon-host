import { describe, it, expect, beforeEach, afterAll, beforeAll } from "vitest"
import mongoose from "mongoose"
import { connectDatabase, disconnectDatabase } from "../../../db/connection.js"
import { loadConfig } from "../../../config/env.js"
import { CalendarDay } from "./calendar-day.model.js"

describe("CalendarDay Model", () => {
  beforeAll(async () => {
    const config = loadConfig()
    await connectDatabase(config.mongodbUri)
  })

  beforeEach(async () => {
    await CalendarDay.deleteMany({})
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("should create a valid calendar day", async () => {
    const day = await CalendarDay.create({
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

    expect(day.date).toBe("2026-10-02")
    expect(day.dayOfWeek).toBe("Fri")
    expect(day.isOperating).toBe(true)
  })

  it("should fail if required fields are missing", async () => {
    await expect(CalendarDay.create({ date: "2026-10-03" })).rejects.toThrow(mongoose.Error.ValidationError)
  })

  it("should enforce date uniqueness", async () => {
    const data = {
      date: "2026-10-02",
      dayOfWeek: "Fri",
      isWeekend: false,
      isoYear: 2026,
      isoWeek: 40,
      isPayday: false,
      isHoliday: false,
      monsoon: false,
      isOperating: true
    }
    await CalendarDay.create(data)
    await expect(CalendarDay.create(data)).rejects.toThrow(/duplicate key error/)
  })

  it("should maintain canonical date representation independent of timezone", async () => {
    const day = await CalendarDay.create({
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

    // No conversion to Date object means it stays perfectly as inserted.
    expect(day.date).toBe("2026-10-02")
  })
})
