import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import argon2 from "argon2"
import { parse } from "csv-parse/sync"
import { loadConfig } from "../../config/env.js"
import { connectDatabase, disconnectDatabase } from "../../db/connection.js"
import { DeliveryRecord, FileAsset, IdempotencyRecord, LoadRecord, OperationalEvent, SyncReceipt, Trip, TripLocation, User } from "../models/index.js"
import { AuthHandoff } from "../../modules/auth/persistence/auth-handoff.model.js"
import { Outlet } from "../../modules/reference/persistence/outlet.model.js"
import { Product } from "../../modules/reference/persistence/product.model.js"
import { Vehicle } from "../../modules/reference/persistence/vehicle.model.js"
import { CalendarDay } from "../../modules/reference/persistence/calendar-day.model.js"
import { Order } from "../../modules/orders/persistence/order.model.js"
import { DEMO_PRODUCTS } from "./demo-products.js"
import { validateReferenceData } from "./preflight.js"

type CsvRow = Record<string, string>

const config = loadConfig()

async function csv(file: string) {
  const content = await readFile(file, "utf8")
  return parse(content, { columns: true, skip_empty_lines: true, trim: true }) as CsvRow[]
}

function bool(value: string) {
  return value === "1" || value.toLowerCase() === "true"
}

function required(row: CsvRow, key: string) {
  const value = row[key]
  if (!value) throw new Error(`Reference import row is missing required field: ${key}`)
  return value
}

async function upsertReference() {
  const dir = resolve(process.cwd(), config.referenceDataDir)
  const [outlets, vehicles, calendar] = await Promise.all([
    csv(resolve(dir, "outlets.csv")),
    csv(resolve(dir, "vehicles.csv")),
    csv(resolve(dir, "calendar.csv")),
  ])
  const productFile = config.cscProductsFile ? resolve(process.cwd(), config.cscProductsFile) : undefined
  const products = productFile ? await csv(productFile) : undefined
  const productSummary = products && productFile
    ? validateReferenceData({ outlets, vehicles, calendar, products, productFile })
    : undefined

  const outletOps = outlets.map((row) => ({
    updateOne: {
      filter: { outletId: row.outlet_id },
      update: { $set: {
        outletId: required(row, "outlet_id"),
        displayName: row.outlet_name || required(row, "outlet_id"),
        brand: required(row, "brand"),
        district: required(row, "district"),
        depot: required(row, "depot"),
        dockType: row.dock_type,
        parkingConstraint: row.parking_constraint,
        windowOpenTime: required(row, "window_open_time"),
        windowCloseTime: required(row, "window_close_time"),
        source: "Drive Data/outlets.csv",
        active: true,
      } },
      upsert: true,
    },
  }))
  const vehicleOps = vehicles.map((row) => ({
    updateOne: {
      filter: { vehicleId: row.vehicle_id },
      update: { $set: {
        vehicleId: required(row, "vehicle_id"),
        type: required(row, "type"),
        temperatureClass: required(row, "temp"),
        weightCapacityKg: Number(required(row, "weight_cap_kg")),
        volumeCapacityM3: Number(required(row, "volume_cap_m3")),
        fuelType: required(row, "fuel_type"),
        kmPerL: Number(required(row, "km_per_l")),
        weeklyFuelQuotaL: Number(required(row, "weekly_fuel_quota_l")),
        depot: required(row, "depot"),
        active: true,
      } },
      upsert: true,
    },
  }))
  const calendarOps = calendar.map((row) => ({
    updateOne: {
      filter: { date: row.date },
      update: { $set: {
        date: required(row, "date"),
        dayOfWeek: required(row, "dow_name"),
        isWeekend: bool(required(row, "is_weekend")),
        isoYear: Number(required(row, "iso_year")),
        isoWeek: Number(required(row, "iso_week")),
        isPayday: bool(required(row, "is_payday")),
        festival: row.festival || undefined,
        festivalRamp: Number(row.festival_ramp || 0),
        isHoliday: bool(required(row, "is_holiday")),
        monsoon: bool(required(row, "monsoon")),
        isOperating: bool(required(row, "is_operating")),
      } },
      upsert: true,
    },
  }))

  const [outletResult, vehicleResult, calendarResult] = await Promise.all([
    Outlet.bulkWrite(outletOps),
    Vehicle.bulkWrite(vehicleOps),
    CalendarDay.bulkWrite(calendarOps),
  ])

  let productCount = 0
  if (products && productSummary) {
    await Product.bulkWrite(products.map((row) => ({
      updateOne: {
        filter: { sku: required(row, "sku").toUpperCase() },
        update: { $set: {
          sku: required(row, "sku").toUpperCase(), name: required(row, "name"), brand: required(row, "brand"),
          orderTypes: required(row, "order_types").split("|").map((value) => value.trim()), unit: required(row, "unit"),
          weightKg: Number(required(row, "weight_kg")), volumeM3: Number(required(row, "volume_m3")),
          temperatureClass: required(row, "temperature_class"), fragile: bool(row.fragile || "false"),
          source: productSummary.source === "approved_demo_fixture" ? "EXPLICIT_DEMO_FIXTURE_NOT_CSC" : `CSC:${config.cscProductsFile}`,
          assumptions: productSummary.source === "approved_demo_fixture" ? ["Planning attributes are temporary demonstration values."] : [],
          active: true,
        } }, upsert: true,
      },
    })))
    productCount = products.length
  } else if (config.allowDemoProducts) {
    await Product.bulkWrite(DEMO_PRODUCTS.map((product) => ({
      updateOne: {
        filter: { sku: product.sku },
        update: { $set: { ...product, source: "EXPLICIT_DEMO_FIXTURE_NOT_CSC", assumptions: ["Planning attributes are temporary demonstration values."], active: true } },
        upsert: true,
      },
    })))
    productCount = DEMO_PRODUCTS.length
    console.warn("WARNING: loaded explicit non-authoritative demo products because ALLOW_DEMO_PRODUCTS=true")
  } else {
    throw new Error("CSC_PRODUCTS_FILE is required. Set ALLOW_DEMO_PRODUCTS=true only for an explicitly approved demo fixture.")
  }

  console.info(JSON.stringify({
    event: "reference_seed_complete",
    outlets: { source: outlets.length, matched: outletResult.matchedCount, upserted: outletResult.upsertedCount },
    vehicles: { source: vehicles.length, matched: vehicleResult.matchedCount, upserted: vehicleResult.upsertedCount },
    calendar: { source: calendar.length, matched: calendarResult.matchedCount, upserted: calendarResult.upsertedCount },
    products: productCount,
  }))
}

async function upsertUsers() {
  const passwordHash = await Promise.all([
    argon2.hash("Dispatch@123"), argon2.hash("Loader@123"), argon2.hash("Driver@123"), argon2.hash("Store@123"),
  ])
  const users = [
    { employeeId: "DSP-1001", email: "nuwan.perera@waypoint.lk", name: "Nuwan Perera", role: "dispatcher", passwordHash: passwordHash[0] },
    { employeeId: "LDR-2001", email: "kasun.silva@waypoint.lk", name: "Kasun Silva", role: "loader", depot: "Peliyagoda", passwordHash: passwordHash[1] },
    { employeeId: "LDR-2002", email: "amal.perera@waypoint.lk", name: "Amal Perera", role: "loader", depot: "Peliyagoda", passwordHash: passwordHash[1] },
    { employeeId: "DRV-3001", email: "ruwan.fernando@waypoint.lk", name: "Ruwan Fernando", role: "driver", depot: "Peliyagoda", passwordHash: passwordHash[2] },
    { employeeId: "DRV-3002", email: "ishara.senanayake@waypoint.lk", name: "Ishara Senanayake", role: "driver", depot: "Peliyagoda", passwordHash: passwordHash[2] },
    { employeeId: "STM-4001", email: "dilani.j@waypoint.lk", name: "Dilani Jayasuriya", role: "store_manager", outletId: "OUT001", passwordHash: passwordHash[3] },
    { employeeId: "STM-4002", email: "chathuri.r@waypoint.lk", name: "Chathuri Rodrigo", role: "store_manager", outletId: "OUT002", passwordHash: passwordHash[3] },
  ] as const
  const result = await User.bulkWrite(users.map((user) => ({
    updateOne: { filter: { employeeId: user.employeeId }, update: { $set: { ...user, active: true } }, upsert: true },
  })))
  console.info(JSON.stringify({ event: "user_seed_complete", source: users.length, matched: result.matchedCount, upserted: result.upsertedCount }))
}

async function upsertDemo() {
  const days = [
    { date: "2026-09-30", dayOfWeek: "Wed", isWeekend: false, isoYear: 2026, isoWeek: 40, isPayday: false, festival: "", festivalRamp: 0, isHoliday: false, monsoon: false, isOperating: true },
    { date: "2026-10-01", dayOfWeek: "Thu", isWeekend: false, isoYear: 2026, isoWeek: 40, isPayday: false, festival: "", festivalRamp: 0, isHoliday: false, monsoon: false, isOperating: true },
    { date: "2026-10-02", dayOfWeek: "Fri", isWeekend: false, isoYear: 2026, isoWeek: 40, isPayday: false, festival: "", festivalRamp: 0, isHoliday: false, monsoon: false, isOperating: true },
    { date: "2026-10-03", dayOfWeek: "Sat", isWeekend: true, isoYear: 2026, isoWeek: 40, isPayday: false, festival: "", festivalRamp: 0, isHoliday: false, monsoon: false, isOperating: true },
    { date: "2026-10-04", dayOfWeek: "Sun", isWeekend: true, isoYear: 2026, isoWeek: 40, isPayday: false, festival: "", festivalRamp: 0, isHoliday: false, monsoon: false, isOperating: false },
    { date: "2026-10-05", dayOfWeek: "Mon", isWeekend: false, isoYear: 2026, isoWeek: 41, isPayday: false, festival: "", festivalRamp: 0, isHoliday: false, monsoon: false, isOperating: true },
  ]
  await CalendarDay.bulkWrite(days.map((day) => ({ updateOne: { filter: { date: day.date }, update: { $set: day }, upsert: true } })))
  console.warn("WARNING: loaded explicitly labelled 2026 hackathon demo calendar days")
}

async function main() {
  const mode = process.argv[2] || "all"
  await connectDatabase(config.mongodbUri)
  await Promise.all([
    User.syncIndexes(), AuthHandoff.syncIndexes(), Outlet.syncIndexes(), Vehicle.syncIndexes(), CalendarDay.syncIndexes(),
    Product.syncIndexes(), Order.syncIndexes(), Trip.syncIndexes(), LoadRecord.syncIndexes(), DeliveryRecord.syncIndexes(),
    TripLocation.syncIndexes(), OperationalEvent.syncIndexes(), FileAsset.syncIndexes(), IdempotencyRecord.syncIndexes(), SyncReceipt.syncIndexes(),
  ])
  if (mode === "all" || mode === "reference") await upsertReference()
  if (mode === "all" || mode === "users") await upsertUsers()
  if (mode === "demo" || (mode === "all" && config.seedDemoScenario)) await upsertDemo()
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1 })
  .finally(async () => { await disconnectDatabase() })
