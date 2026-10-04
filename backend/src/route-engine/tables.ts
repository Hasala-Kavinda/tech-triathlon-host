import type { AllowanceTable, Brand, DockType, TravelRow, TravelTable } from "./types.js"

export class EngineDataError extends Error {}

export function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((line) => line.trim().length > 0)
  const header = (lines[0] ?? "").split(",").map((h) => h.trim())
  return lines.slice(1).map((line) => {
    const cells = line.split(",")
    return Object.fromEntries(header.map((h, i) => [h, (cells[i] ?? "").trim()]))
  })
}

function need(rows: Array<Record<string, string>>, file: string, columns: string[]) {
  const have = Object.keys(rows[0] ?? {})
  const missing = columns.filter((c) => !have.includes(c))
  if (!rows.length || missing.length) throw new EngineDataError(`${file}: expected columns ${columns.join(", ")}; found ${have.join(", ") || "no rows"}`)
}

const num = (value: string | undefined, what: string) => {
  const n = Number(value)
  if (value === undefined || value === "" || Number.isNaN(n)) throw new EngineDataError(`Invalid number for ${what}: "${value}"`)
  return n
}

export function buildTravelTable(rows: Array<Record<string, string>>): TravelTable {
  need(rows, "district_travel.csv", ["district", "depot", "depot_to_district_km", "depot_to_district_freeflow_min", "inter_stop_km", "inter_stop_freeflow_min"])
  const map = new Map<string, TravelRow>()
  for (const r of rows) {
    const row: TravelRow = {
      district: r.district!, depot: r.depot!,
      depotToDistrictKm: num(r.depot_to_district_km, "depot_to_district_km"),
      depotToDistrictMin: num(r.depot_to_district_freeflow_min, "depot_to_district_freeflow_min"),
      interStopKm: num(r.inter_stop_km, "inter_stop_km"),
      interStopMin: num(r.inter_stop_freeflow_min, "inter_stop_freeflow_min"),
    }
    map.set(`${row.depot}|${row.district}`, row)
  }
  return { find: (depot, district) => map.get(`${depot}|${district}`) }
}

export function buildAllowanceTable(rows: Array<Record<string, string>>): AllowanceTable {
  need(rows, "service_allowance.csv", ["brand", "dock_type", "service_allowance_min"])
  const map = new Map<string, number>()
  for (const r of rows) map.set(`${r.brand as Brand}|${r.dock_type as DockType}`, num(r.service_allowance_min, "service_allowance_min"))
  return { find: (brand, dockType) => map.get(`${brand}|${dockType}`) }
}
