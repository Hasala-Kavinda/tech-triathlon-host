/**
 * Non-authoritative demo fixtures. These are loaded only when
 * ALLOW_DEMO_PRODUCTS=true and are labelled accordingly in MongoDB.
 */
export const DEMO_PRODUCTS = [
  { sku: "DEMO-FR-001", name: "Demo Fresh Milk Crate", brand: "Fresh", orderTypes: ["chilled"], unit: "crate", weightKg: 12, volumeM3: 0.03, temperatureClass: "chilled", fragile: false },
  { sku: "DEMO-FR-002", name: "Demo Produce Carton", brand: "Fresh", orderTypes: ["dry"], unit: "carton", weightKg: 8, volumeM3: 0.045, temperatureClass: "ambient", fragile: true },
  { sku: "DEMO-ST-001", name: "Demo Apparel Case", brand: "Style", orderTypes: ["stock"], unit: "case", weightKg: 10, volumeM3: 0.08, temperatureClass: "ambient", fragile: false },
  { sku: "DEMO-TE-001", name: "Demo Electronics Case", brand: "Tech", orderTypes: ["stock"], unit: "case", weightKg: 15, volumeM3: 0.06, temperatureClass: "ambient", fragile: true },
]
