import { apiRequest } from "./client"

type LoadRecord = {
  tripId: string
  status: "available" | "claimed" | "loading" | "reconciled" | "confirmed"
  version: number
  items: Array<{ itemId: string; stopId: string; orderId: string; name: string; expectedQuantity: number; loadedQuantity: number; status: string }>
  trip?: { tripNumber: string; vehicleId: string; departureAt: string; stops: Array<{ stopId: string; outletId: string; sequence: number }> }
}

export const loadApi = {
  list: () => apiRequest<LoadRecord[]>("/load-jobs"),
  claim: (tripId: string, version: number) => apiRequest<LoadRecord>(`/load-jobs/${tripId}/claim`, { method: "POST", headers: { "If-Match": String(version) }, body: JSON.stringify({ expectedVersion: version }) }),
  start: (tripId: string, version: number) => apiRequest<LoadRecord>(`/load-jobs/${tripId}/start-loading`, { method: "POST", headers: { "If-Match": String(version) }, body: JSON.stringify({ expectedVersion: version }) }),
  detail: (tripId: string) => apiRequest<LoadRecord>(`/load-jobs/${tripId}`),
  updateItem: (tripId: string, itemId: string, version: number, status: "pending" | "loaded", loadedQuantity: number) => apiRequest<LoadRecord>(`/load-jobs/${tripId}/items/${encodeURIComponent(itemId)}`, { method: "PATCH", headers: { "If-Match": String(version) }, body: JSON.stringify({ status, loadedQuantity, expectedVersion: version }) }),
  exception: (tripId: string, itemId: string, version: number, input: { type: "missing" | "damaged"; quantity: number; reasonCode: string; note?: string }) => apiRequest<LoadRecord>(`/load-jobs/${tripId}/items/${encodeURIComponent(itemId)}/exception`, { method: "PUT", headers: { "If-Match": String(version) }, body: JSON.stringify({ ...input, expectedVersion: version }) }),
  reconcile: (tripId: string, version: number) => apiRequest<{ record: LoadRecord }>(`/load-jobs/${tripId}/reconcile`, { method: "POST", headers: { "If-Match": String(version) }, body: JSON.stringify({ expectedVersion: version }) }),
  confirm: (tripId: string, version: number) => apiRequest<LoadRecord>(`/load-jobs/${tripId}/confirm`, { method: "POST", headers: { "If-Match": String(version) }, body: JSON.stringify({ expectedVersion: version }) }),
}

export type { LoadRecord }
