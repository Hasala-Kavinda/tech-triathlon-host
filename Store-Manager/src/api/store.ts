import { apiRequest } from "./client"

export type ApiProduct = { _id: string; sku: string; name: string; brand: string; orderTypes: string[]; unit: string }
export type CreatedOrder = { _id: string; orderNumber: string; status: string; cutoffBucket: "before_cutoff" | "after_cutoff"; version: number }
export type StoreDelivery = { _id: string; orderId: string; status: string; outcome?: string; version: number; arrivedAt?: string; completedAt?: string; receipt?: unknown; items: Array<{ sku: string; expected: number; delivered: number; short: number; damaged: number }> }

const brandName = { fresh: "Fresh", style: "Style", tech: "Tech" } as const
const orderTypeName = (business: keyof typeof brandName, type: string) => business === "fresh" ? type : "stock"

export function getCatalogue(business: keyof typeof brandName, type: string) {
  const query = new URLSearchParams({ brand: brandName[business], orderType: orderTypeName(business, type), pageSize: "100" })
  return apiRequest<ApiProduct[]>(`/catalog/products?${query}`)
}

export function submitStoreOrder(input: { business: keyof typeof brandName; type: string; items: Array<{ id: string; quantity: number }> }) {
  const serviceDate = import.meta.env.VITE_SERVICE_DATE ?? new Date().toISOString().slice(0, 10)
  return apiRequest<CreatedOrder>("/orders", {
    method: "POST",
    headers: { "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({ orderType: orderTypeName(input.business, input.type), requestedDate: serviceDate, items: input.items.map((item) => ({ productId: item.id, quantity: item.quantity })) }),
  })
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
