export type CsvRow = Record<string, string>

export type ReferenceData = {
  outlets: CsvRow[]
  vehicles: CsvRow[]
  calendar: CsvRow[]
  products: CsvRow[]
  productFile: string
}

export type ReferenceDataSummary = {
  source: "approved_demo_fixture" | "official_csc_extract"
  outlets: number
  vehicles: number
  calendarDays: number
  products: number
  calendarStart: string
  calendarEnd: string
}

// outlet_name is optional: the official outlets.csv has none, so the seed falls back to the outlet id.
const OUTLET_COLUMNS = ["outlet_id", "brand", "district", "depot", "window_open_time", "window_close_time"]
const VEHICLE_COLUMNS = ["vehicle_id", "type", "temp", "weight_cap_kg", "volume_cap_m3", "fuel_type", "km_per_l", "weekly_fuel_quota_l", "depot"]
const CALENDAR_COLUMNS = ["date", "dow_name", "is_weekend", "iso_year", "iso_week", "is_payday", "is_holiday", "monsoon", "is_operating"]
const PRODUCT_COLUMNS = ["sku", "name", "brand", "order_types", "unit", "weight_kg", "volume_m3", "temperature_class"]

const BRANDS = new Set(["Fresh", "Style", "Tech"])
const ORDER_TYPES = new Set(["dry", "chilled", "products"])
const PRODUCT_TEMPERATURES = new Set(["ambient", "chilled", "frozen"])
const VEHICLE_TEMPERATURES = new Set(["ambient", "reefer"])

function requireColumns(name: string, rows: CsvRow[], columns: string[], errors: string[]) {
  if (rows.length === 0) {
    errors.push(`${name}: file has no data rows`)
    return
  }
  const first = rows[0]!
  const missing = columns.filter((column) => !(column in first))
  if (missing.length) errors.push(`${name}: missing required columns: ${missing.join(", ")}`)
}

function requireValues(name: string, rows: CsvRow[], columns: string[], errors: string[]) {
  rows.forEach((row, index) => {
    for (const column of columns) {
      if (!row[column]?.trim()) errors.push(`${name}: row ${index + 2} is missing ${column}`)
    }
  })
}

function requireUnique(name: string, rows: CsvRow[], column: string, errors: string[]) {
  const seen = new Set<string>()
  rows.forEach((row, index) => {
    const value = row[column]?.trim().toUpperCase()
    if (!value) return
    if (seen.has(value)) errors.push(`${name}: duplicate ${column} '${value}' at row ${index + 2}`)
    seen.add(value)
  })
}

function requireNumber(name: string, rows: CsvRow[], column: string, minimum: number, errors: string[]) {
  rows.forEach((row, index) => {
    const value = Number(row[column])
    if (!Number.isFinite(value) || value < minimum) {
      errors.push(`${name}: row ${index + 2} has invalid ${column} '${row[column] ?? ""}' (minimum ${minimum})`)
    }
  })
}

function requireEnum(name: string, rows: CsvRow[], column: string, allowed: Set<string>, errors: string[]) {
  rows.forEach((row, index) => {
    const value = row[column]?.trim()
    if (value && !allowed.has(value)) errors.push(`${name}: row ${index + 2} has unsupported ${column} '${value}'`)
  })
}

function validateCalendar(rows: CsvRow[], errors: string[]) {
  const dates = rows.map((row, index) => {
    const value = row.date
    const timestamp = /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") ? Date.parse(`${value}T00:00:00Z`) : Number.NaN
    if (!Number.isFinite(timestamp)) errors.push(`calendar: row ${index + 2} has invalid date '${value ?? ""}'`)
    return { value, timestamp }
  }).filter((entry) => Number.isFinite(entry.timestamp)).sort((a, b) => a.timestamp - b.timestamp)

  for (let index = 1; index < dates.length; index += 1) {
    const previous = dates[index - 1]!
    const current = dates[index]!
    if (current.timestamp - previous.timestamp !== 86_400_000) {
      errors.push(`calendar: date continuity breaks between ${previous.value} and ${current.value}`)
    }
  }
}

export function validateReferenceData(data: ReferenceData): ReferenceDataSummary {
  const errors: string[] = []
  requireColumns("outlets", data.outlets, OUTLET_COLUMNS, errors)
  requireColumns("vehicles", data.vehicles, VEHICLE_COLUMNS, errors)
  requireColumns("calendar", data.calendar, CALENDAR_COLUMNS, errors)
  requireColumns("products", data.products, PRODUCT_COLUMNS, errors)

  requireValues("outlets", data.outlets, OUTLET_COLUMNS, errors)
  requireValues("vehicles", data.vehicles, VEHICLE_COLUMNS, errors)
  requireValues("calendar", data.calendar, CALENDAR_COLUMNS, errors)
  requireValues("products", data.products, PRODUCT_COLUMNS, errors)

  requireUnique("outlets", data.outlets, "outlet_id", errors)
  requireUnique("vehicles", data.vehicles, "vehicle_id", errors)
  requireUnique("calendar", data.calendar, "date", errors)
  requireUnique("products", data.products, "sku", errors)

  requireEnum("outlets", data.outlets, "brand", BRANDS, errors)
  requireEnum("vehicles", data.vehicles, "temp", VEHICLE_TEMPERATURES, errors)
  requireEnum("products", data.products, "brand", BRANDS, errors)
  requireEnum("products", data.products, "temperature_class", PRODUCT_TEMPERATURES, errors)

  data.products.forEach((row, index) => {
    for (const orderType of (row.order_types ?? "").split("|").map((value) => value.trim()).filter(Boolean)) {
      if (!ORDER_TYPES.has(orderType)) errors.push(`products: row ${index + 2} has unsupported order type '${orderType}'`)
    }
  })

  requireNumber("vehicles", data.vehicles, "weight_cap_kg", 0.01, errors)
  requireNumber("vehicles", data.vehicles, "volume_cap_m3", 0.000_001, errors)
  requireNumber("vehicles", data.vehicles, "km_per_l", 0.01, errors)
  requireNumber("vehicles", data.vehicles, "weekly_fuel_quota_l", 0, errors)
  requireNumber("products", data.products, "weight_kg", 0, errors)
  requireNumber("products", data.products, "volume_m3", 0, errors)
  validateCalendar(data.calendar, errors)

  const vehicleDepots = new Set(data.vehicles.map((row) => row.depot))
  for (const depot of new Set(data.outlets.map((row) => row.depot))) {
    if (!vehicleDepots.has(depot)) errors.push(`outlets: depot '${depot}' has no vehicle reference`)
  }

  const outletBrands = new Set(data.outlets.map((row) => row.brand))
  for (const brand of new Set(data.products.map((row) => row.brand))) {
    if (!outletBrands.has(brand)) errors.push(`products: brand '${brand}' has no outlet reference`)
  }

  const demoName = /(?:^|[\\/])products\.demo\.csv$/i.test(data.productFile)
  const demoRows = data.products.filter((row) => row.sku?.toUpperCase().startsWith("DEMO-"))
  if (demoRows.length > 0 && demoRows.length !== data.products.length) errors.push("products: demo and official-looking SKUs must not be mixed")
  if (demoRows.length > 0 && !demoName) errors.push("products: DEMO-prefixed products must use the explicit products.demo.csv filename")
  if (demoName && demoRows.length !== data.products.length) errors.push("products: products.demo.csv may contain only DEMO-prefixed SKUs")

  if (errors.length) throw new Error(`Reference data preflight failed:\n- ${errors.join("\n- ")}`)

  const sortedDates = data.calendar.map((row) => row.date).sort()
  return {
    source: demoName ? "approved_demo_fixture" : "official_csc_extract",
    outlets: data.outlets.length,
    vehicles: data.vehicles.length,
    calendarDays: data.calendar.length,
    products: data.products.length,
    calendarStart: sortedDates[0]!,
    calendarEnd: sortedDates.at(-1)!,
  }
}
