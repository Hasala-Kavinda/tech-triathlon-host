import { OrderType, CatalogProduct, type OrderDrafts } from "../types/store"
import { productCatalog } from "../lib/constants";

export function formatOutlet(business: "fresh" | "style" | "tech" = "fresh") {
    if (business === "style") return "Waypoint Style · Kandy City"
    if (business === "tech") return "Waypoint Tech · Kandy City"
    return "Waypoint Fresh · Kandy City"
}

export function formatOrderType(business: "fresh" | "style" | "tech" = "fresh", type: OrderType = "dry") {
    if (business === "style") return "Style stock"
    if (business === "tech") return "Tech stock"
    if (type === "dry") return "Dry groceries"
    return "Chilled / Frozen"
}

export function pluralizeUnit(unit: string, quantity: number) {
    if (quantity === 1 || unit === "kg") return unit
    return unit + "s"
}

export function getDefaultOrderType(business: "fresh" | "style" | "tech"): OrderType {
    if (business === "fresh") return "dry"
    return "products"
}

export function getCatalog(business: "fresh" | "style" | "tech", type: OrderType): CatalogProduct[] {
    const catalog = productCatalog[business] as Record<string, CatalogProduct[]>;
    return catalog[type] || []
}

export function getDraft(drafts: OrderDrafts, type: OrderType): Record<string, number> {
    const safeDrafts = drafts as Record<string, Record<string, number>>;
    return safeDrafts[type] || {}
}

export function selectedProducts(business: "fresh" | "style" | "tech", type: OrderType, quantities: Record<string, number> | undefined): Array<CatalogProduct & { quantity: number }> {
    return getCatalog(business, type)
    .map((product) => ({ ...product, quantity: (quantities && quantities[product.id]) ?? 0 }))
    .filter((product) => product.quantity > 0)
}

export function getUpcomingDeliveries(business: "fresh" | "style" | "tech") {
    return [
    {
      id: "ORD-1065",
      type: formatOrderType(business, business === "fresh" ? "chilled" : getDefaultOrderType(business)),
      date: "Friday, 2 October",
      status: "deferred" as const,
      reason: business === "fresh" ? "Refrigerated capacity" : "Vehicle capacity constraints",
      eta: "New window • 06:50-07:10",
    },
    {
      id: "ORD-1071",
      type: formatOrderType(business, getDefaultOrderType(business)),
      date: "Monday, 5 October",
      status: "confirmed" as const,
      eta: "Not scheduled yet",
    },
    ]
}
