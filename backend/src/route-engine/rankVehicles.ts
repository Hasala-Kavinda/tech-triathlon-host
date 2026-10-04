import { evaluateRoute } from "./evaluate.js"
import type { EngineContext, EngineOrder, EngineVehicle, RankedVehicle, RouteEvaluation } from "./types.js"

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

/**
 * Fit score (0-100, higher = better) for an ELIGIBLE vehicle:
 *   40  how tightly the load fills the vehicle (prefer the smallest vehicle that fits),
 *   25  time-budget slack left after this trip,
 *   20  weekly fuel quota left after this trip,
 *   15  routes still available today,
 *   -10 when a reefer would carry only ambient orders (keep cold-chain vehicles free).
 * With no orders (vehicle-first browsing) the load term is 0 and the rest still rank vehicles.
 */
function fitScore(vehicle: EngineVehicle, ev: RouteEvaluation, ctx: EngineContext, orders: readonly EngineOrder[]): number {
  const state = ctx.vehicleState[vehicle.vehicleId]
  const tight = clamp01(Math.max(ev.load.weightPct, ev.load.volumePct) / 100)
  const slack = ev.budget.limit && ev.budget.afterTrip !== null ? clamp01((ev.budget.limit - ev.budget.afterTrip) / ev.budget.limit) : 1
  const usedL = (state?.weeklyFuelUsedL ?? 0) + (ev.fuelL ?? 0)
  const fuelLeft = clamp01((vehicle.weeklyFuelQuotaL - usedL) / vehicle.weeklyFuelQuotaL)
  const turnsLeft = clamp01((ctx.config.maxTurnsPerDay - (state?.turnsToday ?? 0)) / ctx.config.maxTurnsPerDay)
  const coldWaste = vehicle.temp === "reefer" && orders.length > 0 && !orders.some((o) => o.needsReefer) ? 10 : 0
  return Math.round((40 * tight + 25 * slack + 20 * fuelLeft + 15 * turnsLeft - coldWaste) * 10) / 10
}

/**
 * Rules 1-7 (plus the order-driven rules 8-13 against `orders`). Returns EVERY vehicle, never
 * filtered, annotated with eligibility, reasons and a fit score, best first. With no orders it
 * reports only vehicle state (operating day, routes today, fuel left).
 */
export function rankVehiclesForOrders(orders: readonly EngineOrder[], vehicles: readonly EngineVehicle[], ctx: EngineContext): RankedVehicle[] {
  const ranked = vehicles.map((vehicle) => {
    const evaluation = evaluateRoute(vehicle, orders, ctx)
    const eligible = evaluation.feasible
    return { vehicle, eligible, reasons: evaluation.violations, fitScore: eligible ? fitScore(vehicle, evaluation, ctx, orders) : 0, evaluation }
  })
  return ranked.sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.fitScore - a.fitScore || a.vehicle.vehicleId.localeCompare(b.vehicle.vehicleId))
}
