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

export function submitStoreOrder(input: { business: keyof typeof brandName; type: string; items: Array<{ id: string; quantity: number }> }) {
  // No date is sent: the server decides the delivery day and the cutoff bucket from its own clock.
  return apiRequest<CreatedOrder>("/orders", {
    method: "POST",
    headers: { "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({ orderType: orderTypeName(input.business, input.type), items: input.items.map((item) => ({ productId: item.id, quantity: item.quantity })) }),
  })
}

export type StoreOrder = { _id: string; orderNumber: string; brand: string; orderType: string; requestedDate: string; status: "submitted" | "deferred" | "allocated" | "loading" | "load_confirmed" | "in_transit" | "delivered" | "delivery_failed" | "cancelled"; cutoffBucket: string; totalWeightKg: number; totalVolumeM3: number; createdAt: string; items: Array<{ sku: string; name: string; quantity: number; unit: string }> }

export function getOrderHistory(page = 1, pageSize = 50) {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  return apiRequest<StoreOrder[]>(`/store/order-history?${query}`)
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
  issuePin: (deliveryId: string) => apiRequest<{ pin: string; expiresAt: string }>(`/store/deliveries/${deliveryId}/pin`, { method: "POST" }),
  confirmFullReceipt: (delivery: StoreDelivery) => apiRequest<StoreDelivery>(`/store/deliveries/${delivery._id}/receipt`, {
    method: "POST",
    headers: { "If-Match": String(delivery.version) },
    body: JSON.stringify({ result: "full", expectedVersion: delivery.version, itemOutcomes: delivery.items.map((item) => ({ sku: item.sku, received: item.delivered })), evidenceFileIds: [] }),
  }),
}
