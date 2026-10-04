import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { DateTime } from "luxon"
import { OPERATING_ZONE } from "../../common/time.js"
import { Trip } from "../../database/models/index.js"
import { parseCsv } from "../../route-engine/tables.js"
import { OrderReadPort } from "../orders/order.read-port.js"
import { CalendarDayReadPort } from "../reference/calendar-day.read-port.js"
import { Outlet } from "../reference/persistence/outlet.model.js"
import { VehicleReadPort } from "../reference/vehicle.read-port.js"

const LIVE_TRIP_STATUSES = ["published", "loading", "load_confirmed", "claimed", "in_transit", "completed"]

type Rows = Array<Record<string, string>>
let cache: { dir: string; travel: Rows; allowances: Rows } | null = null

/** District travel times and service allowances come from the competition CSVs (no collection exists for them yet). */
function referenceTables(referenceDataDir: string) {
  const dir = resolve(process.cwd(), referenceDataDir)
  if (cache?.dir === dir) return cache
  cache = {
    dir,
    travel: parseCsv(readFileSync(resolve(dir, "district_travel.csv"), "utf8")),
    allowances: parseCsv(readFileSync(resolve(dir, "service_allowance.csv"), "utf8")),
  }
  return cache
}

/**
 * Everything the route-suggestion engine needs besides the open orders and the fleet:
 * outlets, travel/allowance tables, the operating-day flag and each vehicle's real usage
 * (routes today, weekly fuel, minutes already used per budget pool).
 */
export async function buildEngineContext(serviceDate: string, referenceDataDir: string, devMode: boolean) {
  const day = DateTime.fromISO(serviceDate, { zone: OPERATING_ZONE })
  const weekStart = day.startOf("week").toFormat("yyyy-MM-dd")
  const weekEnd = day.endOf("week").toFormat("yyyy-MM-dd")
  const [outlets, vehicles, calendarDay, weekTrips] = await Promise.all([
    Outlet.find({ active: true }).sort({ outletId: 1 }).lean(),
    VehicleReadPort.findActiveByFilter({}),
    CalendarDayReadPort.findByDate(serviceDate),
    Trip.find({ serviceDate: { $gte: weekStart, $lte: weekEnd }, status: { $in: LIVE_TRIP_STATUSES } })
      .select("vehicleId serviceDate distanceKm departureAt plannedEndAt stops.orderId").lean(),
  ])

  const kmPerL = new Map(vehicles.map((v) => [v.vehicleId, v.kmPerL]))
  const todayTrips = weekTrips.filter((t) => t.serviceDate === serviceDate)
  const firstOrders = await OrderReadPort.findByIds(todayTrips.map((t) => t.stops[0]?.orderId).filter((id): id is NonNullable<typeof id> => Boolean(id)))
  const brandOf = new Map(firstOrders.map((o) => [String(o._id), o.brand]))

  const vehicleState: Record<string, { turnsToday: number; weeklyFuelUsedL: number; usedMinutes: { fresh: number; styleTech: number } }> = {}
  const stateOf = (id: string) => (vehicleState[id] ??= { turnsToday: 0, weeklyFuelUsedL: 0, usedMinutes: { fresh: 0, styleTech: 0 } })
  for (const trip of weekTrips) {
    stateOf(trip.vehicleId).weeklyFuelUsedL += trip.distanceKm / (kmPerL.get(trip.vehicleId) ?? Number.POSITIVE_INFINITY)
  }
  for (const trip of todayTrips) {
    const state = stateOf(trip.vehicleId)
    state.turnsToday += 1
    // Minutes the trip occupies, charged to the Fresh or Style+Tech pool by the brand of its first order.
    const minutes = trip.plannedEndAt ? Math.max(0, Math.round((trip.plannedEndAt.getTime() - trip.departureAt.getTime()) / 60_000)) : 0
    const brand = brandOf.get(String(trip.stops[0]?.orderId))
    state.usedMinutes[brand === "Fresh" ? "fresh" : "styleTech"] += minutes
  }

  const tables = referenceTables(referenceDataDir)
  return {
    serviceDate,
    devMode,
    ...(calendarDay ? { isOperatingDay: calendarDay.isOperating } : {}),
    outlets: outlets.map((o) => ({
      outletId: o.outletId, brand: o.brand, district: o.district, depot: o.depot, dockType: o.dockType, parkingConstraint: o.parkingConstraint,
      windowOpen: o.windowOpenTime, windowClose: o.windowCloseTime,
    })),
    travelRows: tables.travel,
    allowanceRows: tables.allowances,
    vehicleState,
    source: { travel: "district_travel.csv", allowances: "service_allowance.csv" },
  }
}
