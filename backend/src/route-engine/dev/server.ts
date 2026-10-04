/**
 * Isolated dev harness for the route engine. NOT part of the API: it has its own Fastify instance
 * and port, imports nothing from the rest of the app, and only reads MongoDB.
 *
 *   npx tsx src/route-engine/dev/server.ts      (from backend/)   ->  http://localhost:3999
 *
 * Reference data (outlets, vehicles, district travel, service allowances) comes from the real
 * Drive Data CSVs. Real open orders and vehicle usage come from MongoDB when reachable; the page can
 * also add clearly-labelled SYNTHETIC orders because the database has few real ones.
 */
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import Fastify from "fastify"
import mongoose from "mongoose"
import { DEFAULT_CONFIG } from "../config.js"
import { loadDriveData } from "../data/driveData.js"
import { planFromOrders, planFromVehicle, recompute } from "../plan.js"
import type { EngineContext, EngineOrder, PlanEdit, PlanResult, VehicleDayState } from "../types.js"

const here = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.ROUTE_ENGINE_PORT ?? 3999)
const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/waylink"
const drive = loadDriveData()

let dbReady = false
mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 2500 }).then(() => { dbReady = true }).catch(() => { dbReady = false })

type DbOrder = { _id: unknown; orderNumber: string; outletId: string; brand: EngineOrder["brand"]; status: string; allocatedTripId?: unknown; requestedDate: string; totalWeightKg: number; totalVolumeM3: number; items?: Array<{ temperatureClass?: string }> }

async function dbOrders(date: string): Promise<EngineOrder[]> {
  if (!dbReady) return []
  const rows = await mongoose.connection.db!.collection<DbOrder>("orders").find({ requestedDate: date }).limit(500).toArray()
  return rows.map((o) => ({
    id: String(o._id), orderNumber: o.orderNumber, outletId: o.outletId, brand: o.brand, status: o.status, allocated: Boolean(o.allocatedTripId),
    requestedDate: o.requestedDate, weightKg: o.totalWeightKg, volumeM3: o.totalVolumeM3,
    needsReefer: (o.items ?? []).some((i) => i.temperatureClass === "chilled" || i.temperatureClass === "frozen"),
  }))
}

/** turnsToday + weeklyFuelUsedL derived from real trips; Fresh/Style+Tech minutes are not derivable, so they default to 0 (editable in the page). */
async function dbVehicleState(date: string): Promise<Record<string, VehicleDayState>> {
  const state: Record<string, VehicleDayState> = {}
  if (!dbReady) return state
  const d = new Date(`${date}T00:00:00Z`)
  const monday = new Date(d); monday.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  const sunday = new Date(monday); sunday.setUTCDate(monday.getUTCDate() + 6)
  const iso = (x: Date) => x.toISOString().slice(0, 10)
  const live = ["published", "loading", "load_confirmed", "claimed", "in_transit", "completed"]
  type DbTrip = { vehicleId: string; serviceDate: string; distanceKm: number }
  const trips = await mongoose.connection.db!.collection<DbTrip>("trips").find({ serviceDate: { $gte: iso(monday), $lte: iso(sunday) }, status: { $in: live } }).toArray()
  const kmPerL = new Map(drive.vehicles.map((v) => [v.vehicleId, v.kmPerL]))
  for (const t of trips) {
    const s = (state[t.vehicleId] ??= { turnsToday: 0, weeklyFuelUsedL: 0, usedMinutes: { fresh: 0, styleTech: 0 } })
    if (t.serviceDate === date) s.turnsToday += 1
    s.weeklyFuelUsedL += t.distanceKm / (kmPerL.get(t.vehicleId) ?? 1)
  }
  return state
}

interface Body {
  date: string
  orders: EngineOrder[]
  state?: Record<string, Partial<VehicleDayState>>
  styleTechDepartureMin?: number
  vehicleId?: string
  mandatoryIds?: string[]
  previous?: PlanResult
  edit?: PlanEdit
}

async function context(body: Body): Promise<EngineContext> {
  const fromDb = await dbVehicleState(body.date)
  const vehicleState: Record<string, VehicleDayState> = { ...fromDb }
  for (const [id, s] of Object.entries(body.state ?? {})) {
    const base = vehicleState[id] ?? { turnsToday: 0, weeklyFuelUsedL: 0, usedMinutes: { fresh: 0, styleTech: 0 } }
    vehicleState[id] = { ...base, ...s, usedMinutes: { ...base.usedMinutes, ...(s.usedMinutes ?? {}) } }
  }
  return {
    serviceDate: body.date, outlets: drive.outlets, vehicleState, travel: drive.travel, allowances: drive.allowances, config: DEFAULT_CONFIG,
    ...(body.styleTechDepartureMin === undefined ? {} : { styleTechDepartureMin: body.styleTechDepartureMin }),
  }
}

const app = Fastify({ logger: false })

app.get("/", async (_req, reply) => reply.type("text/html").send(readFileSync(path.join(here, "index.html"), "utf8")))

app.get("/api/bootstrap", async (req) => {
  const date = String((req.query as { date?: string }).date ?? "")
  return {
    db: dbReady ? "connected" : "unreachable (no real orders/usage loaded)",
    vehicles: drive.vehicles,
    outlets: [...drive.outlets.values()],
    orders: await dbOrders(date),
    vehicleState: await dbVehicleState(date),
    config: DEFAULT_CONFIG,
  }
})

app.post("/api/plan-vehicle", async (req) => {
  const body = req.body as Body
  return planFromVehicle(body.vehicleId!, body.orders, drive.vehicles, await context(body))
})
app.post("/api/plan-orders", async (req) => {
  const body = req.body as Body
  return planFromOrders(body.mandatoryIds ?? [], body.orders, drive.vehicles, await context(body), body.vehicleId ? { vehicleId: body.vehicleId } : {})
})
app.post("/api/recompute", async (req) => {
  const body = req.body as Body
  return recompute(body.previous!, body.edit!, body.orders, drive.vehicles, await context(body))
})

app.setErrorHandler((error, _req, reply) => reply.status(400).send({ error: (error as Error).message }))

app.listen({ port: PORT, host: "127.0.0.1" }).then(() => console.info(`route-engine harness: http://localhost:${PORT}  (db: ${dbReady ? "connected" : "connecting..."})`))
