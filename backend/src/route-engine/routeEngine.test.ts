import { describe, expect, it } from "vitest"
import { buildRoute } from "./buildRoute.js"
import { filterEligibleOrders } from "./eligibleOrders.js"
import { evaluateRoute } from "./evaluate.js"
import { planFromOrders, planFromVehicle, recompute } from "./plan.js"
import { rankVehiclesForOrders } from "./rankVehicles.js"
import { suggestOrderPack } from "./suggestPack.js"
import { cutoffBucket } from "./time.js"
import {
  codes, data, FRESH_GAMPAHA, FRESH_REAR_0730, FRESH_REAR_0730_B, FRESH_REAR_0745, FRESH_REAR_0745_B, FRESH_STREET_0800, FRESH_VAN_ONLY,
  KANDY_OUTLET, makeCtx, MONDAY, order, SATURDAY, STYLE_MALL_1030, STYLE_REAR, STYLE_STREET, SUNDAY, TECH_REAR, vehicle,
} from "./testkit.js"
import type { EngineOutlet, PlanEdit } from "./types.js"

const TRUCK_REEFER = vehicle("VEH001") // truck, reefer, 5510 kg, 26.4 m3, 4.7 km/l, quota 340 L, Peliyagoda
const TRUCK_AMBIENT = vehicle("VEH008") // truck, ambient, 3800 kg, 22 m3, Peliyagoda
const VAN_REEFER = vehicle("VEH035") // van, reefer, 1040 kg, 7.0 m3, Peliyagoda
const VAN_AMBIENT = vehicle("VEH037") // van, ambient, 1100 kg, 8.0 m3, 11.5 km/l, quota 340 L, Peliyagoda

describe("reference data the tests rely on (real Drive Data CSVs)", () => {
  it("has the anchor rows", () => {
    expect(data.vehicles).toHaveLength(60)
    expect(data.outlets.get(FRESH_REAR_0730)).toMatchObject({ brand: "Fresh", district: "Colombo", dockType: "rear_dock", windowClose: "07:30" })
    expect(data.outlets.get(FRESH_VAN_ONLY)).toMatchObject({ parkingConstraint: "van_only" })
    expect(data.outlets.get(STYLE_MALL_1030)).toMatchObject({ parkingConstraint: "mall_dock", windowOpen: "10:30", windowClose: "12:30" })
    expect(data.travel.find("Peliyagoda", "Colombo")).toMatchObject({ depotToDistrictMin: 24, interStopMin: 8, depotToDistrictKm: 12, interStopKm: 4 })
    expect(data.allowances.find("Fresh", "rear_dock")).toBe(15)
    expect(data.allowances.find("Style", "mall_bay")).toBe(59)
  })
})

describe("vehicle eligibility - rules 1-7", () => {
  it("rule 1: weight over capacity fails, at capacity passes", () => {
    const ctx = makeCtx()
    expect(codes(evaluateRoute(VAN_AMBIENT, [order(STYLE_REAR, { weightKg: 1101 })], ctx))).toContain("WEIGHT_CAPACITY")
    expect(evaluateRoute(VAN_AMBIENT, [order(STYLE_REAR, { weightKg: 1100 })], ctx).feasible).toBe(true)
  })

  it("rule 2: volume over capacity fails, at capacity passes", () => {
    const ctx = makeCtx()
    expect(codes(evaluateRoute(VAN_AMBIENT, [order(STYLE_REAR, { volumeM3: 8.01 })], ctx))).toContain("VOLUME_CAPACITY")
    expect(evaluateRoute(VAN_AMBIENT, [order(STYLE_REAR, { volumeM3: 8 })], ctx).feasible).toBe(true)
  })

  it("rule 3: chilled/frozen needs reefer; reefer may carry ambient; ambient never carries chilled", () => {
    const ctx = makeCtx()
    const chilled = order(FRESH_REAR_0745, { needsReefer: true })
    const ambient = order(FRESH_REAR_0745, { needsReefer: false })
    expect(codes(evaluateRoute(TRUCK_AMBIENT, [chilled], ctx))).toContain("TEMPERATURE")
    expect(evaluateRoute(TRUCK_REEFER, [chilled], ctx).feasible).toBe(true)
    expect(evaluateRoute(TRUCK_REEFER, [ambient], ctx).feasible).toBe(true)
    expect(evaluateRoute(TRUCK_AMBIENT, [ambient], ctx).feasible).toBe(true)
  })

  it("rule 4: weekly fuel quota - committed + this trip", () => {
    // Colombo trip of 2 orders = 12 + 4 = 16 km on a 11.5 km/l van = 1.391 L; quota 340 L.
    const orders = [order(STYLE_REAR), order(STYLE_STREET)]
    const fits = evaluateRoute(VAN_AMBIENT, orders, makeCtx({ state: { VEH037: { weeklyFuelUsedL: 338 } } }))
    expect(fits.fuelL).toBeCloseTo(16 / 11.5, 5)
    expect(fits.feasible).toBe(true)
    const over = evaluateRoute(VAN_AMBIENT, orders, makeCtx({ state: { VEH037: { weeklyFuelUsedL: 339 } } }))
    expect(codes(over)).toContain("FUEL_QUOTA")
    // Quota already exhausted: ineligible even before any order is chosen.
    expect(codes(evaluateRoute(VAN_AMBIENT, [], makeCtx({ state: { VEH037: { weeklyFuelUsedL: 340 } } })))).toContain("FUEL_QUOTA")
  })

  it("rule 5: at most 2 routes a day", () => {
    const o = [order(STYLE_REAR)]
    expect(evaluateRoute(VAN_AMBIENT, o, makeCtx({ state: { VEH037: { turnsToday: 1 } } })).feasible).toBe(true)
    expect(codes(evaluateRoute(VAN_AMBIENT, o, makeCtx({ state: { VEH037: { turnsToday: 2 } } })))).toContain("TURNS_PER_DAY")
  })

  it("rule 5: Monday-Saturday only; Sunday is closed", () => {
    const o = (date: string) => [order(STYLE_REAR, { requestedDate: date })]
    expect(evaluateRoute(VAN_AMBIENT, o(SATURDAY), makeCtx({ serviceDate: SATURDAY })).feasible).toBe(true)
    expect(codes(evaluateRoute(VAN_AMBIENT, o(SUNDAY), makeCtx({ serviceDate: SUNDAY })))).toContain("NOT_OPERATING_DAY")
    expect(codes(evaluateRoute(VAN_AMBIENT, o(MONDAY), makeCtx({ isOperatingDay: false })))).toContain("NOT_OPERATING_DAY")
  })

  it("rule 6: driver availability is not a constraint (the engine has no driver input at all)", () => {
    const ctx = makeCtx()
    expect(Object.keys(ctx).some((k) => /driver/i.test(k))).toBe(false)
    expect(evaluateRoute(VAN_AMBIENT, [order(STYLE_REAR)], ctx).feasible).toBe(true)
  })

  it("rule 7: a vehicle never serves another depot's outlet", () => {
    const kandyOrder = order(KANDY_OUTLET, { needsReefer: false })
    expect(data.outlets.get(KANDY_OUTLET)?.depot).toBe("Kandy")
    expect(codes(evaluateRoute(TRUCK_REEFER, [kandyOrder], makeCtx()))).toContain("DEPOT_MISMATCH")
    const kandyVan = data.vehicles.find((v) => v.depot === "Kandy" && v.type === "van")!
    expect(codes(evaluateRoute(kandyVan, [kandyOrder], makeCtx()))).not.toContain("DEPOT_MISMATCH")
  })
})

describe("order eligibility - rules 8-13", () => {
  it("rule 8: same brand AND same district on one trip", () => {
    const ctx = makeCtx()
    const mixedBrand = evaluateRoute(TRUCK_REEFER, [order(STYLE_REAR), order(TECH_REAR)], ctx)
    expect(codes(mixedBrand)).toContain("SAME_BRAND")
    const mixedDistrict = evaluateRoute(TRUCK_REEFER, [order(FRESH_REAR_0745), order(FRESH_GAMPAHA)], ctx)
    expect(codes(mixedDistrict)).toContain("SAME_DISTRICT")
    expect(mixedDistrict.tripMinutes).toBeNull()
    expect(evaluateRoute(TRUCK_REEFER, [order(FRESH_REAR_0745), order(FRESH_REAR_0745_B)], ctx).feasible).toBe(true)
  })

  it("rule 9: chilled/frozen orders are not offered to ambient vehicles", () => {
    const chilled = order(FRESH_REAR_0745, { needsReefer: true })
    const annotated = filterEligibleOrders(TRUCK_AMBIENT, [chilled], [], makeCtx())[0]!
    expect(annotated.eligible).toBe(false)
    expect(annotated.reasons.map((r) => r.code)).toContain("TEMPERATURE")
  })

  it("rule 10: van_only outlets need a van, whatever the capacity", () => {
    const o = order(FRESH_VAN_ONLY)
    expect(codes(evaluateRoute(TRUCK_REEFER, [o], makeCtx()))).toContain("VAN_ONLY")
    expect(evaluateRoute(VAN_REEFER, [o], makeCtx()).feasible).toBe(true)
  })

  it("rule 11: mall_dock stops must fall inside the mall window", () => {
    // Colombo outbound 24 min + mall_dock arrival; window 10:30-12:30.
    const o = [order(STYLE_MALL_1030)]
    const early = evaluateRoute(VAN_AMBIENT, o, makeCtx({ styleTechDepartureMin: 10 * 60 })) // arrives 10:24
    expect(codes(early)).toContain("MALL_WINDOW")
    const ok = evaluateRoute(VAN_AMBIENT, o, makeCtx({ styleTechDepartureMin: 10 * 60 + 20 })) // arrives 10:44
    expect(ok.feasible).toBe(true)
    const late = evaluateRoute(VAN_AMBIENT, o, makeCtx({ styleTechDepartureMin: 12 * 60 + 10 })) // arrives 12:34
    expect(codes(late)).toContain("MALL_WINDOW")
    // Without a departure time the rule cannot be evaluated: it is surfaced, never silently passed.
    expect(evaluateRoute(VAN_AMBIENT, o, makeCtx()).warnings.join(" ")).toMatch(/Mall delivery window not evaluated/)
  })

  it("rule 12: whole orders only - never duplicated, never split in a pack", () => {
    const o = order(STYLE_REAR)
    expect(codes(evaluateRoute(VAN_AMBIENT, [o, o], makeCtx()))).toContain("DUPLICATE_ORDER")
    const open = Array.from({ length: 6 }, () => order(STYLE_REAR, { weightKg: 300 }))
    const pack = suggestOrderPack(VAN_AMBIENT, open, [], makeCtx())
    const ids = pack.suggested.map((x) => x.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(pack.suggested).toHaveLength(3) // 3 x 300 kg = 900; a 4th would exceed 1100 kg - it is excluded whole, not trimmed
    expect(pack.suggested.every((s) => s.weightKg === 300)).toBe(true)
    expect(pack.excluded).toHaveLength(3)
  })

  it("rule 13: only unallocated submitted/deferred orders are suggestable", () => {
    const ctx = makeCtx()
    for (const status of ["planned", "allocated", "cancelled", "delivered", "in_transit"]) {
      expect(codes(evaluateRoute(VAN_AMBIENT, [order(STYLE_REAR, { status })], ctx))).toContain("ORDER_NOT_ELIGIBLE")
    }
    expect(codes(evaluateRoute(VAN_AMBIENT, [order(STYLE_REAR, { allocated: true })], ctx))).toContain("ORDER_NOT_ELIGIBLE")
    expect(evaluateRoute(VAN_AMBIENT, [order(STYLE_REAR, { status: "deferred" })], ctx).feasible).toBe(true)
    expect(evaluateRoute(VAN_AMBIENT, [order(STYLE_REAR, { status: "submitted" })], ctx).feasible).toBe(true)
  })
})

describe("time and window rules - rules 14-17", () => {
  it("rule 14: Fresh must arrive by min(08:00, outlet window close)", () => {
    // Fresh departs 03:30 + minutes already used. Used 220 => departs 07:10, first stop arrives 07:34 (454).
    const state = { VEH001: { usedMinutes: { fresh: 220, styleTech: 0 } } }
    const ctx = makeCtx({ state })
    const strict = evaluateRoute(TRUCK_REEFER, [order(FRESH_REAR_0730)], ctx) // closes 07:30 (450) -> late
    expect(codes(strict)).toContain("FRESH_DEADLINE")
    expect(codes(strict)).not.toContain("TIME_BUDGET") // only the deadline fails
    const lenient = evaluateRoute(TRUCK_REEFER, [order(FRESH_REAR_0745)], ctx) // closes 07:45 (465) -> fine
    expect(lenient.feasible).toBe(true)
    // The generic 08:00 cap applies when an outlet's own window closes later (fixture outlet, test-only).
    const lateOutlet: EngineOutlet = { ...data.outlets.get(FRESH_REAR_0745)!, outletId: "TEST-LATE", windowClose: "09:00" }
    const outlets = new Map(data.outlets).set("TEST-LATE", lateOutlet)
    const lateOrder = (used: number) => evaluateRoute(TRUCK_REEFER, [order(FRESH_REAR_0745, { outletId: "TEST-LATE" })], makeCtx({ outlets, state: { VEH001: { usedMinutes: { fresh: used, styleTech: 0 } } } }))
    expect(codes(lateOrder(245))).not.toContain("FRESH_DEADLINE") // arrives 03:30+245+24 = 07:59, on time
    expect(codes(lateOrder(247))).toContain("FRESH_DEADLINE") // 08:01 > 08:00 although the outlet is open until 09:00
  })

  it("rule 15: Fresh budget is 270 min per vehicle per day across ALL Fresh trips", () => {
    // Two-order Colombo trip = 24 + 8 + 15 + 15 = 62 min.
    const two = [order(FRESH_REAR_0745), order(FRESH_REAR_0745_B)]
    expect(evaluateRoute(TRUCK_REEFER, two, makeCtx()).tripMinutes).toBe(62)
    expect(evaluateRoute(TRUCK_REEFER, two, makeCtx({ state: { VEH001: { usedMinutes: { fresh: 208, styleTech: 0 } } } })).budget).toMatchObject({ afterTrip: 270, fits: true })
    const over = evaluateRoute(TRUCK_REEFER, two, makeCtx({ state: { VEH001: { usedMinutes: { fresh: 209, styleTech: 0 } } } }))
    expect(codes(over)).toContain("TIME_BUDGET")
    expect(over.budget).toMatchObject({ pool: "fresh", limit: 270, afterTrip: 271, fits: false })
  })

  it("rule 16: Style+Tech budget is 480 min, a separate pool from Fresh, with 2 trips total", () => {
    // Style Colombo rear_dock single order: 24 + 38 = 62 min.
    const style = [order(STYLE_REAR)]
    // A vehicle with its Fresh pool fully used can still run Style (separate pool)...
    const freshFull = evaluateRoute(VAN_AMBIENT, style, makeCtx({ state: { VEH037: { usedMinutes: { fresh: 270, styleTech: 0 }, turnsToday: 1 } } }))
    expect(freshFull.feasible).toBe(true)
    expect(freshFull.budget).toMatchObject({ pool: "styleTech", limit: 480, afterTrip: 62 })
    // ...but Style+Tech has its own limit...
    const full = evaluateRoute(VAN_AMBIENT, style, makeCtx({ state: { VEH037: { usedMinutes: { fresh: 0, styleTech: 419 } } } }))
    expect(codes(full)).toContain("TIME_BUDGET")
    expect(evaluateRoute(VAN_AMBIENT, style, makeCtx({ state: { VEH037: { usedMinutes: { fresh: 0, styleTech: 418 } } } })).feasible).toBe(true)
    // ...and the two pools together still allow only 2 trips in the day.
    const twoTrips = evaluateRoute(VAN_AMBIENT, style, makeCtx({ state: { VEH037: { usedMinutes: { fresh: 100, styleTech: 0 }, turnsToday: 2 } } }))
    expect(codes(twoTrips)).toContain("TURNS_PER_DAY")
  })

  it("rule 17: a submission at or after 16:00 Asia/Colombo goes to the following run", () => {
    expect(cutoffBucket("2026-10-05T10:29:59Z")).toBe("before_cutoff") // 15:59:59 Colombo
    expect(cutoffBucket("2026-10-05T10:30:00Z")).toBe("after_cutoff") // 16:00:00 Colombo
    expect(cutoffBucket("2026-10-05T18:29:59Z")).toBe("after_cutoff")
    // An order for another day's run is not plannable today.
    expect(codes(evaluateRoute(VAN_AMBIENT, [order(STYLE_REAR, { requestedDate: "2026-10-06" })], makeCtx()))).toContain("ORDER_NOT_DUE")
  })
})

describe("trip time formula and capacity - rule 18 and the exact formula", () => {
  it("trip_minutes = outbound + inter_stop*(orders-1) + sum(service allowance); no return leg", () => {
    // Colombo: outbound 24, inter-stop 8. Fresh rear_dock 15 each.
    const n = (k: number) => Array.from({ length: k }, () => order(FRESH_REAR_0745))
    expect(evaluateRoute(TRUCK_REEFER, n(1), makeCtx()).tripMinutes).toBe(24 + 15)
    expect(evaluateRoute(TRUCK_REEFER, n(2), makeCtx()).tripMinutes).toBe(24 + 8 + 30)
    expect(evaluateRoute(TRUCK_REEFER, n(3), makeCtx()).tripMinutes).toBe(24 + 16 + 45)
    // Allowance varies by (brand, dock): Style street 46, Style mall_bay 59 in Colombo.
    expect(evaluateRoute(VAN_AMBIENT, [order(STYLE_STREET)], makeCtx()).tripMinutes).toBe(24 + 46)
    expect(evaluateRoute(VAN_AMBIENT, [order(STYLE_MALL_1030)], makeCtx({ styleTechDepartureMin: 10 * 60 + 20 })).tripMinutes).toBe(24 + 59)
    // Different district = different travel row (Gampaha: 37 outbound).
    expect(evaluateRoute(TRUCK_REEFER, [order(FRESH_GAMPAHA)], makeCtx()).tripMinutes).toBe(37 + 15)
  })

  it("stop arrival times follow the formula", () => {
    const ev = evaluateRoute(TRUCK_REEFER, [order(FRESH_REAR_0745), order(FRESH_REAR_0745_B)], makeCtx())
    // depart 03:30 = 210; first stop 210+24; second = +15 handling +8 inter-stop
    expect(ev.stops.map((s) => s.arrivalMin)).toEqual([234, 257])
  })

  it("rule 18: weight and volume must BOTH hold", () => {
    const ctx = makeCtx()
    const weightOnly = evaluateRoute(VAN_AMBIENT, [order(STYLE_REAR, { weightKg: 1200, volumeM3: 1 })], ctx)
    expect(codes(weightOnly)).toEqual(["WEIGHT_CAPACITY"])
    const volumeOnly = evaluateRoute(VAN_AMBIENT, [order(STYLE_REAR, { weightKg: 100, volumeM3: 9 })], ctx)
    expect(codes(volumeOnly)).toEqual(["VOLUME_CAPACITY"])
    const both = evaluateRoute(VAN_AMBIENT, [order(STYLE_REAR, { weightKg: 1200, volumeM3: 9 })], ctx)
    expect(codes(both).sort()).toEqual(["VOLUME_CAPACITY", "WEIGHT_CAPACITY"])
    // Sums across orders, and percentages are reported.
    const summed = evaluateRoute(VAN_AMBIENT, [order(STYLE_REAR, { weightKg: 550 }), order(STYLE_REAR, { weightKg: 550 })], ctx)
    expect(summed.feasible).toBe(true)
    expect(summed.load.weightPct).toBe(100)
  })
})

describe("flow 1 - vehicle-first - rule 19", () => {
  const freshOpen = ["OUT005", "OUT009", "OUT008", "OUT010"].flatMap((id) => [order(id), order(id), order(id), order(id)]) // 16 Fresh Colombo rear_dock orders

  it("ranks ALL vehicles (never hides) with ineligible ones flagged and explained", () => {
    const ctx = makeCtx({ state: { VEH001: { turnsToday: 2 } } })
    const ranking = rankVehiclesForOrders([], data.vehicles, ctx)
    expect(ranking).toHaveLength(60)
    const full = ranking.find((r) => r.vehicle.vehicleId === "VEH001")!
    expect(full.eligible).toBe(false)
    expect(full.fitScore).toBe(0)
    expect(full.reasons.map((r) => r.code)).toContain("TURNS_PER_DAY")
    expect(ranking.filter((r) => r.eligible).length).toBe(59)
    // Eligible vehicles come first.
    const firstIneligible = ranking.findIndex((r) => !r.eligible)
    expect(ranking.slice(firstIneligible).every((r) => !r.eligible)).toBe(true)
  })

  it("on Sunday every vehicle is ineligible but still listed", () => {
    const ranking = rankVehiclesForOrders([], data.vehicles, makeCtx({ serviceDate: SUNDAY }))
    expect(ranking).toHaveLength(60)
    expect(ranking.every((r) => !r.eligible)).toBe(true)
  })

  it("suggests the most efficient subset: one brand+district cluster, whole orders, within the Fresh budget", () => {
    const plan = planFromVehicle("VEH001", [...freshOpen, order(FRESH_GAMPAHA), order(STYLE_REAR)], data.vehicles, makeCtx())
    const suggested = plan.suggestion!.suggested
    // Budget: 16 + 23n <= 270  =>  n = 11
    expect(suggested).toHaveLength(11)
    expect(plan.route!.tripMinutes).toBe(16 + 23 * 11)
    expect(plan.route!.feasible).toBe(true)
    expect(new Set(suggested.map((o) => data.outlets.get(o.outletId)!.district)).size).toBe(1)
    // Tightest deadlines (07:30 outlets) are served first.
    expect(suggested.slice(0, 8).every((o) => ["OUT008", "OUT010"].includes(o.outletId))).toBe(true)
    // Everything else is excluded with a reason.
    const excluded = plan.suggestion!.excluded
    expect(excluded.length).toBe(freshOpen.length + 2 - 11)
    expect(excluded.every((e) => e.reasons.length > 0)).toBe(true)
    expect(excluded.find((e) => e.order.outletId === FRESH_GAMPAHA)!.reasons.map((r) => r.code)).toContain("SAME_DISTRICT")
  })

  it("annotates every open order for the vehicle (eligible or not), cumulatively over what is already added", () => {
    const a = order(STYLE_REAR, { weightKg: 700 })
    const b = order(STYLE_REAR, { weightKg: 500 })
    const c = order(STYLE_REAR, { weightKg: 300 })
    const chilled = order(STYLE_REAR, { needsReefer: true })
    const annotated = filterEligibleOrders(VAN_AMBIENT, [a, b, c, chilled], [a], makeCtx())
    const by = (o: typeof a) => annotated.find((x) => x.order.id === o.id)!
    expect(by(a)).toMatchObject({ alreadyAdded: true, eligible: true })
    expect(by(b).reasons.map((r) => r.code)).toContain("WEIGHT_CAPACITY") // 700 + 500 > 1100: cumulative
    expect(by(c).eligible).toBe(true) // 700 + 300 fits
    expect(by(chilled).reasons.map((r) => r.code)).toContain("TEMPERATURE")
  })
})

describe("flow 2 - order-first - rule 20", () => {
  it("ranks vehicles for the mandatory orders and uses the best eligible one", () => {
    const mandatory = order(FRESH_STREET_0800, { needsReefer: true })
    const plan = planFromOrders([mandatory.id], [mandatory, order(FRESH_STREET_0800)], data.vehicles, makeCtx())
    expect(plan.ranking).toHaveLength(60)
    const eligible = plan.ranking.filter((r) => r.eligible)
    expect(eligible.length).toBeGreaterThan(0)
    expect(eligible.every((r) => r.vehicle.temp === "reefer" && r.vehicle.depot === "Peliyagoda")).toBe(true)
    expect(plan.ranking.find((r) => r.vehicle.vehicleId === "VEH008")!.reasons.map((r) => r.code)).toContain("TEMPERATURE")
    expect(plan.vehicleId).toBe(eligible[0]!.vehicle.vehicleId)
    expect(plan.mandatoryIds).toEqual([mandatory.id])
  })

  it("mandatory orders are always in the final set, even when lighter orders would fill the van", () => {
    const mandatory = order(STYLE_REAR, { weightKg: 900 })
    const lights = Array.from({ length: 5 }, () => order(STYLE_REAR, { weightKg: 100 }))
    const plan = planFromOrders([mandatory.id], [mandatory, ...lights], [VAN_AMBIENT], makeCtx())
    expect(plan.selectedIds).toContain(mandatory.id)
    expect(plan.suggestion!.suggested).toHaveLength(3) // 900 + 2 x 100 = 1100 kg
    expect(plan.route!.load.weightKg).toBe(1100)
  })

  it("mandatory orders stay on the route even if infeasible, with the violation visible", () => {
    const mandatory = order(STYLE_REAR, { weightKg: 2000 })
    const plan = planFromOrders([mandatory.id], [mandatory, order(STYLE_REAR)], data.vehicles, makeCtx(), { vehicleId: "VEH037" })
    expect(plan.selectedIds).toEqual([mandatory.id])
    expect(plan.suggestion!.mandatoryViolations.map((v) => v.code)).toContain("WEIGHT_CAPACITY")
    expect(plan.route!.feasible).toBe(false)
  })

  it("when no vehicle can serve the mandatory orders the ranking explains why", () => {
    const mandatory = order(STYLE_REAR, { weightKg: 99999 })
    const plan = planFromOrders([mandatory.id], [mandatory], data.vehicles, makeCtx())
    expect(plan.vehicleId).toBeNull()
    expect(plan.route).toBeNull()
    expect(plan.ranking.every((r) => !r.eligible && r.reasons.length > 0)).toBe(true)
  })

  it("dropping a mandatory order removes it AND un-mandatories it", () => {
    const mandatory = order(STYLE_REAR, { weightKg: 100 })
    const open = [mandatory, order(STYLE_REAR, { weightKg: 100 })]
    const ctx = makeCtx()
    const plan = planFromOrders([mandatory.id], open, [VAN_AMBIENT], ctx)
    const next = recompute(plan, { type: "drop", orderId: mandatory.id }, open, [VAN_AMBIENT], ctx)
    expect(next.selectedIds).not.toContain(mandatory.id)
    expect(next.mandatoryIds).toEqual([])
  })
})

describe("live recompute - rules 21 and 22", () => {
  const ctx = makeCtx()
  const open = [order(FRESH_REAR_0745), order(FRESH_REAR_0745_B), order(FRESH_REAR_0730), order(FRESH_GAMPAHA), order(FRESH_REAR_0730_B)]

  it("add / drop / swap recompute the route from the current selection", () => {
    let plan = planFromVehicle("VEH001", open, data.vehicles, ctx)
    const colombo = open.filter((o) => o.outletId !== FRESH_GAMPAHA)
    expect(plan.selectedIds.sort()).toEqual(colombo.map((o) => o.id).sort())
    const base = plan.route!.tripMinutes!

    const dropId = plan.selectedIds[0]!
    plan = recompute(plan, { type: "drop", orderId: dropId }, open, data.vehicles, ctx)
    expect(plan.selectedIds).not.toContain(dropId)
    expect(plan.route!.tripMinutes).toBe(base - 23) // one fewer stop: -8 inter-stop, -15 handling

    plan = recompute(plan, { type: "add", orderId: dropId }, open, data.vehicles, ctx) // swap back in
    expect(plan.route!.tripMinutes).toBe(base)
    expect(plan.lastEdit).toEqual({ applied: true })
  })

  it("rejects an add that breaks a rule, with the reasons, and keeps the route unchanged", () => {
    const plan = planFromVehicle("VEH001", open, data.vehicles, ctx)
    const next = recompute(plan, { type: "add", orderId: open.find((o) => o.outletId === FRESH_GAMPAHA)!.id }, open, data.vehicles, ctx)
    expect(next.lastEdit?.applied).toBe(false)
    expect(next.lastEdit?.rejected?.map((r) => r.code)).toContain("SAME_DISTRICT")
    expect(next.selectedIds).toEqual(plan.selectedIds)
  })

  it("changing vehicle keeps mandatory orders and reports orders that no longer fit", () => {
    const chilled = order(FRESH_REAR_0745, { needsReefer: true })
    const other = order(FRESH_REAR_0745_B)
    const o = [chilled, other]
    const plan = planFromOrders([chilled.id], o, data.vehicles, ctx, { vehicleId: "VEH001" })
    expect(plan.selectedIds.sort()).toEqual([chilled.id, other.id].sort())
    const next = recompute(plan, { type: "setVehicle", vehicleId: "VEH008" }, o, data.vehicles, ctx) // ambient truck
    expect(next.vehicleId).toBe("VEH008")
    expect(next.selectedIds).toContain(chilled.id) // mandatory is kept...
    expect(next.route!.violations.map((v) => v.code)).toContain("TEMPERATURE") // ...with the problem shown
  })

  it("rule 22: in-reach is re-evaluated against the current selection", () => {
    const a = order(STYLE_REAR, { weightKg: 700 })
    const b = order(STYLE_REAR, { weightKg: 500 })
    const c = order(STYLE_REAR, { weightKg: 300 })
    const statusOf = (route: ReturnType<typeof buildRoute>, id: string) => route.mapStops.find((m) => m.orderId === id)!.status
    const withA = buildRoute(VAN_AMBIENT, [a], ctx, [a, b, c])
    expect(statusOf(withA, a.id)).toBe("on_route")
    expect(statusOf(withA, b.id)).toBe("out_of_reach") // 700 + 500 > 1100
    expect(statusOf(withA, c.id)).toBe("in_reach")
    const withC = buildRoute(VAN_AMBIENT, [c], ctx, [a, b, c])
    expect(statusOf(withC, b.id)).toBe("in_reach") // 300 + 500 fits now
    // Time budget also counts: with 5 min of Style budget left nothing more is in reach.
    const tight = makeCtx({ state: { VEH037: { usedMinutes: { fresh: 0, styleTech: 480 - (24 + 38) } } } })
    const full = buildRoute(VAN_AMBIENT, [c], tight, [c, b])
    expect(statusOf(full, b.id)).toBe("out_of_reach")
    expect(full.mapStops.find((m) => m.orderId === b.id)!.reasons.map((r) => r.code)).toContain("TIME_BUDGET")
  })
})

describe("engine additions used by the Dispatcher integration", () => {
  const ctx = makeCtx()

  it("exposes the departure time (Fresh = 03:30 + minutes already used)", () => {
    expect(evaluateRoute(TRUCK_REEFER, [order(FRESH_REAR_0745)], ctx).departureMin).toBe(210)
    const used = makeCtx({ state: { VEH001: { usedMinutes: { fresh: 60, styleTech: 0 } } } })
    expect(evaluateRoute(TRUCK_REEFER, [order(FRESH_REAR_0745)], used).departureMin).toBe(270)
    expect(evaluateRoute(VAN_AMBIENT, [order(STYLE_REAR)], ctx).departureMin).toBeNull() // no Style/Tech start given
    expect(evaluateRoute(VAN_AMBIENT, [order(STYLE_REAR)], makeCtx({ styleTechDepartureMin: 540 })).departureMin).toBe(540)
  })

  it("autoSelect:false offers the suggestion but selects only mandatory orders", () => {
    const a = order(STYLE_REAR, { weightKg: 100 })
    const b = order(STYLE_REAR, { weightKg: 100 })
    const vehiclePlan = planFromVehicle("VEH037", [a, b], data.vehicles, ctx, { autoSelect: false })
    expect(vehiclePlan.selectedIds).toEqual([])
    expect(vehiclePlan.suggestion!.suggested).toHaveLength(2)
    expect(vehiclePlan.route!.stops).toHaveLength(0)
    expect(vehiclePlan.route!.mapStops.every((m) => m.status === "in_reach")).toBe(true)
    const orderPlan = planFromOrders([a.id], [a, b], [VAN_AMBIENT], ctx, { autoSelect: false })
    expect(orderPlan.selectedIds).toEqual([a.id])
    expect(orderPlan.suggestion!.suggested.map((o) => o.id).sort()).toEqual([a.id, b.id].sort())
  })

  it("addMany accepts the suggestion, rejects what no longer fits, clear keeps mandatory only", () => {
    const m = order(STYLE_REAR, { weightKg: 900 })
    const fits = order(STYLE_REAR, { weightKg: 100 })
    const tooBig = order(STYLE_REAR, { weightKg: 500 })
    const open = [m, fits, tooBig]
    let plan = planFromOrders([m.id], open, [VAN_AMBIENT], ctx, { autoSelect: false })
    plan = recompute(plan, { type: "addMany", orderIds: [tooBig.id, fits.id] }, open, [VAN_AMBIENT], ctx)
    expect(plan.selectedIds.sort()).toEqual([m.id, fits.id].sort())
    expect(plan.lastEdit?.dropped).toEqual([tooBig.id])
    expect(plan.lastEdit?.rejected?.map((r) => r.code)).toContain("WEIGHT_CAPACITY")
    plan = recompute(plan, { type: "clear" }, open, [VAN_AMBIENT], ctx)
    expect(plan.selectedIds).toEqual([m.id]) // mandatory survives a clear
  })

  it("resuggest leaves the given orders out and does not touch the selection", () => {
    const a = order(STYLE_REAR, { weightKg: 600 })
    const b = order(STYLE_REAR, { weightKg: 600 })
    const open = [a, b]
    let plan = planFromVehicle("VEH037", open, [VAN_AMBIENT], ctx, { autoSelect: false })
    const first = plan.suggestion!.suggested.map((o) => o.id)
    expect(first).toHaveLength(1) // 600 + 600 > 1100
    plan = recompute(plan, { type: "resuggest", excludeOrderIds: first }, open, [VAN_AMBIENT], ctx)
    expect(plan.suggestion!.suggested.map((o) => o.id)).not.toEqual(first)
    expect(plan.suggestion!.suggested).toHaveLength(1)
    expect(plan.selectedIds).toEqual([])
  })

  it("a vehicle change refreshes the suggestion for the new vehicle (no stale pack)", () => {
    const light = order(STYLE_REAR, { weightKg: 600 })
    const light2 = order(STYLE_REAR, { weightKg: 600 })
    const open = [light, light2]
    const small = vehicle("VEH037")
    const big = vehicle("VEH011") // 7200 kg ambient truck
    let plan = planFromVehicle("VEH037", open, [small, big], ctx, { autoSelect: false })
    expect(plan.suggestion!.suggested).toHaveLength(1)
    plan = recompute(plan, { type: "setVehicle", vehicleId: "VEH011" }, open, [small, big], ctx)
    expect(plan.vehicleId).toBe("VEH011")
    expect(plan.suggestion!.suggested).toHaveLength(2)
  })

  it("nextVehicle moves to another eligible vehicle, keeps mandatory orders and re-chains", () => {
    const m = order(FRESH_REAR_0745, { needsReefer: true })
    const open = [m, order(FRESH_REAR_0745_B)]
    let plan = planFromOrders([m.id], open, data.vehicles, ctx, { autoSelect: false })
    const first = plan.vehicleId
    plan = recompute(plan, { type: "nextVehicle" }, open, data.vehicles, ctx)
    expect(plan.vehicleId).not.toBe(first)
    expect(plan.ranking.find((r) => r.vehicle.vehicleId === plan.vehicleId)!.eligible).toBe(true)
    expect(plan.selectedIds).toContain(m.id)
    expect(plan.mandatoryIds).toEqual([m.id])
    // Only one vehicle can serve it -> rejected, plan unchanged.
    const only = recompute(planFromOrders([m.id], open, [TRUCK_REEFER], ctx, { autoSelect: false }), { type: "nextVehicle" }, open, [TRUCK_REEFER], ctx)
    expect(only.lastEdit?.applied).toBe(false)
    expect(only.vehicleId).toBe("VEH001")
  })

  it("fit score keeps reefers free for cold-chain orders", () => {
    const ambient = [order(STYLE_REAR, { weightKg: 300 })]
    const ranked = rankVehiclesForOrders(ambient, [VAN_REEFER, VAN_AMBIENT], ctx)
    expect(ranked[0]!.vehicle.vehicleId).toBe("VEH037")
    const chilled = rankVehiclesForOrders([order(FRESH_REAR_0745, { needsReefer: true })], [VAN_REEFER, VAN_AMBIENT], ctx)
    expect(chilled[0]!.vehicle.vehicleId).toBe("VEH035") // only the reefer is eligible
  })

  it("mandatory orders stay locked through every kind of edit", () => {
    const m = order(STYLE_REAR, { weightKg: 100 })
    const open = [m, order(STYLE_REAR, { weightKg: 100 }), order(STYLE_REAR, { weightKg: 100 })]
    let plan = planFromOrders([m.id], open, [VAN_AMBIENT, vehicle("VEH011")], ctx)
    const edits: PlanEdit[] = [{ type: "clear" }, { type: "resuggest", excludeOrderIds: [] }, { type: "setVehicle", vehicleId: "VEH011" }, { type: "addMany", orderIds: open.map((o) => o.id) }, { type: "nextVehicle" }]
    for (const e of edits) {
      plan = recompute(plan, e, open, [VAN_AMBIENT, vehicle("VEH011")], ctx)
      expect(plan.selectedIds).toContain(m.id)
      expect(plan.mandatoryIds).toEqual([m.id])
    }
  })
})

describe("development mode (mirrors backend DEV_MODE)", () => {
  it("closed day, Fresh deadline and due-date become warnings; every other rule still blocks", () => {
    const dev = makeCtx({ serviceDate: SUNDAY, devMode: true })
    const sunday = evaluateRoute(VAN_AMBIENT, [order(STYLE_REAR, { requestedDate: SUNDAY })], dev)
    expect(sunday.feasible).toBe(true)
    expect(sunday.warnings.join(" ")).toMatch(/Not enforced \(development mode\).*not an operating day/)
    expect(rankVehiclesForOrders([], data.vehicles, dev).every((r) => r.eligible)).toBe(true) // vehicles are no longer all unavailable
    expect(codes(evaluateRoute(VAN_AMBIENT, [order(STYLE_REAR, { requestedDate: "2026-10-09" })], makeCtx({ devMode: true })))).not.toContain("ORDER_NOT_DUE")
    const late = evaluateRoute(TRUCK_REEFER, [order(FRESH_REAR_0730)], makeCtx({ devMode: true, state: { VEH001: { usedMinutes: { fresh: 220, styleTech: 0 } } } }))
    expect(codes(late)).not.toContain("FRESH_DEADLINE")
    // Everything else is still enforced in dev mode.
    expect(codes(evaluateRoute(VAN_AMBIENT, [order(STYLE_REAR, { weightKg: 2000 })], dev))).toContain("WEIGHT_CAPACITY")
    expect(codes(evaluateRoute(VAN_AMBIENT, [order(STYLE_REAR)], makeCtx({ devMode: true, state: { VEH037: { turnsToday: 2 } } })))).toContain("TURNS_PER_DAY")
    expect(codes(evaluateRoute(TRUCK_AMBIENT, [order(FRESH_REAR_0745, { needsReefer: true })], dev))).toContain("TEMPERATURE")
    expect(codes(evaluateRoute(TRUCK_REEFER, [order(FRESH_VAN_ONLY)], dev))).toContain("VAN_ONLY")
  })
})
