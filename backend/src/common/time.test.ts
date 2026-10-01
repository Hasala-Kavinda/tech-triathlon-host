import { DateTime } from "luxon"
import { describe, expect, it } from "vitest"
import { cutoffContext, cutoffFor, parseServiceDate } from "./time.js"

describe("Asia/Colombo operating time", () => {
  it("sets the cutoff to 16:00 local time", () => {
    expect(cutoffFor("2026-10-01").toISO()).toContain("T16:00:00.000+05:30")
  })

  it("classifies one second before the cutoff", () => {
    const result = cutoffContext("2026-10-01", DateTime.fromISO("2026-10-01T10:29:59Z"))
    expect(result.cutoffBucket).toBe("before_cutoff")
    expect(result.secondsRemaining).toBe(1)
  })

  it("classifies the exact cutoff as after cutoff", () => {
    const result = cutoffContext("2026-10-01", DateTime.fromISO("2026-10-01T10:30:00Z"))
    expect(result.cutoffBucket).toBe("after_cutoff")
    expect(result.secondsRemaining).toBe(0)
  })

  it("rejects non-canonical service dates", () => {
    expect(() => parseServiceDate("01/10/2026")).toThrow("YYYY-MM-DD")
  })
})
