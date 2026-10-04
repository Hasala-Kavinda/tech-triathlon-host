import { apiRequest } from "./client"

export type ApiProduct = { _id: string; sku: string; name: string; brand: string; orderTypes: string[]; unit: string }
export type CreatedOrder = { _id: string; orderNumber: string; status: string; requestedDate: string; cutoffBucket: "before_cutoff" | "after_cutoff"; version: number }
export type StoreDeliveryStatus = "pending" | "arrived" | "delivered" | "failed" | "receipt_confirmed" | "receipt_issue"
export type StoreDelivery = { _id: string; orderId: string; status: StoreDeliveryStatus; outcome?: string; version: number; arrivedAt?: string; completedAt?: string; receipt?: unknown; items: Array<{ sku: string; expected: number; delivered: number; short: number; damaged: number }> }

const brandName = { fresh: "Fresh", style: "Style", tech: "Tech" } as const
const orderTypeName = (business: keyof typeof brandName, type: string) => business === "fresh" ? type : "stock"

export function getCatalogue(business: keyof typeof brandName, type: string) {
  const query = new URLSearchParams({ brand: brandName[business], orderType: orderTypeName(business, type), pageSize: "100" })
  return apiRequest<ApiProduct[]>(`/catalog/products?${query}`)
}

export function submitStoreOrder(input: { business: keyof typeof brandName; type: string; requestedDate?: string; items: Array<{ id: string; quantity: number }> }) {
  // No date is sent: the server decides the delivery day and the cutoff bucket from its own clock.
  return apiRequest<CreatedOrder>("/orders", {
    method: "POST",
    headers: { "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({ orderType: orderTypeName(input.business, input.type), requestedDate: input.requestedDate, items: input.items.map((item) => ({ productId: item.id, quantity: item.quantity })) }),
  })
}

export type StoreOrder = { _id: string; orderNumber: string; brand: string; orderType: string; requestedDate: string; status: "submitted" | "deferred" | "allocated" | "loading" | "load_confirmed" | "in_transit" | "delivered" | "delivery_failed" | "cancelled"; cutoffBucket: string; totalWeightKg: number; totalVolumeM3: number; createdAt: string; items: Array<{ sku: string; name: string; quantity: number; unit: string }>; /** Read-only summary of the order's delivery record (where "arrived" lives). */ delivery?: { _id: string; status: StoreDeliveryStatus; arrivedAt: string | null } | null }

export type CalendarDay = { date: string; isOperating: boolean; dayOfWeek: number; isHoliday: boolean; festival?: string }
export type CalendarDayWithCutoff = CalendarDay & { cutoffDeadlineAt: string; isPastCutoff: boolean; bucket: string; /** Server DEV_MODE: any upcoming day is accepted for an order. */ devMode?: boolean }

export const calendarApi = {
  getRange: (from: string, to: string) => apiRequest<CalendarDay[]>(`/calendar?from=${from}&to=${to}`),
  getDay: (date: string) => apiRequest<CalendarDayWithCutoff>(`/calendar/${date}`),
}

export function getOrderHistory(page = 1, pageSize = 50) {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  return apiRequest<StoreOrder[]>(`/store/order-history?${query}`)
}

export type OrderUiState = "confirmed" | "deferred" | "scheduled" | "on-way" | "arrived" | "awaiting-confirmation" | "receipt-confirmed" | "receipt-issue"
export type LifecycleStep = { key: string; label: string; state: "complete" | "current" | "future"; reachedAt: string | null }
/** The order joined with its trip and delivery record, placed on the timeline by the server. */
export type OrderLifecycleData = {
  order: { _id: string; orderNumber: string; status: string; brand: string; orderType: string; requestedDate: string; cutoffBucket: string; createdAt: string; deferredTo: string | null; deferralReason: string | null; items: Array<{ sku: string; name: string; quantity: number; unit: string }> }
  trip: { tripNumber: string; status: string; vehicleId: string; serviceDate: string; departureAt: string; startedAt: string | null } | null
  delivery: { _id: string; status: StoreDeliveryStatus; arrivedAt: string | null; completedAt: string | null; outcome: string | null; receipt: { result?: string; remark?: string; confirmedAt?: string } | null; version: number; proofStatus: string; items: Array<{ sku: string; expected: number; delivered: number | null }> } | null
  lifecycle: { uiState: OrderUiState; wasDeferred: boolean; steps: LifecycleStep[]; expectedArrivalAt: string | null; targetPlanningRun: string; awaitingReceipt: boolean }
}
export function getOrderLifecycle(orderId: string) {
  return apiRequest<OrderLifecycleData>(`/store/orders/${orderId}/lifecycle`)
}

export function getOrder(orderId: string) {
  return apiRequest<StoreOrder>(`/orders/${orderId}`)
}

export type DashboardPayload = {
  recentOrders: Array<{ _id: string; orderNumber: string; status: string; orderType: string; createdAt: string; requestedDate: string }>
  upcomingDeliveries: Array<{
    _id: string
    status: string
    createdAt: string
    arrivedAt?: string
    items: Array<{ sku: string; expected: number }>
    trip: { tripNumber: string; vehicleId: string; serviceDate: string; departureAt: string; plannedArrivalAt?: string } | null
    orders: Array<{ _id: string; orderNumber: string; orderType: string; brand: string }>
  }>
  attentionCount: number
}

export function getDashboard() {
  return apiRequest<DashboardPayload>("/store/dashboard")
}

export const storeDeliveryApi = {
  list: () => apiRequest<StoreDelivery[]>("/store/deliveries"),
  get: (deliveryId: string) => apiRequest<{ delivery: Omit<StoreDelivery, "items"> & { items: Array<{ sku: string; orderIds: string[]; expected: number; delivered: number }> }; trip: { tripNumber: string; vehicleId: string } | null }>(`/store/deliveries/${deliveryId}`),
  /** Full receipt or an issue report; `itemOutcomes` carry what actually arrived per SKU. */
  submitReceipt: (delivery: { _id: string; version: number }, body: { result: "full" | "issue"; itemOutcomes: Array<{ sku: string; received: number; issueType?: string }>; remark?: string }) => apiRequest<StoreDelivery>(`/store/deliveries/${delivery._id}/receipt`, {
    method: "POST",
    headers: { "If-Match": String(delivery.version) },
    body: JSON.stringify({ ...body, expectedVersion: delivery.version, evidenceFileIds: [] }),
  }),
  issuePin: (deliveryId: string) => apiRequest<{ pin: string; expiresAt: string }>(`/store/deliveries/${deliveryId}/pin`, { method: "POST" }),
  confirmFullReceipt: (delivery: StoreDelivery) => apiRequest<StoreDelivery>(`/store/deliveries/${delivery._id}/receipt`, {
    method: "POST",
    headers: { "If-Match": String(delivery.version) },
    body: JSON.stringify({ result: "full", expectedVersion: delivery.version, itemOutcomes: delivery.items.map((item) => ({ sku: item.sku, received: item.delivered })), evidenceFileIds: [] }),
  }),
}
