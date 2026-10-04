import { describe, expect, it } from "vitest"
import { clock, runAsOf } from "./clock.js"
import { submissionContext } from "./time.js"

describe("clock", () => {
  it("is the real clock when no scope is set", () => {
    const before = Date.now()
    const t = clock.now().getTime()
    expect(t).toBeGreaterThanOrEqual(before)
    expect(t).toBeLessThanOrEqual(Date.now())
  })

  it("runAsOf simulates an instant only inside its async scope, and survives awaits", async () => {
    const at = new Date("2026-10-03T08:30:00Z") // 14:00 in Colombo
    const inside = await runAsOf(at, async () => { await new Promise((r) => setTimeout(r, 5)); return clock.now().toISOString() })
    expect(inside).toBe(at.toISOString())
    expect(Math.abs(clock.now().getTime() - Date.now())).toBeLessThan(1000) // back to real time outside
  })

  it("scopes do not leak between concurrent runs", async () => {
    const a = new Date("2026-01-01T00:00:00Z"), b = new Date("2027-01-01T00:00:00Z")
    const [ra, rb] = await Promise.all([
      runAsOf(a, async () => { await new Promise((r) => setTimeout(r, 10)); return clock.now().toISOString() }),
      runAsOf(b, async () => { await new Promise((r) => setTimeout(r, 1)); return clock.now().toISOString() }),
    ])
    expect([ra, rb]).toEqual([a.toISOString(), b.toISOString()])
  })

  it("the real 16:00 Asia/Colombo cutoff rule evaluates against the simulated time (rule unchanged)", () => {
    const at = (iso: string) => runAsOf(new Date(iso), () => submissionContext())
    expect(at("2026-10-05T10:29:59Z")).toMatchObject({ submissionDay: "2026-10-05", cutoffBucket: "before_cutoff" }) // 15:59:59 Colombo
    expect(at("2026-10-05T10:30:00Z")).toMatchObject({ submissionDay: "2026-10-05", cutoffBucket: "after_cutoff" }) // 16:00:00 Colombo
    expect(at("2026-10-03T08:30:00Z")).toMatchObject({ submissionDay: "2026-10-03", cutoffBucket: "before_cutoff" }) // "yesterday 14:00"
  })
})
