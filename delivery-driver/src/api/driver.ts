import { apiRequest } from "./client"
import { deleteLocations, listLocations, saveBootstrap } from "../offline/db"

export type ApiTrip = { _id: string; tripNumber: string; version: number; vehicleId: string; distanceKm: number; status: string; stops: Array<{ stopId: string; outletId: string; sequence: number; status: string }> }
type Bootstrap = { assignment: Record<string, unknown> & { _id: string; version: number; vehicleId: string }; manifest: { trip: Record<string, unknown>; orders: Array<Record<string, unknown>> }; bootstrapVersion: number; serverNow: string }

export const driverApi = {
  routesToday: () => apiRequest<ApiTrip[]>("/driver/routes/today"),
  tripDetail: (id: string) => apiRequest<ApiTrip & { orders: Array<{ _id: string; outletId: string; items: Array<{ sku: string; name: string; unit: string; quantity: number }> }> }>(`/trips/${id}`),
  async claimAndBootstrap(tripId: string, vehicleId: string, version: number) {
    const claimed = await apiRequest<Bootstrap>(`/driver/assignments/${tripId}/claim`, { method: "POST", headers: { "If-Match": String(version) }, body: JSON.stringify({ expectedVersion: version }) })
    const claimVersion = Number(claimed.assignment.version)
    const confirmed = await apiRequest<Bootstrap>(`/driver/assignments/${tripId}/confirm-vehicle`, { method: "POST", headers: { "If-Match": String(claimVersion) }, body: JSON.stringify({ vehicleId, expectedVersion: claimVersion }) })
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
  startTrip: (tripId: string, version: number, fileAssetId: string, capturedAt: string) => apiRequest<ApiTrip>(`/trips/${tripId}/start`, { method: "POST", headers: { "If-Match": String(version) }, body: JSON.stringify({ fileAssetId, capturedAt, expectedVersion: version }) }),
  finishTrip: (tripId: string, version: number, fileAssetId: string, capturedAt: string) => apiRequest<ApiTrip>(`/trips/${tripId}/finish`, { method: "POST", headers: { "If-Match": String(version) }, body: JSON.stringify({ endFileAssetId: fileAssetId, capturedAt, expectedVersion: version }) }),
  arriveStop: (tripId: string, stopId: string) => apiRequest<{ delivery: { version: number }; tripVersion: number }>(`/trips/${tripId}/stops/${encodeURIComponent(stopId)}/arrive`, { method: "POST", body: JSON.stringify({ arrivedAt: new Date().toISOString() }) }),
  accountStopItems(tripId: string, stopId: string, version: number, products: Array<{ id: string; quantity: number | string }>) {
    const items = products.map((product) => ({ sku: product.id, delivered: Number(product.quantity), short: 0, damaged: 0 }))
    return apiRequest<{ version: number }>(`/trips/${tripId}/stops/${encodeURIComponent(stopId)}/items`, { method: "PATCH", headers: { "If-Match": String(version) }, body: JSON.stringify({ items, expectedVersion: version }) })
  },
  async completeStop(tripId: string, stopId: string, pin: string, products: Array<{ id: string; quantity: number | string }>, existingDeliveryVersion?: number, currentTripVersion?: number) {
    const arrived = existingDeliveryVersion === undefined ? await this.arriveStop(tripId, stopId) : { delivery: { version: existingDeliveryVersion }, tripVersion: currentTripVersion ?? 0 }
    const updated = existingDeliveryVersion === undefined ? await this.accountStopItems(tripId, stopId, arrived.delivery.version, products) : { version: existingDeliveryVersion }
    const verified = await apiRequest<{ verified: true; version: number }>(`/trips/${tripId}/stops/${encodeURIComponent(stopId)}/verify-pin`, { method: "POST", body: JSON.stringify({ pin, clientRecordedAt: new Date().toISOString() }) })
    await apiRequest(`/trips/${tripId}/stops/${encodeURIComponent(stopId)}/complete`, { method: "POST", headers: { "If-Match": String(verified.version) }, body: JSON.stringify({ outcome: "delivered", completedAt: new Date().toISOString(), expectedVersion: verified.version }) })
    return { tripVersion: arrived.tripVersion, deliveryVersion: updated.version }
  },
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
}
