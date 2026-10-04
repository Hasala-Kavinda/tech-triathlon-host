import { filterEligibleOrders } from "./eligibleOrders.js"
import { evaluateRoute } from "./evaluate.js"
import type { EngineContext, EngineOrder, EngineVehicle, MapStop, RouteResult } from "./types.js"

/**
 * Stop sequence, trip minutes (booklet formula, see evaluate.ts), load percentages, budget fit
 * and map-ready stops. Pure and cheap (one evaluation + one per open order), so it can be re-run
 * on every add/drop/swap. "In reach" is re-evaluated against the CURRENT selection each time (rule 22).
 */
export function buildRoute(
  vehicle: EngineVehicle,
  selectedOrders: readonly EngineOrder[],
  ctx: EngineContext,
  openOrders: readonly EngineOrder[] = [],
): RouteResult {
  const evaluation = evaluateRoute(vehicle, selectedOrders, ctx)
  const onRoute: MapStop[] = evaluation.stops.map((stop) => ({
    orderId: stop.orderId, orderNumber: stop.orderNumber, outletId: stop.outletId, district: stop.district,
    brand: stop.brand, status: "on_route", sequence: stop.sequence, reasons: [],
  }))
  const selected = new Set(selectedOrders.map((o) => o.id))
  const others = filterEligibleOrders(vehicle, openOrders.filter((o) => !selected.has(o.id)), selectedOrders, ctx)
  const rest: MapStop[] = others.map(({ order, eligible, reasons }) => ({
    orderId: order.id, orderNumber: order.orderNumber, outletId: order.outletId,
    district: ctx.outlets.get(order.outletId)?.district ?? "unknown", brand: order.brand,
    status: eligible ? "in_reach" : "out_of_reach", sequence: null, reasons,
  }))
  return { ...evaluation, vehicleId: vehicle.vehicleId, mapStops: [...onRoute, ...rest] }
}
