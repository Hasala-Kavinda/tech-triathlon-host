import { colomboDate } from "../lib/dates"
import { apiRequest } from "./client"

export type PlanningOrder = { _id: string; orderNumber: string; outletId: string; brand: "Fresh" | "Style" | "Tech"; items: Array<{ quantity: number; unit: string }>; totalWeightKg: number; cutoffBucket: string; status: string }
export type CalendarDayInfo = { date: string; dayOfWeek: string; isOperating: boolean; isHoliday: boolean; festival?: string }
export type DueSummaryRow = { date: string; brand: "Fresh" | "Style" | "Tech"; due: number; unscheduled: number }
export type DueOrder = PlanningOrder & { requestedDate: string; allocatedTripId?: string }
export type OrderDetail = {
  _id: string
  orderNumber: string
  outletId: string
  brand: "Fresh" | "Style" | "Tech"
  orderType: string
  requestedDate: string
  cutoffBucket: string
  status: string
  createdAt: string
  totalWeightKg: number
  totalVolumeM3: number
  deferredTo?: string
  deferralReason?: string
  items: Array<{ sku: string; name: string; unit: string; quantity: number }>
  statusHistory: Array<{ status: string; at: string; note?: string }>
}
export type TripRule = { code: string; passed: boolean; message: string }
export type TripSummary = {
  _id: string
  tripNumber: string
  vehicleId: string
  status: string
  serviceDate: string
  departureAt: string
  plannedEndAt?: string
  stops: Array<{ stopId: string; outletId: string; status: string; plannedArrivalAt?: string }>
  orders: Array<{ _id: string; brand: "Fresh" | "Style" | "Tech" }>
}
export type FleetVehicle = { vehicleId: string; type: string; temperatureClass: string; weightCapacityKg: number; kmPerL: number; weeklyFuelQuotaL: number }
export type DriverReference = { _id: string; employeeId: string; name: string; depot?: string }
export type TripDraft = { _id: string; version: number; tripNumber: string; status: string }
export type TripInput = {
  serviceDate: string
  departureAt: string
  plannedEndAt: string
  vehicleId: string
  driverId: string
  distanceKm: number
  stops: Array<{ orderId: string; plannedArrivalAt: string }>
}

export const planningApi = {
  /**
   * Today in Asia/Colombo according to the server. The cutoff service returns `serverNow`
   * with every calendar lookup, so we ask it using the device's own idea of today and trust
   * the server's clock for the answer. If the lookup fails (for example the date is outside
   * the imported calendar) the device clock is used.
   */
  async today() {
    return (await planningApi.serverClock()).today
  },
  /** Server time (ms since epoch) plus today in Asia/Colombo; `synced` is false when the server could not be reached. */
  async serverClock(): Promise<{ today: string; serverNowMs: number; synced: boolean }> {
    const guess = colomboDate(new Date())
    try {
      const day = await apiRequest<{ serverNow: string }>(`/calendar/${guess}`)
      const serverNowMs = new Date(day.serverNow).getTime()
      return { today: colomboDate(new Date(serverNowMs)), serverNowMs, synced: true }
    } catch {
      return { today: guess, serverNowMs: Date.now(), synced: false }
    }
  },
  calendarRange: (from: string, to: string) => apiRequest<CalendarDayInfo[]>(`/calendar?from=${from}&to=${to}`),
  dueSummary: (from: string, to: string) => apiRequest<DueSummaryRow[]>(`/planning/due-summary?from=${from}&to=${to}`),
  dueOrders: (date: string, brand?: string | null) => apiRequest<DueOrder[]>(`/planning/due-orders?date=${encodeURIComponent(date)}${brand ? `&brand=${encodeURIComponent(brand)}` : ""}`),
  orders: (serviceDate: string) => apiRequest<PlanningOrder[]>(`/planning/orders?serviceDate=${encodeURIComponent(serviceDate)}&pageSize=100`),
  order: (orderId: string) => apiRequest<OrderDetail>(`/orders/${encodeURIComponent(orderId)}`),
  vehicles: (serviceDate: string) => apiRequest<FleetVehicle[]>(`/reference/vehicles?serviceDate=${encodeURIComponent(serviceDate)}`),
  drivers: () => apiRequest<DriverReference[]>("/reference/drivers"),
  createTrip: (input: TripInput) => apiRequest<TripDraft>("/planning/trips", { method: "POST", body: JSON.stringify(input) }),
  validateTrip: (tripId: string) => apiRequest<{ valid: boolean; version: number; rules: TripRule[] }>(`/planning/trips/${tripId}/validate`, { method: "POST" }),
  trips: (date: string) => apiRequest<Array<Omit<TripSummary, "orders">>>(`/trips?date=${encodeURIComponent(date)}`),
  tripDetail: (tripId: string) => apiRequest<TripSummary>(`/trips/${tripId}`),
  publishTrip: (tripId: string, version: number) => apiRequest<TripDraft>(`/planning/trips/${tripId}/publish`, { method: "POST", headers: { "If-Match": String(version) }, body: JSON.stringify({ expectedVersion: version }) }),
  deferBatch: (orderIds: string[], nextDate: string, reasonCode: string, note?: string) => apiRequest<Array<{ orderId: string; result: "deferred" | "conflict" }>>("/orders/defer-batch", { method: "POST", body: JSON.stringify({ orderIds, nextDate, reasonCode, note }) }),
}
