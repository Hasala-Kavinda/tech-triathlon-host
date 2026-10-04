import { randomUUID } from "node:crypto"
import type { FastifyInstance } from "fastify"
import { issueAccessToken } from "../../common/auth.js"
import { runAsOf } from "../../common/clock.js"
import { DeliveryRecord, FileAsset, LoadRecord, Trip, User } from "../../database/models/index.js"
import { Order } from "../orders/persistence/order.model.js"
import { buildAllowanceTable, buildTravelTable, DEFAULT_CONFIG, planFromOrders, type EngineContext, type EngineOrder, type EngineVehicle } from "../../route-engine/index.js"
import { buildEngineContext } from "../planning/engine-context.js"
import { VehicleReadPort } from "../reference/vehicle.read-port.js"

/**
 * DEVELOPMENT ONLY (registered only when NODE_ENV=development, see dev.module.ts).
 *
 * Creates a complete, consistent chain order -> trip -> load record -> delivery records up to a target stage by
 * driving the REAL HTTP routes in-process (`app.inject`) as each real seeded role, so authentication, validation,
 * transactions, idempotency, audit and every business rule run exactly as in the app. It only controls INPUTS:
 * the simulated submission time (`asOf`), the target stage, and which seeded outlet / vehicle / driver / loader to use.
 * It never skips a rule: when a real handler rejects a step it stops and returns that step and the real error.
 */
export const STAGES = ["submitted", "scheduled", "load_confirmed", "in_transit", "arrived", "delivered", "receipt_confirmed"] as const
export type Stage = (typeof STAGES)[number]

export interface ScenarioInput {
  stage: Stage
  outletId?: string | undefined
  orderType?: string | undefined
  productSku?: string | undefined
  quantity?: number | undefined
  vehicleId?: string | undefined
  /** Force this seeded Driver (otherwise the real depot/availability rule picks one). */
  driverEmployeeId?: string | undefined
  loaderEmployeeId?: string | undefined
  /** ISO instant the order is submitted "as of" (e.g. yesterday 14:00); the real cutoff rule evaluates against it. */
  asOf?: string | undefined
  serviceDate?: string | undefined
  /** HH:mm Style/Tech departure (Fresh departs per its own window). */
  departureTime?: string | undefined
  arrivedAt?: string | undefined
  completedAt?: string | undefined
}

export class StepError extends Error {
  constructor(public step: string, public status: number, public code: string, message: string) { super(message) }
}

type Reply = { statusCode: number; json(): any; body: string }
const stageIndex = (s: Stage) => STAGES.indexOf(s)
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64")

export async function runScenario(app: FastifyInstance, input: ScenarioInput) {
  const created: Record<string, unknown> = {}
  const notes: string[] = []
  const tokens = new Map<string, string>()
  const ids: { orderId?: string; tripId?: string; deliveryIds?: string[] } = {}

  const userBy = async (filter: Record<string, unknown>, what: string) => {
    const user = await User.findOne({ active: true, ...filter }).sort({ employeeId: 1 }).lean()
    if (!user) throw new StepError("find_user", 404, "SEEDED_USER_MISSING", `No active seeded ${what} found.`)
    return user
  }
  const tokenFor = async (user: { _id: unknown; employeeId: string; role: string }) => {
    const key = String(user._id)
    if (!tokens.has(key)) tokens.set(key, await issueAccessToken(app, { id: key, employeeId: user.employeeId, role: user.role as never }))
    return tokens.get(key)!
  }
  const call = async (user: { _id: unknown; employeeId: string; role: string }, method: "GET" | "POST" | "PATCH" | "PUT", url: string, payload?: unknown, headers: Record<string, string> = {}): Promise<Reply> =>
    app.inject({ method, url: `/api/v1${url}`, headers: { authorization: `Bearer ${await tokenFor(user)}`, ...headers }, ...(payload === undefined ? {} : { payload: payload as object }) }) as unknown as Reply
  const must = (step: string, reply: Reply) => {
    if (reply.statusCode >= 400) {
      const error = (() => { try { return reply.json().error ?? {} } catch { return {} } })()
      throw new StepError(step, reply.statusCode, error.code ?? "ERROR", error.message ?? reply.body)
    }
    return reply.json().data
  }
  const versioned = (version: number) => ({ "If-Match": String(version) })

  const snapshot = async () => {
    const [order, trip, load, deliveries, assets] = await Promise.all([
      ids.orderId ? Order.findById(ids.orderId).lean() : null,
      ids.tripId ? Trip.findById(ids.tripId).lean() : null,
      ids.tripId ? LoadRecord.findOne({ tripId: ids.tripId }).lean() : null,
      ids.tripId ? DeliveryRecord.find({ tripId: ids.tripId }).lean() : [],
      ids.tripId ? FileAsset.find({ tripId: String(ids.tripId) }).lean() : [],
    ])
    const driver = trip ? await User.findById(trip.driverId).select("employeeId name depot").lean() : null
    return {
      order: order && { orderNumber: order.orderNumber, status: order.status, requestedDate: order.requestedDate, cutoffBucket: order.cutoffBucket, outletId: order.outletId, weightKg: order.totalWeightKg },
      trip: trip && { tripNumber: trip.tripNumber, status: trip.status, serviceDate: trip.serviceDate, vehicleId: trip.vehicleId, depot: trip.depot, driver: driver && `${driver.name} (${driver.employeeId}, ${driver.depot})` },
      loadRecord: load && { status: load.status, items: load.items.length },
      deliveryRecords: deliveries.map((d) => ({ outletId: d.outletId, status: d.status, outcome: d.outcome ?? null, timingResult: d.timingResult ?? null, receipt: d.receipt ? (d.receipt as { result?: string }).result ?? "recorded" : null })),
      fileAssets: assets.map((a) => ({ kind: a.kind, provider: a.provider, publicId: a.publicId, status: a.status })),
    }
  }

  try {
    // 1. Store Manager submits the order (the REAL order route; the cutoff rule evaluates against `asOf` when given).
    const store = await userBy({ role: "store_manager", ...(input.outletId ? { outletId: input.outletId } : {}) }, input.outletId ? `Store Manager for ${input.outletId}` : "Store Manager")
    const products = must("catalog", await call(store, "GET", `/catalog/products?pageSize=100${input.orderType ? `&orderType=${encodeURIComponent(input.orderType)}` : ""}`)) as Array<{ _id: string; sku: string; orderTypes: string[] }>
    const product = input.productSku ? products.find((p) => p.sku === input.productSku) : products.find((p) => p.orderTypes.includes(input.orderType ?? "dry")) ?? products[0]
    if (!product) throw new StepError("catalog", 404, "NO_PRODUCT", "No product is available for this outlet/order type.")
    const orderType = input.orderType ?? (product.orderTypes.includes("dry") ? "dry" : product.orderTypes[0]!)
    const submit = () => call(store, "POST", "/orders", { orderType, items: [{ productId: product._id, quantity: input.quantity ?? 4 }], ...(input.serviceDate ? { requestedDate: input.serviceDate } : {}) }, { "Idempotency-Key": randomUUID() })
    const order = must("submit_order", input.asOf ? await runAsOf(new Date(input.asOf), submit) : await submit()) as { _id: string; orderNumber: string; requestedDate: string; cutoffBucket: string }
    ids.orderId = order._id
    notes.push(`Order ${order.orderNumber} submitted${input.asOf ? ` as of ${input.asOf}` : ""}: requestedDate ${order.requestedDate}, ${order.cutoffBucket} (decided by the real cutoff rule).`)
    if (input.stage === "submitted") return { ok: true, stageReached: "submitted" as Stage, notes, created, snapshot: await snapshot() }

    // 2. Dispatcher schedules it: engine route, then the REAL draft -> validate -> publish.
    const dispatcher = await userBy({ role: "dispatcher" }, "Dispatcher")
    const serviceDate = input.serviceDate ?? order.requestedDate
    const payload = await buildEngineContext(serviceDate, app.config.referenceDataDir, app.config.devMode)
    const ctx: EngineContext = {
      serviceDate, outlets: new Map(payload.outlets.map((o) => [o.outletId, o as never])), vehicleState: payload.vehicleState,
      travel: buildTravelTable(payload.travelRows), allowances: buildAllowanceTable(payload.allowanceRows), config: DEFAULT_CONFIG,
      styleTechDepartureMin: toMinutes(input.departureTime ?? "12:30"),
      ...(payload.devMode ? { devMode: true } : {}), ...(payload.isOperatingDay === undefined ? {} : { isOperatingDay: payload.isOperatingDay }),
    }
    const fleet = await VehicleReadPort.findActiveByFilter({})
    const vehicles: EngineVehicle[] = fleet.map((v) => ({ vehicleId: v.vehicleId, type: v.type === "van" ? "van" : "truck", temp: v.temperatureClass === "reefer" ? "reefer" : "ambient", depot: v.depot, weightCapKg: v.weightCapacityKg, volumeCapM3: v.volumeCapacityM3, kmPerL: v.kmPerL, weeklyFuelQuotaL: v.weeklyFuelQuotaL }))
    const orderDoc = (await Order.findById(order._id).lean())!
    const engineOrder: EngineOrder = {
      id: String(orderDoc._id), orderNumber: orderDoc.orderNumber, outletId: orderDoc.outletId, brand: orderDoc.brand as EngineOrder["brand"], status: orderDoc.status, allocated: false,
      requestedDate: orderDoc.requestedDate, weightKg: orderDoc.totalWeightKg, volumeM3: orderDoc.totalVolumeM3, needsReefer: orderDoc.items.some((i) => ["chilled", "frozen"].includes(i.temperatureClass)),
    }
    const plan = planFromOrders([engineOrder.id], [engineOrder], vehicles, ctx, { autoSelect: false, ...(input.vehicleId ? { vehicleId: input.vehicleId } : {}) })
    if (!plan.vehicleId || !plan.route) {
      const why = [...new Set(plan.ranking.flatMap((r) => r.reasons.map((x) => x.message)))].slice(0, 3).join(" | ")
      throw new StepError("choose_vehicle", 422, "NO_ELIGIBLE_VEHICLE", `No vehicle can take this order (${why}).`)
    }
    const route = plan.route
    const at = (min: number) => new Date(new Date(`${serviceDate}T00:00:00+05:30`).getTime() + min * 60_000)
    if (route.departureMin === null || route.tripMinutes === null || route.distanceKm === null) throw new StepError("route", 422, "ROUTE_NOT_COMPUTED", route.violations.map((v) => v.message).join(" | ") || "The route could not be computed.")
    const forcedDriver = input.driverEmployeeId ? await userBy({ role: "driver", employeeId: input.driverEmployeeId.toUpperCase() }, `Driver ${input.driverEmployeeId}`) : null
    const draft = must("draft_trip", await call(dispatcher, "POST", "/planning/trips", {
      serviceDate, departureAt: at(route.departureMin).toISOString(), plannedEndAt: at(route.departureMin + route.tripMinutes).toISOString(),
      vehicleId: plan.vehicleId, distanceKm: route.distanceKm, ...(forcedDriver ? { driverId: String(forcedDriver._id) } : {}),
      stops: route.stops.map((s) => ({ orderId: s.orderId, plannedArrivalAt: at(s.arrivalMin ?? route.departureMin!).toISOString() })),
    })) as { _id: string; tripNumber: string }
    ids.tripId = draft._id
    const validation = must("validate_trip", await call(dispatcher, "POST", `/planning/trips/${draft._id}/validate`)) as { valid: boolean; version: number; rules: Array<{ passed: boolean; message: string }> }
    if (!validation.valid) throw new StepError("validate_trip", 422, "TRIP_RULES_FAILED", validation.rules.filter((r) => !r.passed).map((r) => r.message).join(" | "))
    must("publish_trip", await call(dispatcher, "POST", `/planning/trips/${draft._id}/publish`, { expectedVersion: validation.version }, versioned(validation.version)))
    notes.push(`Trip ${draft.tripNumber} published on ${plan.vehicleId} (real validation passed${app.config.devMode ? "; server DEV_MODE relaxations apply" : ""}).`)
    if (input.stage === "scheduled") return { ok: true, stageReached: "scheduled" as Stage, notes, created, snapshot: await snapshot() }

    // 3. Loader (depot of the trip): claim -> start loading -> mark items -> reconcile -> confirm.
    let trip = (await Trip.findById(draft._id).lean())!
    const loader = await userBy({ role: "loader", depot: trip.depot, ...(input.loaderEmployeeId ? { employeeId: input.loaderEmployeeId.toUpperCase() } : {}) }, `Loader at ${trip.depot}`)
    let record = must("load_job", await call(loader, "GET", `/load-jobs/${draft._id}`)) as { version: number; items: Array<{ itemId: string; expectedQuantity: number }> }
    const loadStep = async (step: string, path: string) => { const r = must(step, await call(loader, "POST", `/load-jobs/${draft._id}/${path}`, { expectedVersion: record.version }, versioned(record.version))) as { record?: typeof record } & typeof record; record = (r.record ?? r) as typeof record }
    await loadStep("loader_claim", "claim")
    await loadStep("loader_start_loading", "start-loading")
    for (const item of record.items) record = must("loader_item", await call(loader, "PATCH", `/load-jobs/${draft._id}/items/${item.itemId}`, { status: "loaded", loadedQuantity: item.expectedQuantity, expectedVersion: record.version }, versioned(record.version))) as typeof record
    await loadStep("loader_reconcile", "reconcile")
    await loadStep("loader_confirm", "confirm")
    notes.push(`Loader ${loader.employeeId} confirmed the load; the trip is now load_confirmed.`)
    if (input.stage === "load_confirmed") return { ok: true, stageReached: "load_confirmed" as Stage, notes, created, snapshot: await snapshot() }

    // 4. Driver claims, confirms the vehicle, uploads the REAL start-meter photo, starts the trip.
    trip = (await Trip.findById(draft._id).lean())!
    const driver = (await User.findById(trip.driverId).lean())!
    const claimed = must("driver_claim", await call(driver, "POST", `/driver/assignments/${draft._id}/claim`, { expectedVersion: (trip as { version?: number }).version }, versioned((trip as { version?: number }).version ?? 0))) as { assignment: { version: number } }
    const confirmed = must("driver_confirm_vehicle", await call(driver, "POST", `/driver/assignments/${draft._id}/confirm-vehicle`, { vehicleId: trip.vehicleId, expectedVersion: claimed.assignment.version }, versioned(claimed.assignment.version))) as { assignment: { version: number } }
    const startAsset = await uploadEvidence(app, driver, call, "start_meter", String(draft._id))
    const started = must("driver_start_trip", await call(driver, "POST", `/trips/${draft._id}/start`, { fileAssetId: startAsset, capturedAt: new Date().toISOString(), expectedVersion: confirmed.assignment.version }, versioned(confirmed.assignment.version))) as { version: number }
    notes.push(`Driver ${driver.employeeId} started the trip (real Cloudinary start-meter photo).`)
    if (input.stage === "in_transit") return { ok: true, stageReached: "in_transit" as Stage, notes, created, snapshot: await snapshot() }

    // 4b. "arrived": the Driver records arrival at every stop (the real arrive route) and stops there, so the
    // Store Manager can be offered the PIN / follow the order while the delivery is `arrived`.
    if (input.stage === "arrived") {
      for (const stop of trip.stops) {
        const arrivedAt = input.arrivedAt ?? (stop.plannedArrivalAt ?? new Date()).toISOString()
        must("driver_arrive", await call(driver, "POST", `/trips/${draft._id}/stops/${stop.stopId}/arrive`, { arrivedAt }))
      }
      notes.push("Driver recorded arrival at the outlet (delivery_records.status = arrived). No PIN issued/verified yet.")
      return { ok: true, stageReached: "arrived" as Stage, notes, created, snapshot: await snapshot() }
    }

    // 5. Each stop: Store issues the PIN, Driver arrives, verifies it, completes. Then the Driver finishes the route.
    const deliveries = await DeliveryRecord.find({ tripId: draft._id }).lean()
    ids.deliveryIds = deliveries.map((d) => String(d._id))
    for (const stop of trip.stops) {
      const delivery = deliveries.find((d) => String(d.tripStopId) === String(stop.tripStopId))!
      const stopStore = await userBy({ role: "store_manager", outletId: delivery.outletId }, `Store Manager for ${delivery.outletId}`)
      const { pin } = must("store_issue_pin", await call(stopStore, "POST", `/store/deliveries/${delivery._id}/pin`, {})) as { pin: string }
      const arrivedAt = input.arrivedAt ?? (stop.plannedArrivalAt ?? new Date()).toISOString()
      must("driver_arrive", await call(driver, "POST", `/trips/${draft._id}/stops/${stop.stopId}/arrive`, { arrivedAt }))
      must("driver_verify_pin", await call(driver, "POST", `/trips/${draft._id}/stops/${stop.stopId}/verify-pin`, { pin, clientRecordedAt: arrivedAt }))
      const current = (await DeliveryRecord.findById(delivery._id).lean())!
      must("driver_complete_stop", await call(driver, "POST", `/trips/${draft._id}/stops/${stop.stopId}/complete`, { outcome: "delivered", completedAt: input.completedAt ?? new Date(new Date(arrivedAt).getTime() + 10 * 60_000).toISOString(), expectedVersion: (current as { version?: number }).version }, versioned((current as { version?: number }).version ?? 0)))
    }
    const endAsset = await uploadEvidence(app, driver, call, "end_meter", String(draft._id))
    const latest = (await Trip.findById(draft._id).lean())! as { version?: number }
    must("driver_finish_trip", await call(driver, "POST", `/trips/${draft._id}/finish`, { endFileAssetId: endAsset, capturedAt: new Date().toISOString(), expectedVersion: latest.version }, versioned(latest.version ?? 0)))
    void started
    notes.push("All stops delivered (PIN verified) and the trip finished (real end-meter photo).")
    if (input.stage === "delivered") return { ok: true, stageReached: "delivered" as Stage, notes, created, snapshot: await snapshot() }

    // 6. Store Managers confirm receipt.
    for (const d of await DeliveryRecord.find({ tripId: draft._id }).lean()) {
      const stopStore = await userBy({ role: "store_manager", outletId: d.outletId }, `Store Manager for ${d.outletId}`)
      must("store_receipt", await call(stopStore, "POST", `/store/deliveries/${d._id}/receipt`, { result: "full", itemOutcomes: d.items.map((i) => ({ sku: i.sku, received: i.delivered ?? i.expected ?? 0 })), expectedVersion: (d as { version?: number }).version }, versioned((d as { version?: number }).version ?? 0)))
    }
    notes.push("Receipt confirmed by the Store Manager.")
    return { ok: true, stageReached: "receipt_confirmed" as Stage, notes, created, snapshot: await snapshot() }
  } catch (error) {
    if (!(error instanceof StepError)) throw error
    return { ok: false, stageReached: null, failedStep: { step: error.step, status: error.status, code: error.code, message: error.message }, notes, created, snapshot: await snapshot() }
  }
}

const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))

/** The REAL evidence flow the Driver app uses: signed payload -> direct Cloudinary upload -> /files/complete. */
async function uploadEvidence(app: FastifyInstance, driver: { _id: unknown; employeeId: string; role: string }, call: (...a: any[]) => Promise<Reply>, kind: "start_meter" | "end_meter", tripId: string) {
  const sign = await call(driver, "POST", "/files/upload-signature", { kind, tripId, mimeType: "image/png", bytes: PNG.length })
  if (sign.statusCode >= 400) throw new StepError(`meter_photo_${kind}`, sign.statusCode, sign.json().error?.code ?? "UPLOAD_SIGNATURE_FAILED", sign.json().error?.message ?? "Could not get an upload signature.")
  const s = sign.json().data as { cloudName: string; apiKey: string; timestamp: number; folder: string; uploadType: string; signature: string }
  const form = new FormData()
  form.set("file", new Blob([PNG], { type: "image/png" }), `${kind}.png`)
  form.set("api_key", s.apiKey); form.set("timestamp", String(s.timestamp)); form.set("folder", s.folder); form.set("type", s.uploadType); form.set("signature", s.signature)
  const upload = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(s.cloudName)}/image/upload`, { method: "POST", body: form })
  const meta = await upload.json() as { public_id?: string; version?: number; signature?: string; format?: string; bytes?: number; error?: { message?: string } }
  if (!upload.ok) throw new StepError(`meter_photo_${kind}`, upload.status, "CLOUDINARY_UPLOAD_FAILED", `Cloudinary rejected the upload: ${meta.error?.message ?? upload.statusText}`)
  const done = await call(driver, "POST", "/files/complete", { publicId: meta.public_id, providerVersion: meta.version, providerSignature: meta.signature, kind, tripId, mimeType: "image/png", format: meta.format, bytes: meta.bytes, capturedAt: new Date().toISOString() })
  if (done.statusCode >= 400) throw new StepError(`meter_photo_${kind}`, done.statusCode, done.json().error?.code ?? "FILE_COMPLETE_FAILED", done.json().error?.message ?? "Could not record the upload.")
  void app
  return String(done.json().data._id)
}
