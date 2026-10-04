import { apiRequest } from "./client"

export type Contact = { id: string; employeeId: string; name: string; role: string; outletId?: string; phoneE164: string | null }
export type TrackingState = "live" | "delayed" | "gps_gap" | "offline_unknown" | "completed"
export type StopState = "planned" | "arrived" | "delivered" | "failed"

export type MonitorStop = {
  tripStopId: string
  sequence: number
  outletId: string
  outletName: string
  district: string | null
  plannedArrivalAt: string | null
  state: StopState
  deliveryId: string | null
  arrivedAt: string | null
  completedAt: string | null
  outcome: string | null
  timingResult: "on_time" | "late" | null
  receiptStatus: string | null
  manager: Contact | null
}

export type FlaggedItem = { itemId: string; sku: string; name: string; expectedQuantity: number; loadedQuantity: number; type: "missing" | "damaged"; quantity: number; reasonCode: string; note: string | null }

export type MonitorRemark = {
  id: string
  text: string
  status: "pending" | "reviewed"
  actorRole: string
  author: { id: string; name: string; role: string; phoneE164: string | null } | null
  createdAt: string
  stop: { tripStopId: string; sequence: number; outletName: string; outletId: string } | null
  reviewedAt: string | null
  reviewResponse: string | null
  notice: { text: string; sentAt: string; recipientIds: string[] } | null
  loadException: { vehicleId: string; depot: string; loaded: number; flagged: number; total: number; confirmedAt: string | null; items: FlaggedItem[] } | null
}

export type TripMonitor = {
  trip: { id: string; tripNumber: string; serviceDate: string; vehicleId: string; depot: string; status: string; departureAt: string; startedAt: string | null; completedAt: string | null; plannedEndAt: string | null; acceptedAt: string | null }
  stops: MonitorStop[]
  progress: { done: number; total: number; nextTripStopId: string | null }
  crew: { driver: Contact | null; loaders: Contact[] }
  tracking: { state: TrackingState; lastSeenSecondsAgo: number | null; recordedAt: string | null; latitude: number | null; longitude: number | null; speedKmh: number | null; nearLabel: string | null }
  load: { status: string; vehicleId: string; depot: string; claimedAt: string | null; confirmedAt: string | null; totalItems: number; loadedItems: number; flaggedItems: number } | null
  remarks: MonitorRemark[]
  pendingRemarks: number
  recipients: Contact[]
}

export const monitorApi = {
  trip: (tripId: string) => apiRequest<TripMonitor>(`/trips/${tripId}/monitor`),
  review: (remarkId: string, input: { response: string; notice?: { text: string; recipientIds: string[] } }) =>
    apiRequest<unknown>(`/remarks/${remarkId}/review`, { method: "PATCH", body: JSON.stringify({ response: input.response, notifyRoles: [], ...(input.notice ? { notice: input.notice } : {}) }) }),
  accept: (tripId: string) => apiRequest<{ tripId: string; acceptedAt: string }>(`/trips/${tripId}/accept`, { method: "POST" }),
}
