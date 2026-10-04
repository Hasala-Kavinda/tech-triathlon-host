import { evaluateRoute } from "./evaluate.js"
import { reasonsToAdd } from "./eligibleOrders.js"
import { toMin } from "./time.js"
import type { EngineContext, EngineOrder, EngineVehicle, PackSuggestion } from "./types.js"

/** Earliest deadline first (Fresh is capped at the generic deadline), then lightest first so more orders fit. */
function priority(order: EngineOrder, ctx: EngineContext) {
  const close = toMin(ctx.outlets.get(order.outletId)?.windowClose ?? "23:59")
  return [order.brand === "Fresh" ? Math.min(ctx.config.freshDeadlineMin, close) : close, order.weightKg] as const
}

function greedyFill(vehicle: EngineVehicle, start: readonly EngineOrder[], pool: readonly EngineOrder[], ctx: EngineContext): EngineOrder[] {
  const pack = [...start]
  const ordered = [...pool].sort((a, b) => {
    const [da, wa] = priority(a, ctx)
    const [db, wb] = priority(b, ctx)
    return da - db || wa - wb || a.orderNumber.localeCompare(b.orderNumber)
  })
  for (const order of ordered) {
    // Whole orders only: an order is either added entirely or not at all (rule 12).
    if (reasonsToAdd(vehicle, pack, order, ctx).length === 0) pack.push(order)
  }
  return pack
}

/**
 * Suggest a pack for one vehicle. Mandatory orders are always included (rule 20). The rest is
 * filled greedily within one brand + district cluster (rule 8), so inter-stop travel stays minimal,
 * subject to capacity (18) and the time budget (15/16) - every addition is checked against the
 * combination as a whole. With no mandatory orders the cluster that fits the most orders is chosen.
 */
export function suggestOrderPack(
  vehicle: EngineVehicle,
  eligibleOrders: readonly EngineOrder[],
  mandatoryOrders: readonly EngineOrder[],
  ctx: EngineContext,
): PackSuggestion {
  const mandatoryIds = new Set(mandatoryOrders.map((o) => o.id))
  const candidates = eligibleOrders.filter((o) => !mandatoryIds.has(o.id))
  const mandatoryViolations = evaluateRoute(vehicle, mandatoryOrders, ctx).violations

  let pack: EngineOrder[]
  if (mandatoryViolations.length > 0) {
    pack = [...mandatoryOrders] // cannot fill around an infeasible mandatory set
  } else if (mandatoryOrders.length > 0) {
    pack = greedyFill(vehicle, mandatoryOrders, candidates, ctx)
  } else {
    const groups = new Map<string, EngineOrder[]>()
    for (const order of candidates) {
      const district = ctx.outlets.get(order.outletId)?.district ?? "?"
      const k = `${order.brand}|${district}`
      groups.set(k, [...(groups.get(k) ?? []), order])
    }
    let best: EngineOrder[] = []
    for (const [, group] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      const filled = greedyFill(vehicle, [], group, ctx)
      const weight = filled.reduce((s, o) => s + o.weightKg, 0)
      const bestWeight = best.reduce((s, o) => s + o.weightKg, 0)
      if (filled.length > best.length || (filled.length === best.length && weight > bestWeight)) best = filled
    }
    pack = best
  }

  const packIds = new Set(pack.map((o) => o.id))
  const excluded = candidates
    .filter((o) => !packIds.has(o.id))
    .map((order) => ({ order, reasons: reasonsToAdd(vehicle, pack, order, ctx) }))
  return { suggested: pack, excluded, mandatoryViolations }
}
