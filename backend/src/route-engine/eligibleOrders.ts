import { evaluateRoute } from "./evaluate.js"
import type { AnnotatedOrder, EngineContext, EngineOrder, EngineVehicle, Violation } from "./types.js"

const key = (v: Violation) => `${v.code}|${v.orderId ?? ""}`

/**
 * Why `candidate` cannot join `current` on `vehicle`: vehicle-level and order-level violations,
 * plus set-level violations that adding the candidate introduces (so a set that is already
 * over budget does not blame the candidate for problems it did not cause).
 */
export function reasonsToAdd(vehicle: EngineVehicle, current: readonly EngineOrder[], candidate: EngineOrder, ctx: EngineContext): Violation[] {
  const base = new Set(evaluateRoute(vehicle, current, ctx).violations.map(key))
  const next = evaluateRoute(vehicle, [...current, candidate], ctx)
  return next.violations.filter((v) => v.scope === "vehicle" || (v.scope === "order" ? v.orderId === candidate.id : !base.has(key(v))))
}

/**
 * Rules 8-13 for one vehicle: every open order, annotated. `alreadyAdded` are orders tentatively
 * on the vehicle in this session, so capacity/time/brand/district checks are cumulative.
 */
export function filterEligibleOrders(
  vehicle: EngineVehicle,
  openOrders: readonly EngineOrder[],
  alreadyAdded: readonly EngineOrder[],
  ctx: EngineContext,
): AnnotatedOrder[] {
  const added = new Set(alreadyAdded.map((o) => o.id))
  return openOrders.map((order) => {
    if (added.has(order.id)) return { order, eligible: true, reasons: [], alreadyAdded: true }
    const reasons = reasonsToAdd(vehicle, alreadyAdded, order, ctx)
    return { order, eligible: reasons.length === 0, reasons, alreadyAdded: false }
  })
}
