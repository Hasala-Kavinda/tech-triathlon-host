import { describe, expect, it } from "vitest"
import { deriveOrderLifecycle, type LifecycleDelivery, type LifecycleOrder, type LifecycleTrip } from "./order-lifecycle.js"

const t = (hhmm: string) => new Date(`2026-10-04T${hhmm}:00.000Z`)
const order = (status: string, history: Array<[string, string]>, extra: Partial<LifecycleOrder> = {}): LifecycleOrder => ({
  status, createdAt: t("03:00"), requestedDate: "2026-10-04", statusHistory: history.map(([s, h]) => ({ status: s, at: t(h) })), ...extra,
})
const trip: LifecycleTrip = { status: "in_transit", startedAt: t("05:00"), stops: [{ tripStopId: "s1", plannedArrivalAt: t("05:30") }] }
const delivery = (status: string, extra: Partial<LifecycleDelivery> = {}): LifecycleDelivery => ({ status, tripStopId: "s1", ...extra })
const states = (l: ReturnType<typeof deriveOrderLifecycle>) => l.steps.map((s) => `${s.label}:${s.state}`)

describe("deriveOrderLifecycle", () => {
  it("a submitted order is on step 1, not scheduled, no expected arrival", () => {
    const l = deriveOrderLifecycle({ order: order("submitted", [["submitted", "03:00"]]) })
    expect(l.uiState).toBe("confirmed")
    expect(states(l)).toEqual(["Order confirmed:current", "Scheduled:future", "On the way:future", "Arrived:future", "Receipt confirmation:future"])
    expect(l.expectedArrivalAt).toBeNull()
    expect(l.steps[0]!.reachedAt).toBe(t("03:00").toISOString())
    expect(l.targetPlanningRun).toBe("2026-10-04")
  })

  it("allocated/loading/load_confirmed are 'Scheduled' (never step 1) with the real allocation time and expected arrival", () => {
    for (const status of ["allocated", "loading", "load_confirmed"]) {
      const l = deriveOrderLifecycle({ order: order(status, [["submitted", "03:00"], ["allocated", "03:30"]], { allocatedTripId: "t1" }), trip: { ...trip, status: "load_confirmed" }, delivery: delivery("pending") })
      expect(l.uiState).toBe("scheduled")
      expect(l.steps[1]).toMatchObject({ label: "Scheduled", state: "current", reachedAt: t("03:30").toISOString() })
      expect(l.expectedArrivalAt).toBe(t("05:30").toISOString())
    }
  })

  it("in_transit is 'On the way' with the departure stamp", () => {
    const l = deriveOrderLifecycle({ order: order("in_transit", [["submitted", "03:00"], ["allocated", "03:30"], ["in_transit", "05:00"]], { allocatedTripId: "t1" }), trip, delivery: delivery("pending") })
    expect(l.uiState).toBe("on-way")
    expect(l.steps.find((s) => s.key === "on_the_way")).toMatchObject({ state: "current", reachedAt: t("05:00").toISOString() })
  })

  it("the order is still in_transit when the delivery has ARRIVED: the delivery record decides step 4", () => {
    const l = deriveOrderLifecycle({ order: order("in_transit", [["submitted", "03:00"], ["allocated", "03:30"], ["in_transit", "05:00"]], { allocatedTripId: "t1" }), trip, delivery: delivery("arrived", { arrivedAt: t("05:31") }) })
    expect(l.uiState).toBe("arrived")
    expect(states(l)).toEqual(["Order confirmed:complete", "Scheduled:complete", "On the way:complete", "Arrived:current", "Receipt confirmation:future"])
    expect(l.steps.find((s) => s.key === "arrived")!.reachedAt).toBe(t("05:31").toISOString())
  })

  it("delivered without a receipt awaits confirmation (step 5 current)", () => {
    const l = deriveOrderLifecycle({ order: order("delivered", [["submitted", "03:00"], ["allocated", "03:30"], ["in_transit", "05:00"], ["delivered", "05:50"]], { allocatedTripId: "t1" }), trip, delivery: delivery("delivered", { arrivedAt: t("05:31"), completedAt: t("05:50") }) })
    expect(l.uiState).toBe("awaiting-confirmation")
    expect(l.awaitingReceipt).toBe(true)
    expect(states(l).slice(3)).toEqual(["Arrived:complete", "Receipt confirmation:current"])
  })

  it("a confirmed receipt completes every step with the receipt time; an issue is reported separately", () => {
    const base = { order: order("delivered", [["submitted", "03:00"], ["allocated", "03:30"], ["in_transit", "05:00"], ["delivered", "05:50"]], { allocatedTripId: "t1" }), trip }
    const ok = deriveOrderLifecycle({ ...base, delivery: delivery("receipt_confirmed", { arrivedAt: t("05:31"), receipt: { confirmedAt: t("06:10") } }) })
    expect(ok.uiState).toBe("receipt-confirmed")
    expect(ok.steps.every((s) => s.state === "complete")).toBe(true)
    expect(ok.steps.at(-1)!.reachedAt).toBe(t("06:10").toISOString())
    expect(deriveOrderLifecycle({ ...base, delivery: delivery("receipt_issue", { arrivedAt: t("05:31"), receipt: { confirmedAt: t("06:12") } }) }).uiState).toBe("receipt-issue")
  })

  it("deferral adds a Deferred step and stays current until the order is scheduled again", () => {
    const deferred = deriveOrderLifecycle({ order: order("deferred", [["submitted", "03:00"], ["deferred", "03:40"]]) })
    expect(deferred.uiState).toBe("deferred")
    expect(states(deferred).slice(0, 2)).toEqual(["Order confirmed:complete", "Deferred:current"])
    const later = deriveOrderLifecycle({ order: order("allocated", [["submitted", "03:00"], ["deferred", "03:40"], ["allocated", "04:00"]], { allocatedTripId: "t1" }), trip: { ...trip, status: "published" } })
    expect(later.wasDeferred).toBe(true)
    expect(later.uiState).toBe("scheduled")
    expect(later.steps.map((s) => s.label)).toEqual(["Order confirmed", "Deferred", "Scheduled", "On the way", "Arrived", "Receipt confirmation"])
  })

  it("a failed delivery still goes to receipt (Store reports the issue)", () => {
    const l = deriveOrderLifecycle({ order: order("delivery_failed", [["submitted", "03:00"], ["allocated", "03:30"], ["in_transit", "05:00"]], { allocatedTripId: "t1" }), trip, delivery: delivery("failed", { arrivedAt: t("05:31") }) })
    expect(l.uiState).toBe("awaiting-confirmation")
  })
})
