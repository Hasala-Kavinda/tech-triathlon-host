import { buildRoute } from "./buildRoute.js"
import { filterEligibleOrders, reasonsToAdd } from "./eligibleOrders.js"
import { rankVehiclesForOrders } from "./rankVehicles.js"
import { suggestOrderPack } from "./suggestPack.js"
import type { EngineContext, EngineOrder, EngineVehicle, PlanEdit, PlanResult, RankedVehicle } from "./types.js"

const byId = <T extends { id: string }>(list: readonly T[], ids: readonly string[]) => {
  const map = new Map(list.map((x) => [x.id, x]))
  return ids.map((id) => map.get(id)).filter((x): x is T => Boolean(x))
}

export interface PlanOptions {
  /**
   * true (default): the suggested pack is selected, so the route is built from it.
   * false: only the mandatory orders are selected; the suggestion is still computed and returned
   * so a UI can offer it ("Review" -> "Add N orders") before the dispatcher accepts it.
   */
  autoSelect?: boolean
  /** Orders left out of the suggestion. */
  excludeOrderIds?: readonly string[]
}

/** Shared tail of both flows: given a vehicle + (suggested or explicit) selection, produce the full result. */
function complete(
  flow: PlanResult["flow"], vehicle: EngineVehicle, openOrders: readonly EngineOrder[], mandatory: readonly EngineOrder[],
  selection: readonly EngineOrder[] | "auto" | "mandatory", excluded: readonly string[], ranking: PlanResult["ranking"], ctx: EngineContext,
): PlanResult {
  const skip = new Set(excluded)
  const candidates = filterEligibleOrders(vehicle, openOrders.filter((o) => !skip.has(o.id)), mandatory, ctx).filter((a) => a.eligible).map((a) => a.order)
  const suggestion = suggestOrderPack(vehicle, candidates, mandatory, ctx)
  const selected = selection === "auto" ? suggestion.suggested : selection === "mandatory" ? mandatory : selection
  return {
    flow, serviceDate: ctx.serviceDate, ranking, vehicleId: vehicle.vehicleId,
    mandatoryIds: mandatory.map((o) => o.id), selectedIds: selected.map((o) => o.id),
    eligibleOrders: filterEligibleOrders(vehicle, openOrders, selected, ctx),
    suggestion, route: buildRoute(vehicle, selected, ctx, openOrders), suggestionExcludedIds: [...excluded],
  }
}

/**
 * Flow 1 (vehicle-first). Ranks every vehicle (nothing hidden), then for the chosen vehicle
 * filters the open orders, suggests a pack and builds the route.
 */
export function planFromVehicle(
  vehicleId: string, openOrders: readonly EngineOrder[], allVehicles: readonly EngineVehicle[], ctx: EngineContext, options: PlanOptions = {},
): PlanResult {
  const vehicle = allVehicles.find((v) => v.vehicleId === vehicleId)
  if (!vehicle) throw new Error(`Unknown vehicle ${vehicleId}`)
  const ranking = rankVehiclesForOrders([], allVehicles, ctx)
  return complete("vehicle", vehicle, openOrders, [], options.autoSelect === false ? "mandatory" : "auto", options.excludeOrderIds ?? [], ranking, ctx)
}

function emptyOrderPlan(mandatory: readonly EngineOrder[], ranking: RankedVehicle[], ctx: EngineContext): PlanResult {
  return { flow: "order", serviceDate: ctx.serviceDate, ranking, vehicleId: null, mandatoryIds: mandatory.map((o) => o.id), selectedIds: [], eligibleOrders: [], suggestion: null, route: null, suggestionExcludedIds: [] }
}

/**
 * Flow 2 (order-first / schedule now). The mandatory orders are always on the route. Vehicles are
 * ranked for those orders; the best eligible one (or `options.vehicleId`) is then used for the same
 * eligible-orders -> suggestion -> route process as flow 1. If no vehicle can serve them, `vehicleId`
 * is null and the ranking explains why.
 */
export function planFromOrders(
  mandatoryOrderIds: readonly string[], openOrders: readonly EngineOrder[], allVehicles: readonly EngineVehicle[], ctx: EngineContext,
  options: PlanOptions & { vehicleId?: string } = {},
): PlanResult {
  const mandatory = byId(openOrders, mandatoryOrderIds)
  if (mandatory.length !== new Set(mandatoryOrderIds).size) throw new Error("A mandatory order is not in the open order list.")
  const ranking = rankVehiclesForOrders(mandatory, allVehicles, ctx)
  const chosen = options.vehicleId ? allVehicles.find((v) => v.vehicleId === options.vehicleId) : ranking.find((r) => r.eligible)?.vehicle
  if (!chosen) return emptyOrderPlan(mandatory, ranking, ctx)
  return complete("order", chosen, openOrders, mandatory, options.autoSelect === false ? "mandatory" : "auto", options.excludeOrderIds ?? [], ranking, ctx)
}

/**
 * Apply a dispatcher edit to a previous result and return the live result (rule 21). Implemented
 * as a clean re-evaluation of the new selection; the dispatcher's choices stick (the suggestion is
 * refreshed for the current vehicle but never re-selected).
 *  - add / addMany: rejected (with reasons) unless the order is eligible against the current selection.
 *  - drop: removes the order; dropping a mandatory order also un-mandatories it (rule 20).
 *  - clear: removes every non-mandatory order.
 *  - setVehicle / nextVehicle: keeps mandatory orders always, and other selected orders only while they
 *    are still eligible cumulatively on the new vehicle; the rest are reported in `lastEdit.dropped`.
 *  - resuggest: new suggestion for the same vehicle without the given orders.
 */
export function recompute(
  previous: PlanResult, edit: PlanEdit, openOrders: readonly EngineOrder[], allVehicles: readonly EngineVehicle[], ctx: EngineContext,
): PlanResult {
  let mandatoryIds = [...previous.mandatoryIds]
  let selected = byId(openOrders, previous.selectedIds)
  let excluded = [...previous.suggestionExcludedIds]
  let lastEdit: NonNullable<PlanResult["lastEdit"]> = { applied: true }
  let vehicleId = previous.vehicleId

  if (edit.type === "setVehicle") vehicleId = edit.vehicleId
  if (edit.type === "nextVehicle") {
    const eligible = rankVehiclesForOrders(byId(openOrders, mandatoryIds), allVehicles, ctx).filter((r) => r.eligible)
    const others = eligible.filter((r) => r.vehicle.vehicleId !== previous.vehicleId)
    if (!others.length) {
      return { ...previous, lastEdit: { applied: false, rejected: [{ code: "NO_OTHER_VEHICLE", rule: 20, scope: "vehicle", message: "No other vehicle can take these orders." }] } }
    }
    const at = eligible.findIndex((r) => r.vehicle.vehicleId === previous.vehicleId)
    vehicleId = (at < 0 ? others[0]! : eligible[(at + 1) % eligible.length]!).vehicle.vehicleId
    if (vehicleId === previous.vehicleId) vehicleId = others[0]!.vehicle.vehicleId
  }
  const vehicle = allVehicles.find((v) => v.vehicleId === vehicleId)
  if (!vehicle) throw new Error("No vehicle selected for this plan.")

  if (edit.type === "add" || edit.type === "addMany") {
    const ids = edit.type === "add" ? [edit.orderId] : edit.orderIds
    const notAdded: string[] = []
    const rejected: NonNullable<PlanResult["lastEdit"]>["rejected"] = []
    for (const id of ids) {
      const order = openOrders.find((o) => o.id === id)
      if (!order) throw new Error(`Unknown order ${id}`)
      if (selected.some((o) => o.id === id)) continue
      const reasons = reasonsToAdd(vehicle, selected, order, ctx)
      if (reasons.length) { notAdded.push(id); rejected.push(...reasons) } else selected = [...selected, order]
    }
    if (notAdded.length) lastEdit = edit.type === "add" ? { applied: false, rejected } : { applied: true, rejected, dropped: notAdded }
  } else if (edit.type === "drop") {
    selected = selected.filter((o) => o.id !== edit.orderId)
    mandatoryIds = mandatoryIds.filter((id) => id !== edit.orderId)
  } else if (edit.type === "clear") {
    selected = selected.filter((o) => mandatoryIds.includes(o.id))
  } else if (edit.type === "resuggest") {
    excluded = [...edit.excludeOrderIds]
  } else if (vehicleId !== previous.vehicleId) {
    const kept: EngineOrder[] = [...byId(openOrders, mandatoryIds)]
    const dropped: string[] = []
    for (const order of selected) {
      if (mandatoryIds.includes(order.id)) continue
      if (reasonsToAdd(vehicle, kept, order, ctx).length === 0) kept.push(order)
      else dropped.push(order.id)
    }
    selected = kept
    excluded = [] // a different vehicle gets a fresh suggestion
    if (dropped.length) lastEdit = { applied: true, dropped }
  }

  const mandatory = byId(openOrders, mandatoryIds)
  const ranking = rankVehiclesForOrders(mandatory, allVehicles, ctx)
  const result = complete(previous.flow, vehicle, openOrders, mandatory, selected, excluded, ranking, ctx)
  return { ...result, lastEdit }
}
