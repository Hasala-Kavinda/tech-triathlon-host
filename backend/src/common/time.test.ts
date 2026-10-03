import { DateTime } from "luxon"
import { describe, expect, it } from "vitest"
import { cutoffContext, cutoffFor, parseServiceDate, submissionContext } from "./time.js"

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

  describe("submissionContext (cutoff on the submission day)", () => {
    it("is before the cutoff one second before 16:00 Colombo", () => {
      const result = submissionContext(DateTime.fromISO("2026-10-03T10:29:59Z"))
      expect(result.submissionDay).toBe("2026-10-03")
      expect(result.cutoffBucket).toBe("before_cutoff")
      expect(result.secondsRemaining).toBe(1)
    })

    it("is after the cutoff at exactly 16:00 Colombo", () => {
      const result = submissionContext(DateTime.fromISO("2026-10-03T10:30:00Z"))
      expect(result.cutoffBucket).toBe("after_cutoff")
      expect(result.secondsRemaining).toBe(0)
    })

    it("uses the Colombo calendar day, not the UTC day", () => {
      // 20:00 UTC on 3 Oct is 01:30 on 4 Oct in Colombo: a new submission day, before its cutoff.
      const result = submissionContext(DateTime.fromISO("2026-10-03T20:00:00Z"))
      expect(result.submissionDay).toBe("2026-10-04")
      expect(result.cutoffBucket).toBe("before_cutoff")
    })

    it("does not depend on any delivery date", () => {
      const now = DateTime.fromISO("2026-10-03T14:00:00Z")
      expect(submissionContext(now).cutoffBucket).toBe("after_cutoff")
    })
  })

  it("rejects non-canonical service dates", () => {
    expect(() => parseServiceDate("01/10/2026")).toThrow("YYYY-MM-DD")
  })
})
