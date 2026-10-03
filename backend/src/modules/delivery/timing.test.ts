import { describe, expect, it } from "vitest"
import { isUndeliveredOutcome, timingResult, windowDeadlineAt } from "./timing.js"

describe("stop timing", () => {
  it("reads the outlet window close as a Colombo time on the service date", () => {
    expect(windowDeadlineAt("2026-10-05", "07:30")?.toISOString()).toBe("2026-10-05T02:00:00.000Z")
    expect(windowDeadlineAt("2026-10-05", "07:30:00")?.toISOString()).toBe("2026-10-05T02:00:00.000Z")
  })

  it("returns null for an unreadable window time instead of guessing", () => {
    expect(windowDeadlineAt("2026-10-05", "soon")).toBeNull()
  })

  it("is on time at the deadline and late one second after", () => {
    const deadline = new Date("2026-10-05T02:00:00.000Z")
    expect(timingResult(new Date("2026-10-05T02:00:00.000Z"), deadline)).toBe("on_time")
    expect(timingResult(new Date("2026-10-05T02:00:01.000Z"), deadline)).toBe("late")
  })

  it("treats failed, refused and closed as undelivered, and delivered and partial as delivered", () => {
    expect((["failed", "refused", "closed"] as const).every((o) => isUndeliveredOutcome(o))).toBe(true)
    expect((["delivered", "partial"] as const).some((o) => isUndeliveredOutcome(o))).toBe(false)
  })
})
