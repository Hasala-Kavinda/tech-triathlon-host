import { apiRequest } from "./client"
import { deleteLocations, listLocations, saveBootstrap } from "../offline/db"
import type { StopOutcome } from "../shared/types"

export type ApiDelivery = {
  _id: string
  tripId: string
  tripStopId: string
  outletId: string
  status: "pending" | "arrived" | "delivered" | "failed" | "receipt_confirmed" | "receipt_issue"
  outcome?: StopOutcome
  version: number
  arrivedAt?: string
  completedAt?: string
  timingResult?: "on_time" | "late"
  proof?: { status: string }
  items: Array<{ sku: string; orderIds: string[]; expected: number; delivered: number; short: number; damaged: number }>
}

export type ApiOrder = { _id: string; orderNumber?: string; outletId: string; status?: string; items: Array<{ sku: string; name: string; unit: string; quantity: number }> }

export type ApiTrip = {
  _id: string
  tripNumber: string
  version: number
  vehicleId: string
  distanceKm: number
  status: string
  serviceDate?: string
  startedAt?: string
  completedAt?: string
  vehicleConfirmedAt?: string
  stops: Array<{ stopId: string; tripStopId: string; outletId: string; sequence: number; status: string; orderId?: string; orderIds?: string[]; plannedArrivalAt?: string }>
}

/** A trip with the orders and delivery records the Driver needs to work it. */
export type ApiTripDetail = ApiTrip & { orders: ApiOrder[]; deliveries?: ApiDelivery[] }

export type Bootstrap = {
  assignment: Record<string, unknown> & { _id: string; version: number; vehicleId: string }
  manifest: { trip: ApiTrip; orders: ApiOrder[]; deliveries?: ApiDelivery[] }
  bootstrapVersion: number
  serverNow: string
}

export type StopItemInput = { sku: string; delivered: number; short: number; damaged: number }

/** The store's PIN proves a delivery. A refused or closed stop may have nobody to give one. */
export const outcomeNeedsPin = (outcome: StopOutcome) => outcome === "delivered" || outcome === "partial"

const stopPath = (tripId: string, stopId: string) => `/trips/${tripId}/stops/${encodeURIComponent(stopId)}`
const ifMatch = (version: number) => ({ "If-Match": String(version) })

export type HistoryPage<T> = T[]

export const driverApi = {
  routesToday: () => apiRequest<ApiTrip[]>("/driver/routes/today"),
  tripDetail: (id: string) => apiRequest<ApiTripDetail>(`/trips/${id}`),
  async claimAndBootstrap(tripId: string, vehicleId: string, version: number) {
    const claimed = await apiRequest<Bootstrap>(`/driver/assignments/${tripId}/claim`, { method: "POST", headers: ifMatch(version), body: JSON.stringify({ expectedVersion: version }) })
    const claimVersion = Number(claimed.assignment.version)
    const confirmed = await apiRequest<Bootstrap>(`/driver/assignments/${tripId}/confirm-vehicle`, { method: "POST", headers: ifMatch(claimVersion), body: JSON.stringify({ vehicleId, expectedVersion: claimVersion }) })
    await saveBootstrap(confirmed)
    return confirmed
  },
  async flushLocations(tripId: string) {
    const queued = await listLocations(tripId)
    if (!queued.length) return { acceptedCount: 0 }
    const batch = queued.slice(0, 500)
    const result = await apiRequest<{ acceptedCount: number }>(`/trips/${tripId}/location-batch`, { method: "POST", body: JSON.stringify({ points: batch.map(({ key: _key, tripId: _tripId, ...point }) => point) }) })
    await deleteLocations(batch.map((point) => point.key))
    return result
  },
  startTrip: (tripId: string, version: number, fileAssetId: string, capturedAt: string) => apiRequest<ApiTrip>(`/trips/${tripId}/start`, { method: "POST", headers: ifMatch(version), body: JSON.stringify({ fileAssetId, capturedAt, expectedVersion: version }) }),
  finishTrip: (tripId: string, version: number, fileAssetId: string, capturedAt: string) => apiRequest<ApiTrip>(`/trips/${tripId}/finish`, { method: "POST", headers: ifMatch(version), body: JSON.stringify({ endFileAssetId: fileAssetId, capturedAt, expectedVersion: version }) }),

  // ── One stop: arrive → account for the items → PIN → complete with an outcome
  arriveStop: (tripId: string, stopId: string, arrivedAt: Date = new Date()) => apiRequest<{ delivery: ApiDelivery; tripVersion: number }>(`${stopPath(tripId, stopId)}/arrive`, { method: "POST", body: JSON.stringify({ arrivedAt: arrivedAt.toISOString() }) }),
  saveItems: (tripId: string, stopId: string, version: number, items: StopItemInput[]) => apiRequest<ApiDelivery>(`${stopPath(tripId, stopId)}/items`, { method: "PATCH", headers: ifMatch(version), body: JSON.stringify({ items, expectedVersion: version }) }),
  verifyPin: (tripId: string, stopId: string, pin: string) => apiRequest<{ verified: true; version: number }>(`${stopPath(tripId, stopId)}/verify-pin`, { method: "POST", body: JSON.stringify({ pin, clientRecordedAt: new Date().toISOString() }) }),
  completeStop: (tripId: string, stopId: string, outcome: StopOutcome, version: number) => apiRequest<ApiDelivery>(`${stopPath(tripId, stopId)}/complete`, { method: "POST", headers: ifMatch(version), body: JSON.stringify({ outcome, completedAt: new Date().toISOString(), expectedVersion: version }) }),
  /**
   * Finishes a stop online. Delivered and partial stops need the store's PIN; refused and closed
   * stops end without one. `items` is sent when the item counts have not been saved yet.
   */
  async finishStop(tripId: string, stopId: string, input: { outcome: StopOutcome; deliveryVersion: number; pin?: string; items?: StopItemInput[] }) {
    let version = input.deliveryVersion
    if (input.items) version = (await this.saveItems(tripId, stopId, version, input.items)).version
    if (outcomeNeedsPin(input.outcome)) {
      if (!input.pin) throw new Error("The store's PIN is required for this outcome.")
      version = (await this.verifyPin(tripId, stopId, input.pin)).version
    }
    return this.completeStop(tripId, stopId, input.outcome, version)
  },

  orderHistory: (page = 1) => apiRequest<Array<ApiOrder & { requestedDate?: string; createdAt?: string }>>(`/driver/order-history?page=${page}&pageSize=50`),
  deliveryHistory: (page = 1) => apiRequest<ApiDelivery[]>(`/driver/delivery-history?page=${page}&pageSize=50`),

  async uploadEvidence(tripId: string, kind: "start_meter" | "end_meter", file: File) {
    const signature = await apiRequest<{ cloudName: string; apiKey: string; timestamp: number; folder: string; uploadType: string; signature: string }>("/files/upload-signature", { method: "POST", body: JSON.stringify({ kind, tripId, mimeType: file.type, bytes: file.size }) })
    const form = new FormData()
    form.set("file", file)
    form.set("api_key", signature.apiKey)
    form.set("timestamp", String(signature.timestamp))
    form.set("folder", signature.folder)
    form.set("type", signature.uploadType)
    form.set("signature", signature.signature)
    const upload = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(signature.cloudName)}/image/upload`, { method: "POST", body: form })
    const metadata = await upload.json()
    if (!upload.ok) throw new Error(metadata.error?.message ?? "Evidence upload failed.")
    const asset = await apiRequest<{ _id: string }>("/files/complete", { method: "POST", body: JSON.stringify({ publicId: metadata.public_id, providerVersion: metadata.version, providerSignature: metadata.signature, kind, tripId, mimeType: file.type, format: metadata.format, bytes: metadata.bytes, capturedAt: new Date().toISOString() }) })
    return asset._id
  },
  /** Notices a dispatcher sent to this driver when reviewing a remark. */
  notices: () => apiRequest<Array<{ id: string; tripId: string | null; remarkText: string; text: string; sentAt: string }>>("/notices"),
  /** Raises a remark for the dispatcher to review (whole trip, or one stop when an outlet id is given). */
  raiseRemark: (tripId: string, text: string, outletId?: string) => apiRequest<{ _id: string }>("/remarks", { method: "POST", body: JSON.stringify({ entityType: "trip", id: tripId, ...(outletId ? { stopId: outletId } : {}), text, audienceRoles: ["dispatcher"] }) }),
}
