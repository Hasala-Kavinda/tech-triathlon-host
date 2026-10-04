import { describe, expect, it } from "vitest"
import { type CsvRow, validateReferenceData } from "./preflight.js"

const outlet: CsvRow = { outlet_id: "OUT001", outlet_name: "Outlet", brand: "Fresh", district: "Colombo", depot: "DEPOT", window_open_time: "05:00", window_close_time: "08:00" }
const vehicle: CsvRow = { vehicle_id: "VEH001", type: "truck", temp: "reefer", weight_cap_kg: "100", volume_cap_m3: "10", fuel_type: "diesel", km_per_l: "5", weekly_fuel_quota_l: "100", depot: "DEPOT" }
const product: CsvRow = { sku: "DEMO-1", name: "Milk", brand: "Fresh", order_types: "chilled", unit: "crate", weight_kg: "10", volume_m3: "0.1", temperature_class: "chilled" }
const day = (date: string): CsvRow => ({ date, dow_name: "Thu", is_weekend: "0", iso_year: "2026", iso_week: "40", is_payday: "0", is_holiday: "0", monsoon: "0", is_operating: "1" })

describe("reference data preflight", () => {
  it("classifies a valid explicit demo product fixture", () => {
    expect(validateReferenceData({ outlets: [outlet], vehicles: [vehicle], calendar: [day("2026-10-01"), day("2026-10-02")], products: [product], productFile: "C:/repo/CSC/products.demo.csv" })).toMatchObject({
      source: "approved_demo_fixture",
      products: 1,
      calendarStart: "2026-10-01",
      calendarEnd: "2026-10-02",
    })
  })

  it("accepts the official outlets.csv shape (no outlet_name, extra mall_window column)", () => {
    const { outlet_name: _omitted, ...official } = outlet
    expect(validateReferenceData({ outlets: [{ ...official, mall_window: "" }], vehicles: [vehicle], calendar: [day("2026-10-01")], products: [product], productFile: "products.demo.csv" })).toMatchObject({ outlets: 1 })
  })

  it("rejects duplicates, broken dates and unsupported values together", () => {
    const badProduct = { ...product, brand: "Unknown", order_types: "mystery" }
    expect(() => validateReferenceData({
      outlets: [outlet, outlet],
      vehicles: [vehicle],
      calendar: [day("2026-10-01"), day("2026-10-03")],
      products: [badProduct],
      productFile: "products.demo.csv",
    })).toThrow(/duplicate outlet_id[\s\S]*date continuity breaks[\s\S]*brand 'Unknown'/)
  })
})
