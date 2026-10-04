import { useEffect, useMemo, useState } from "react"
import {
  buildAllowanceTable, buildTravelTable, DEFAULT_CONFIG,
  type AnnotatedOrder, type EngineContext, type EngineOrder, type EngineOutlet, type EngineVehicle, type VehicleDayState, type Violation,
} from "@route-engine"
import { planningApi } from "../api/planning"
import type { Order, Vehicle } from "../types/dispatcher"

/** Glue between the Dispatcher screens and the route-suggestion engine (backend/src/route-engine). No rules live here. */

export type EngineData =
  | { status: "loading"; ctx: null; vehicles: EngineVehicle[]; error: "" }
  | { status: "error"; ctx: null; vehicles: EngineVehicle[]; error: string }
  | { status: "ready"; ctx: EngineContext; vehicles: EngineVehicle[]; error: "" }

/**
 * Loads everything the engine needs for a service date: outlets, travel times, service allowances,
 * the operating-day flag and each vehicle's real usage (from the backend), plus the fleet.
 * `reloadKey` changes after orders/trips change server-side (scheduling, deferral).
 */
export function useEngineContext(date: string | null, reloadKey: number): EngineData {
  const [state, setState] = useState<EngineData>({ status: "loading", ctx: null, vehicles: [], error: "" })
  useEffect(() => {
    if (!date) return
    let cancelled = false
    void Promise.all([planningApi.engineContext(date), planningApi.vehicles(date)])
      .then(([payload, fleet]) => {
        if (cancelled) return
        const outlets = new Map(payload.outlets.map((o) => [o.outletId, o as EngineOutlet]))
        const ctx: EngineContext = {
          serviceDate: date, outlets, vehicleState: payload.vehicleState,
          travel: buildTravelTable(payload.travelRows), allowances: buildAllowanceTable(payload.allowanceRows), config: DEFAULT_CONFIG,
          ...(payload.isOperatingDay === undefined ? {} : { isOperatingDay: payload.isOperatingDay }),
          ...(payload.devMode ? { devMode: true } : {}),
        }
        const vehicles: EngineVehicle[] = fleet.map((v) => ({
          vehicleId: v.vehicleId, type: v.type === "van" ? "van" : "truck", temp: v.temperatureClass === "reefer" ? "reefer" : "ambient", depot: v.depot,
          weightCapKg: v.weightCapacityKg, volumeCapM3: v.volumeCapacityM3, kmPerL: v.kmPerL, weeklyFuelQuotaL: v.weeklyFuelQuotaL,
        }))
        setState({ status: "ready", ctx, vehicles, error: "" })
      })
      .catch((error) => {
        if (!cancelled) setState({ status: "error", ctx: null, vehicles: [], error: error instanceof Error ? error.message : "The planning data could not be loaded." })
      })
    return () => { cancelled = true }
  }, [date, reloadKey])
  return state
}

export const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
export const hhmm = (min: number | null | undefined) =>
  min === null || min === undefined ? "–" : `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(Math.round(min % 60)).padStart(2, "0")}`

/** The engine context with the Style/Tech departure slot the dispatcher picked (needed for mall windows). */
export function useContextWithDeparture(ctx: EngineContext | null, departsTime: string): EngineContext | null {
  return useMemo(() => (ctx ? { ...ctx, styleTechDepartureMin: toMinutes(departsTime) } : null), [ctx, departsTime])
}

/** Engine orders use the backend order id, so edits map back to the Dispatcher's Order objects by `apiId`. */
export function toEngineOrder(order: Order): EngineOrder | null {
  if (!order.apiId || !order.outletId || !order.requestedDate) return null
  return {
    id: order.apiId, orderNumber: order.id, outletId: order.outletId, brand: order.type, status: order.status ?? "submitted", allocated: false,
    requestedDate: order.requestedDate, weightKg: order.kg, volumeM3: order.volumeM3 ?? 0, needsReefer: order.needsReefer ?? false,
  }
}

export const uiVehicleType = (v: EngineVehicle): Vehicle["type"] => (v.temp === "reefer" ? "Refrigerated" : v.type === "van" ? "Van" : "Lorry")

export function toUiVehicle(v: EngineVehicle, state?: VehicleDayState): Vehicle {
  const km = (state?.weeklyFuelUsedL ?? 0) * v.kmPerL
  const kmQuota = Math.round(v.weeklyFuelQuotaL * v.kmPerL)
  return {
    id: v.vehicleId, type: uiVehicleType(v), capacityKg: v.weightCapKg, volumeM3: v.volumeCapM3, depot: v.depot, length: v.depot,
    turns: state?.turnsToday ?? 0, turnQuota: DEFAULT_CONFIG.maxTurnsPerDay, km: Math.round(km), kmQuota,
    fuel: Math.max(0, Math.round(100 - ((state?.weeklyFuelUsedL ?? 0) / v.weeklyFuelQuotaL) * 100)),
  }
}

const LABELS: Record<string, string> = {
  TURNS_PER_DAY: "Day limit · 2 of 2 routes", FUEL_QUOTA: "Weekly fuel quota reached", NOT_OPERATING_DAY: "Closed day",
  DEPOT_MISMATCH: "Wrong depot", TEMPERATURE: "Needs a reefer", VAN_ONLY: "Van only outlet", WEIGHT_CAPACITY: "Over weight", VOLUME_CAPACITY: "Over volume",
  SAME_BRAND: "Different brand", SAME_DISTRICT: "Different district", TIME_BUDGET: "Time budget full", FRESH_DEADLINE: "Misses Fresh deadline",
  MALL_WINDOW: "Outside mall window", ORDER_NOT_ELIGIBLE: "Not open for planning", ORDER_NOT_DUE: "Due another day", DUPLICATE_ORDER: "Already added",
  NO_TRAVEL_DATA: "No travel data", NO_ALLOWANCE_DATA: "No service allowance", OUTLET_UNKNOWN: "Unknown outlet",
}
export const reasonLabel = (v: Violation) => LABELS[v.code] ?? v.code
export const reasonText = (reasons: readonly Violation[]) => reasons.map((r) => r.message).join("\n")
/** The most common reason across ineligible orders, for "no orders fit" captions. */
export function topReason(annotated: readonly AnnotatedOrder[]): string | null {
  const counts = new Map<string, { n: number; v: Violation }>()
  for (const a of annotated) for (const r of a.reasons) counts.set(r.code, { n: (counts.get(r.code)?.n ?? 0) + 1, v: r })
  const best = [...counts.values()].sort((a, b) => b.n - a.n)[0]
  return best ? reasonLabel(best.v) : null
}
