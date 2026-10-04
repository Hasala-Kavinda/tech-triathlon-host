/**
 * Route Suggestion Engine - plain input/output types.
 * This folder is self-contained: it has no database or framework imports and nothing outside
 * it imports it. Field names follow the WayLink database (camelCase), not the CSV headers;
 * `data/` adapts the CSVs.
 */
export type Brand = "Fresh" | "Style" | "Tech"
export type DockType = "rear_dock" | "street" | "mall_bay"
export type ParkingConstraint = "normal" | "van_only" | "mall_dock"

export interface EngineOrder {
  id: string
  orderNumber: string
  outletId: string
  brand: Brand
  status: string
  /** True once the order belongs to a trip (allocatedTripId set). */
  allocated: boolean
  /** YYYY-MM-DD planning date the order is due for. */
  requestedDate: string
  weightKg: number
  volumeM3: number
  /** True if any item is chilled or frozen. */
  needsReefer: boolean
}

export interface EngineOutlet {
  outletId: string
  brand: Brand
  district: string
  depot: string
  dockType: DockType
  parkingConstraint: ParkingConstraint
  /** HH:mm */
  windowOpen: string
  windowClose: string
}

export interface EngineVehicle {
  vehicleId: string
  type: "van" | "truck"
  temp: "reefer" | "ambient"
  depot: string
  weightCapKg: number
  volumeCapM3: number
  kmPerL: number
  weeklyFuelQuotaL: number
}

/** What the vehicle has already committed on the service date / week. Supplied by the caller. */
export interface VehicleDayState {
  turnsToday: number
  weeklyFuelUsedL: number
  /** Minutes already used today, per budget pool. */
  usedMinutes: { fresh: number; styleTech: number }
}

export interface TravelRow {
  district: string
  depot: string
  depotToDistrictKm: number
  depotToDistrictMin: number
  interStopKm: number
  interStopMin: number
}
export interface AllowanceRow { brand: Brand; dockType: DockType; minutes: number }

export interface TravelTable { find(depot: string, district: string): TravelRow | undefined }
export interface AllowanceTable { find(brand: Brand, dockType: DockType): number | undefined }

export interface EngineConfig {
  maxTurnsPerDay: number
  freshBudgetMin: number
  styleTechBudgetMin: number
  /** First Fresh departure, minutes after midnight (03:30). */
  freshStartMin: number
  /** Generic Fresh delivery deadline, minutes after midnight (08:00). */
  freshDeadlineMin: number
}

export interface EngineContext {
  serviceDate: string
  outlets: ReadonlyMap<string, EngineOutlet>
  vehicleState: Readonly<Record<string, VehicleDayState>>
  travel: TravelTable
  allowances: AllowanceTable
  config: EngineConfig
  /**
   * Development phase (mirrors the backend's DEV_MODE): the closed-day (rule 5), Fresh-deadline (rule 14)
   * and due-date (rule 17) rules are reported as warnings instead of blocking. Every other rule is unchanged.
   */
  devMode?: boolean
  /** Optional override of the operating calendar (false = closed). Sundays are always closed. */
  isOperatingDay?: boolean
  /** First Style/Tech departure (minutes after midnight). Not given by the rules; mall windows are not evaluable without it. */
  styleTechDepartureMin?: number
}

export type ViolationScope = "vehicle" | "order" | "set"
export interface Violation {
  /** Stable machine code. */
  code: string
  /** Rule number from the Route Suggestion Engine rule summary. */
  rule: number
  scope: ViolationScope
  message: string
  orderId?: string
}

export interface RouteStop {
  sequence: number
  orderId: string
  orderNumber: string
  outletId: string
  district: string
  brand: Brand
  dockType: DockType
  /** Minutes after midnight, or null when the departure time is unknown. */
  arrivalMin: number | null
  handlingMin: number
}

export interface RouteEvaluation {
  feasible: boolean
  violations: Violation[]
  /** Things the engine could not evaluate (not blocking). */
  warnings: string[]
  stops: RouteStop[]
  tripMinutes: number | null
  /** Departure from the depot (minutes after midnight), or null when it is unknown. */
  departureMin: number | null
  distanceKm: number | null
  fuelL: number | null
  load: { weightKg: number; volumeM3: number; weightPct: number; volumePct: number }
  budget: { pool: "fresh" | "styleTech" | null; usedBefore: number; limit: number | null; afterTrip: number | null; fits: boolean | null }
}

export interface RankedVehicle {
  vehicle: EngineVehicle
  eligible: boolean
  reasons: Violation[]
  /** Higher is better; 0 for ineligible vehicles. */
  fitScore: number
  evaluation: RouteEvaluation
}

export interface AnnotatedOrder {
  order: EngineOrder
  eligible: boolean
  reasons: Violation[]
  /** True when the order is already part of the current selection. */
  alreadyAdded: boolean
}

export interface PackSuggestion {
  suggested: EngineOrder[]
  excluded: Array<{ order: EngineOrder; reasons: Violation[] }>
  /** Violations of the mandatory orders on their own; non-empty means the mandatory set cannot be served by this vehicle. */
  mandatoryViolations: Violation[]
}

export type MapStopStatus = "on_route" | "in_reach" | "out_of_reach"
export interface MapStop { orderId: string; orderNumber: string; outletId: string; district: string; brand: Brand; status: MapStopStatus; sequence: number | null; reasons: Violation[] }

export interface RouteResult extends RouteEvaluation {
  vehicleId: string
  mapStops: MapStop[]
}

export interface PlanResult {
  flow: "vehicle" | "order"
  serviceDate: string
  ranking: RankedVehicle[]
  vehicleId: string | null
  mandatoryIds: string[]
  selectedIds: string[]
  eligibleOrders: AnnotatedOrder[]
  suggestion: PackSuggestion | null
  route: RouteResult | null
  /** Orders excluded from the current suggestion (e.g. dropped in review, or "suggest another"). */
  suggestionExcludedIds: string[]
  lastEdit?: { applied: boolean; rejected?: Violation[]; dropped?: string[] }
}

export type PlanEdit =
  | { type: "add"; orderId: string }
  | { type: "drop"; orderId: string }
  | { type: "setVehicle"; vehicleId: string }
  /** Add several orders in order; each must pass the rules cumulatively, the rest are reported as rejected. */
  | { type: "addMany"; orderIds: string[] }
  /** Remove every non-mandatory order from the selection. */
  | { type: "clear" }
  /** Re-run the suggestion for the current vehicle, leaving these orders out. The selection is untouched. */
  | { type: "resuggest"; excludeOrderIds: string[] }
  /** Order-first only: move to the next-best eligible vehicle for the mandatory orders and re-chain the rest. */
  | { type: "nextVehicle" }
