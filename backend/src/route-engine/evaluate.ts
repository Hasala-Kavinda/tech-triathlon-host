import { toMin } from "./time.js"
import { weekday } from "./time.js"
import type { EngineContext, EngineOrder, EngineOutlet, EngineVehicle, RouteEvaluation, RouteStop, Violation, VehicleDayState, ViolationScope } from "./types.js"

const ZERO_STATE: VehicleDayState = { turnsToday: 0, weeklyFuelUsedL: 0, usedMinutes: { fresh: 0, styleTech: 0 } }

const violation = (code: string, rule: number, scope: ViolationScope, message: string, orderId?: string): Violation =>
  ({ code, rule, scope, message, ...(orderId ? { orderId } : {}) })

const round1 = (n: number) => Math.round(n * 10) / 10

/**
 * The single source of truth for feasibility. Every other entry point (ranking, eligibility,
 * packing, route building) calls this, so a result can never disagree with the rules.
 *
 * Interpretations (all driven by the rule summary):
 *  - trip_minutes = outbound + inter_stop * (orders - 1) + sum(handling per order); no return leg.
 *  - Each order is a stop for handling time; inter-stop travel is per order, per the formula.
 *  - Stop arrival = departure + outbound + inter-stop legs + handling of earlier stops.
 *  - Fresh departs at 03:30 plus Fresh minutes the vehicle already used today.
 *  - Fuel distance = depot_to_district_km + inter_stop_km * (orders - 1) (same legs as the time formula).
 */
export function evaluateRoute(vehicle: EngineVehicle, orders: readonly EngineOrder[], ctx: EngineContext): RouteEvaluation {
  const cfg = ctx.config
  const state = ctx.vehicleState[vehicle.vehicleId] ?? ZERO_STATE
  const violations: Violation[] = []
  const warnings: string[] = []

  // Vehicle-level rules (5, 4)
  if (weekday(ctx.serviceDate) === 0 || ctx.isOperatingDay === false) {
    const closed = violation("NOT_OPERATING_DAY", 5, "vehicle", `${ctx.serviceDate} is not an operating day (no Sunday service).`)
    if (ctx.devMode) warnings.push(`Not enforced (development mode): ${closed.message}`)
    else violations.push(closed)
  }
  if (state.turnsToday >= cfg.maxTurnsPerDay) {
    violations.push(violation("TURNS_PER_DAY", 5, "vehicle", `${vehicle.vehicleId} has already run ${state.turnsToday} of ${cfg.maxTurnsPerDay} routes today.`))
  }
  if (state.weeklyFuelUsedL >= vehicle.weeklyFuelQuotaL) {
    violations.push(violation("FUEL_QUOTA", 4, "vehicle", `Weekly fuel quota already used (${round1(state.weeklyFuelUsedL)} of ${vehicle.weeklyFuelQuotaL} L).`))
  }

  // Whole orders only (12): an order can appear once in a route.
  const seen = new Set<string>()
  for (const order of orders) {
    if (seen.has(order.id)) violations.push(violation("DUPLICATE_ORDER", 12, "order", `${order.orderNumber} appears more than once; orders cannot be split.`, order.id))
    seen.add(order.id)
  }

  // Order-level rules (13, 17, 7, 10, 3/9)
  const known: Array<{ order: EngineOrder; outlet: EngineOutlet }> = []
  for (const order of orders) {
    const outlet = ctx.outlets.get(order.outletId)
    if (!outlet) {
      violations.push(violation("OUTLET_UNKNOWN", 7, "order", `${order.orderNumber}: outlet ${order.outletId} is not in reference data.`, order.id))
      continue
    }
    known.push({ order, outlet })
    if (!["submitted", "deferred"].includes(order.status) || order.allocated) {
      violations.push(violation("ORDER_NOT_ELIGIBLE", 13, "order", `${order.orderNumber} is ${order.allocated ? "already allocated" : order.status}; only unallocated submitted/deferred orders can be planned.`, order.id))
    }
    if (order.requestedDate !== ctx.serviceDate) {
      const notDue = violation("ORDER_NOT_DUE", 17, "order", `${order.orderNumber} is for ${order.requestedDate}, not the ${ctx.serviceDate} run.`, order.id)
      if (ctx.devMode) warnings.push(`Not enforced (development mode): ${notDue.message}`)
      else violations.push(notDue)
    }
    if (outlet.depot !== vehicle.depot) {
      violations.push(violation("DEPOT_MISMATCH", 7, "order", `${order.orderNumber} is served from ${outlet.depot}; ${vehicle.vehicleId} is based at ${vehicle.depot}.`, order.id))
    }
    if (outlet.parkingConstraint === "van_only" && vehicle.type !== "van") {
      violations.push(violation("VAN_ONLY", 10, "order", `${outlet.outletId} only accepts vans; ${vehicle.vehicleId} is a ${vehicle.type}.`, order.id))
    }
    if (order.needsReefer && vehicle.temp !== "reefer") {
      violations.push(violation("TEMPERATURE", 3, "order", `${order.orderNumber} is chilled/frozen and needs a reefer vehicle.`, order.id))
    }
  }

  // Set-level rules (8, 18)
  const brands = new Set(known.map((k) => k.order.brand))
  const districts = new Set(known.map((k) => k.outlet.district))
  if (brands.size > 1) violations.push(violation("SAME_BRAND", 8, "set", `Orders on one trip must share a brand (found ${[...brands].join(", ")}).`))
  if (districts.size > 1) violations.push(violation("SAME_DISTRICT", 8, "set", `Orders on one trip must share a district (found ${[...districts].join(", ")}).`))

  const weightKg = orders.reduce((s, o) => s + o.weightKg, 0)
  const volumeM3 = orders.reduce((s, o) => s + o.volumeM3, 0)
  if (weightKg > vehicle.weightCapKg) violations.push(violation("WEIGHT_CAPACITY", 18, "set", `Load ${round1(weightKg)} kg exceeds ${vehicle.weightCapKg} kg capacity.`))
  if (volumeM3 > vehicle.volumeCapM3) violations.push(violation("VOLUME_CAPACITY", 18, "set", `Load ${round1(volumeM3)} m3 exceeds ${vehicle.volumeCapM3} m3 capacity.`))
  const load = {
    weightKg: round1(weightKg), volumeM3: Math.round(volumeM3 * 100) / 100,
    weightPct: round1((weightKg / vehicle.weightCapKg) * 100), volumePct: round1((volumeM3 / vehicle.volumeCapM3) * 100),
  }

  // Time, window, mall and fuel rules (11, 14, 15, 16, 4) need a single brand + district.
  let stops: RouteStop[] = []
  let tripMinutes: number | null = null
  let distanceKm: number | null = null
  let departureMin: number | null = null
  let fuelL: number | null = null
  let budget: RouteEvaluation["budget"] = { pool: null, usedBefore: 0, limit: null, afterTrip: null, fits: null }

  const deadlineOf = (k: { order: EngineOrder; outlet: EngineOutlet }) =>
    k.order.brand === "Fresh" ? Math.min(cfg.freshDeadlineMin, toMin(k.outlet.windowClose)) : toMin(k.outlet.windowClose)
  const sequence = [...known].sort((a, b) => deadlineOf(a) - deadlineOf(b) || a.outlet.outletId.localeCompare(b.outlet.outletId) || a.order.orderNumber.localeCompare(b.order.orderNumber))

  const uniform = known.length > 0 && brands.size === 1 && districts.size === 1
  const brand = known[0]?.order.brand
  const district = known[0]?.outlet.district
  const travel = uniform && district ? ctx.travel.find(vehicle.depot, district) : undefined
  if (uniform && !travel) {
    violations.push(violation("NO_TRAVEL_DATA", 15, "set", `No district travel data for ${vehicle.depot} to ${district}.`))
  }
  const handling = sequence.map((k) => ctx.allowances.find(k.order.brand, k.outlet.dockType))
  if (uniform && handling.some((h) => h === undefined)) {
    violations.push(violation("NO_ALLOWANCE_DATA", 15, "set", "No service allowance for a brand/dock type on this route."))
  }

  if (uniform && travel && brand && handling.every((h): h is number => h !== undefined)) {
    const n = sequence.length
    const handlingTotal = (handling as number[]).reduce((s, h) => s + h, 0)
    tripMinutes = travel.depotToDistrictMin + travel.interStopMin * (n - 1) + handlingTotal
    distanceKm = travel.depotToDistrictKm + travel.interStopKm * (n - 1)
    fuelL = distanceKm / vehicle.kmPerL

    const pool = brand === "Fresh" ? "fresh" : "styleTech"
    const used = state.usedMinutes[pool]
    const limit = pool === "fresh" ? cfg.freshBudgetMin : cfg.styleTechBudgetMin
    const fits = used + tripMinutes <= limit
    budget = { pool, usedBefore: used, limit, afterTrip: used + tripMinutes, fits }
    if (!fits) {
      violations.push(violation("TIME_BUDGET", pool === "fresh" ? 15 : 16, "set", `${pool === "fresh" ? "Fresh" : "Style+Tech"} budget: ${used} + ${tripMinutes} min exceeds ${limit} min per vehicle per day.`))
    }
    if (state.weeklyFuelUsedL + fuelL > vehicle.weeklyFuelQuotaL) {
      violations.push(violation("FUEL_QUOTA", 4, "set", `Trip needs ${round1(fuelL)} L; only ${round1(vehicle.weeklyFuelQuotaL - state.weeklyFuelUsedL)} L of the weekly quota remains.`))
    }

    const depart = pool === "fresh" ? cfg.freshStartMin + used : ctx.styleTechDepartureMin === undefined ? null : ctx.styleTechDepartureMin + used
    departureMin = depart
    let elapsed = travel.depotToDistrictMin
    let mallUnevaluated = false
    stops = sequence.map((k, i) => {
      const arrivalMin = depart === null ? null : depart + elapsed
      const stop: RouteStop = {
        sequence: i + 1, orderId: k.order.id, orderNumber: k.order.orderNumber, outletId: k.outlet.outletId,
        district: k.outlet.district, brand: k.order.brand, dockType: k.outlet.dockType, arrivalMin, handlingMin: handling[i] as number,
      }
      if (brand === "Fresh" && arrivalMin !== null && arrivalMin > deadlineOf(k)) {
        const late = violation("FRESH_DEADLINE", 14, "set", `${k.order.orderNumber} would arrive after its Fresh deadline (${String(Math.floor(deadlineOf(k) / 60)).padStart(2, "0")}:${String(deadlineOf(k) % 60).padStart(2, "0")}).`, k.order.id)
        if (ctx.devMode) warnings.push(`Not enforced (development mode): ${late.message}`)
        else violations.push(late)
      }
      if (k.outlet.parkingConstraint === "mall_dock") {
        if (arrivalMin === null) mallUnevaluated = true
        else if (arrivalMin < toMin(k.outlet.windowOpen) || arrivalMin > toMin(k.outlet.windowClose)) {
          violations.push(violation("MALL_WINDOW", 11, "set", `${k.order.orderNumber} would arrive outside the mall window ${k.outlet.windowOpen}-${k.outlet.windowClose}.`, k.order.id))
        }
      }
      elapsed += (handling[i] as number) + travel.interStopMin
      return stop
    })
    if (mallUnevaluated) warnings.push("Mall delivery window not evaluated: no Style/Tech departure time was provided.")
  } else {
    // Mixed or unresolved set: still list the stops so the UI can show what was selected.
    stops = sequence.map((k, i) => ({
      sequence: i + 1, orderId: k.order.id, orderNumber: k.order.orderNumber, outletId: k.outlet.outletId, district: k.outlet.district,
      brand: k.order.brand, dockType: k.outlet.dockType, arrivalMin: null, handlingMin: ctx.allowances.find(k.order.brand, k.outlet.dockType) ?? 0,
    }))
  }

  return { feasible: violations.length === 0, violations, warnings, stops, tripMinutes, departureMin, distanceKm, fuelL, load, budget }
}
