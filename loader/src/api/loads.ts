import { apiRequest } from "./client"

type LoadItem = {
  itemId: string
  tripStopId: string
  orderIds: string[]
  sku: string
  name: string
  expectedQuantity: number
  loadedQuantity: number
  varianceQuantity: number
  status: "pending" | "loaded" | "missing" | "damaged"
  exception?: { type: "missing" | "damaged"; quantity: number; reasonCode: string; note?: string }
}

type LoadTrip = {
  tripNumber: string
  vehicleId: string
  depot: string
  serviceDate: string
  departureAt: string
  totals?: { weightKg?: number; volumeM3?: number }
  stops: Array<{ tripStopId: string; stopId: string; outletId: string; sequence: number; plannedArrivalAt?: string }>
}

type LoadRecord = {
  tripId: string
  depot: string
  status: "available" | "claimed" | "loading" | "reconciled" | "confirmed"
  version: number
  claimedBy?: string
  createdAt: string
  updatedAt: string
  confirmedAt?: string
  items: LoadItem[]
  trip?: LoadTrip
  planChanges?: Array<{
    changeId: string
    type: string
    orderId: string
    description: string
    reason?: string
    createdAt: string
    acknowledgedAt?: string
    acknowledgedBy?: string
  }>
}

export const loadApi = {
  // The backend scopes this to the Loader's own depot; serviceDate narrows it to one day.
  list: (serviceDate: string) => apiRequest<LoadRecord[]>(`/load-jobs?serviceDate=${encodeURIComponent(serviceDate)}`),
  claim: (tripId: string, version: number) => apiRequest<LoadRecord>(`/load-jobs/${tripId}/claim`, { method: "POST", headers: { "If-Match": String(version) }, body: JSON.stringify({ expectedVersion: version }) }),
  start: (tripId: string, version: number) => apiRequest<LoadRecord>(`/load-jobs/${tripId}/start-loading`, { method: "POST", headers: { "If-Match": String(version) }, body: JSON.stringify({ expectedVersion: version }) }),
  detail: (tripId: string) => apiRequest<LoadRecord>(`/load-jobs/${tripId}`),
  updateItem: (tripId: string, itemId: string, version: number, status: "pending" | "loaded", loadedQuantity: number) => apiRequest<LoadRecord>(`/load-jobs/${tripId}/items/${encodeURIComponent(itemId)}`, { method: "PATCH", headers: { "If-Match": String(version) }, body: JSON.stringify({ status, loadedQuantity, expectedVersion: version }) }),
  exception: (tripId: string, itemId: string, version: number, input: { type: "missing" | "damaged"; quantity: number; reasonCode: string; note?: string }) => apiRequest<LoadRecord>(`/load-jobs/${tripId}/items/${encodeURIComponent(itemId)}/exception`, { method: "PUT", headers: { "If-Match": String(version) }, body: JSON.stringify({ ...input, expectedVersion: version }) }),
  acknowledge: (tripId: string, version: number) => apiRequest<LoadRecord>(`/load-jobs/${tripId}/acknowledge`, { method: "POST", headers: { "If-Match": String(version) }, body: JSON.stringify({ expectedVersion: version }) }),
  reconcile: (tripId: string, version: number) => apiRequest<{ record: LoadRecord }>(`/load-jobs/${tripId}/reconcile`, { method: "POST", headers: { "If-Match": String(version) }, body: JSON.stringify({ expectedVersion: version }) }),
  confirm: (tripId: string, version: number) => apiRequest<LoadRecord>(`/load-jobs/${tripId}/confirm`, { method: "POST", headers: { "If-Match": String(version) }, body: JSON.stringify({ expectedVersion: version }) }),
}

export type { LoadRecord }
