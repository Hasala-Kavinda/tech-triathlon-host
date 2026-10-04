import { DEFAULT_CONFIG } from "./config.js"
import { loadDriveData } from "./data/driveData.js"
import type { EngineContext, EngineOrder, EngineVehicle, RouteEvaluation, VehicleDayState } from "./types.js"

/**
 * Test helpers. Outlets, vehicles, travel times and service allowances are the REAL Drive Data
 * CSVs. Orders are synthetic (the database has no real orders yet) and are built on real outlets.
 */
export const data = loadDriveData()
export const MONDAY = "2026-10-05"
export const SATURDAY = "2026-10-10"
export const SUNDAY = "2026-10-04"

export function makeCtx(over: Partial<EngineContext> & { state?: Record<string, Partial<VehicleDayState>> } = {}): EngineContext {
  const { state, ...rest } = over
  const vehicleState: Record<string, VehicleDayState> = {}
  for (const [id, s] of Object.entries(state ?? {})) {
    vehicleState[id] = { turnsToday: 0, weeklyFuelUsedL: 0, usedMinutes: { fresh: 0, styleTech: 0 }, ...s }
  }
  return {
    serviceDate: MONDAY, outlets: data.outlets, vehicleState, travel: data.travel, allowances: data.allowances,
    config: DEFAULT_CONFIG, ...rest,
  }
}

let seq = 0
export function order(outletId: string, over: Partial<EngineOrder> = {}): EngineOrder {
  const outlet = data.outlets.get(outletId)
  if (!outlet) throw new Error(`Unknown outlet ${outletId}`)
  seq += 1
  return {
    id: `o${seq}`, orderNumber: `SYN-${String(seq).padStart(4, "0")}`, outletId, brand: outlet.brand, status: "submitted",
    allocated: false, requestedDate: MONDAY, weightKg: 10, volumeM3: 0.1, needsReefer: false, ...over,
  }
}

export const vehicle = (id: string): EngineVehicle => {
  const v = data.vehicles.find((x) => x.vehicleId === id)
  if (!v) throw new Error(`Unknown vehicle ${id}`)
  return v
}

export const codes = (ev: Pick<RouteEvaluation, "violations">) => ev.violations.map((v) => v.code)

// Real reference rows used by the tests (asserted in the "reference data" test so a CSV change is noticed).
export const FRESH_REAR_0745 = "OUT005" // Fresh, Colombo, rear_dock, window 04:00-07:45
export const FRESH_REAR_0745_B = "OUT009"
export const FRESH_REAR_0730 = "OUT008" // window 05:00-07:30
export const FRESH_REAR_0730_B = "OUT010"
export const FRESH_STREET_0800 = "OUT004" // street, normal, 05:30-08:00
export const FRESH_VAN_ONLY = "OUT001" // street, van_only, 05:00-07:30
export const FRESH_GAMPAHA = "OUT025"
export const STYLE_REAR = "OUT019" // Style, Colombo, rear_dock, 09:00-17:00
export const STYLE_STREET = "OUT020"
export const TECH_REAR = "OUT024"
export const STYLE_MALL_1030 = "OUT017" // mall_dock, 10:30-12:30
export const KANDY_OUTLET = "OUT076"
