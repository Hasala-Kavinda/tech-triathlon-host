import { DateTime } from "luxon"
import { CalendarDay, Order, Outlet, Trip, Vehicle } from "../../database/models/index.js"
import { OPERATING_ZONE } from "../../common/time.js"

export type RuleResult = { code: string; passed: boolean; message: string; actual?: unknown; threshold?: unknown }

const passFail = (code: string, passed: boolean, message: string, actual?: unknown, threshold?: unknown): RuleResult => ({ code, passed, message, actual, threshold })

export async function validateTrip(input: {
  serviceDate: string
  departureAt: Date
  plannedEndAt?: Date
  vehicleId: string
  driverId: string
  orderIds: string[]
  plannedArrivals?: Record<string, Date>
  distanceKm: number
  excludeTripId?: string
}) {
  const [day, vehicle, orders, existingVehicleRoutes, overlappingDriverTrip] = await Promise.all([
    CalendarDay.findOne({ date: input.serviceDate }).lean(),
    Vehicle.findOne({ vehicleId: input.vehicleId, active: true }).lean(),
    Order.find({ _id: { $in: input.orderIds } }).lean(),
    Trip.countDocuments({
      ...(input.excludeTripId ? { _id: { $ne: input.excludeTripId } } : {}),
      serviceDate: input.serviceDate,
      vehicleId: input.vehicleId,
      status: { $in: ["published", "load_confirmed", "claimed", "in_transit", "completed"] },
    }),
    input.plannedEndAt ? Trip.findOne({
      ...(input.excludeTripId ? { _id: { $ne: input.excludeTripId } } : {}),
      driverId: input.driverId,
      serviceDate: input.serviceDate,
      status: { $ne: "cancelled" },
      departureAt: { $lt: input.plannedEndAt },
      plannedEndAt: { $gt: input.departureAt },
    }).lean() : null,
  ])

  const rules: RuleResult[] = []
  rules.push(passFail("OPERATING_DAY", day?.isOperating === true, day?.isOperating ? "The service date is an operating day." : "The service date is not an operating day."))
  rules.push(passFail("VEHICLE_AVAILABLE", Boolean(vehicle), vehicle ? "The vehicle is active and available in reference data." : "The selected vehicle is unavailable."))
  rules.push(passFail("ORDERS_FOUND", orders.length === new Set(input.orderIds).size, "Every selected order must exist.", orders.length, new Set(input.orderIds).size))

  const eligible = orders.every((order) => ["submitted", "deferred"].includes(order.status) && !order.allocatedTripId)
  rules.push(passFail("ORDERS_UNALLOCATED", eligible, eligible ? "All orders are eligible and unallocated." : "An order is no longer eligible or is already allocated."))

  const totalWeightKg = orders.reduce((sum, order) => sum + order.totalWeightKg, 0)
  const totalVolumeM3 = orders.reduce((sum, order) => sum + order.totalVolumeM3, 0)
  rules.push(passFail("WEIGHT_CAPACITY", Boolean(vehicle) && totalWeightKg <= vehicle!.weightCapacityKg, "Total order weight must fit the vehicle.", totalWeightKg, vehicle?.weightCapacityKg))
  rules.push(passFail("VOLUME_CAPACITY", Boolean(vehicle) && totalVolumeM3 <= vehicle!.volumeCapacityM3, "Total order volume must fit the vehicle.", totalVolumeM3, vehicle?.volumeCapacityM3))

  const needsReefer = orders.some((order) => order.items.some((item) => item.temperatureClass === "chilled" || item.temperatureClass === "frozen"))
  const supportsTemperature = !needsReefer || ["reefer", "chilled", "frozen"].includes(vehicle?.temperatureClass ?? "")
  rules.push(passFail("TEMPERATURE_COMPATIBLE", supportsTemperature, supportsTemperature ? "Vehicle temperature capability is compatible." : "A chilled/frozen order requires a temperature-controlled vehicle."))

  rules.push(passFail("VEHICLE_ROUTE_LIMIT", existingVehicleRoutes < 2, "A vehicle may operate at most two routes per service date.", existingVehicleRoutes, 2))
  rules.push(passFail("DRIVER_NO_OVERLAP", !overlappingDriverTrip, overlappingDriverTrip ? "The Driver has an overlapping trip." : "The Driver has no overlapping trip."))

  const weekStart = DateTime.fromISO(input.serviceDate, { zone: OPERATING_ZONE }).startOf("week").toFormat("yyyy-MM-dd")
  const weekEnd = DateTime.fromISO(input.serviceDate, { zone: OPERATING_ZONE }).endOf("week").toFormat("yyyy-MM-dd")
  const fuelTrips = vehicle ? await Trip.find({ vehicleId: input.vehicleId, serviceDate: { $gte: weekStart, $lte: weekEnd }, status: { $in: ["published", "load_confirmed", "claimed", "in_transit", "completed"] }, ...(input.excludeTripId ? { _id: { $ne: input.excludeTripId } } : {}) }).select("distanceKm").lean() : []
  const usedFuelL = vehicle ? fuelTrips.reduce((sum, trip) => sum + trip.distanceKm / vehicle.kmPerL, 0) : 0
  const plannedFuelL = vehicle ? input.distanceKm / vehicle.kmPerL : Number.POSITIVE_INFINITY
  rules.push(passFail("WEEKLY_FUEL_QUOTA", Boolean(vehicle) && usedFuelL + plannedFuelL <= vehicle!.weeklyFuelQuotaL, "The trip must fit the vehicle's weekly fuel quota.", usedFuelL + plannedFuelL, vehicle?.weeklyFuelQuotaL))

  const outlets = await Outlet.find({ outletId: { $in: orders.map((order) => order.outletId) } }).lean()
  const outletMap = new Map(outlets.map((outlet) => [outlet.outletId, outlet]))
  for (const order of orders.filter((candidate) => candidate.brand.toLowerCase() === "fresh")) {
    const outlet = outletMap.get(order.outletId)
    const arrival = input.plannedArrivals?.[String(order._id)]
    const eight = DateTime.fromISO(input.serviceDate, { zone: OPERATING_ZONE }).set({ hour: 8 })
    const windowClose = outlet
      ? DateTime.fromISO(`${input.serviceDate}T${outlet.windowCloseTime}`, { zone: OPERATING_ZONE })
      : eight
    const deadline = DateTime.min(eight, windowClose)
    const passed = Boolean(arrival) && DateTime.fromJSDate(arrival!).setZone(OPERATING_ZONE) <= deadline
    rules.push(passFail("FRESH_BEFORE_DEADLINE", passed, passed ? `${order.orderNumber} is planned before its Fresh deadline.` : `${order.orderNumber} must be planned by ${deadline.toFormat("HH:mm")}.`, arrival?.toISOString(), deadline.toUTC().toISO()))
  }

  return { valid: rules.every((rule) => rule.passed), rules, totals: { weightKg: totalWeightKg, volumeM3: totalVolumeM3, plannedFuelL } }
}
