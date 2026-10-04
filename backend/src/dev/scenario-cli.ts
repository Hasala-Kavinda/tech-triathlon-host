/**
 * DEVELOPMENT ONLY. Calls POST /api/v1/dev/seed-scenario on a running API (which exists only when the API runs
 * with NODE_ENV=development) after logging in through the real auth flow as a Dispatcher.
 *
 *   npm run scenario -- --stage load_confirmed
 *   npm run scenario -- --stage delivered --driver DRV-3001 --as-of 2026-10-03T14:00:00+05:30
 *
 * See docs/dev-testing.md.
 */
const args = process.argv.slice(2)
const flag = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined }
const has = (name: string) => args.includes(`--${name}`)

if (has("help") || !flag("stage")) {
  console.log(`Usage: npm run scenario -- --stage <submitted|scheduled|load_confirmed|in_transit|arrived|delivered|receipt_confirmed> [options]

  --outlet OUT001          seeded outlet (its Store Manager submits the order)
  --order-type dry         order type        --sku DEMO-FR-002   product     --quantity 4
  --vehicle VEH037         force a vehicle   --driver DRV-3001   force a Driver   --loader LDR-2001
  --as-of <ISO time>       pretend the order is submitted at this instant (the real cutoff rule evaluates against it)
  --service-date YYYY-MM-DD   delivery day  --departure HH:mm   Style/Tech departure
  --arrived-at <ISO>  --completed-at <ISO>   device times at the stops (decide on_time / late)
  --api http://localhost:3000   --dispatcher DSP-1001 --password Dispatch@123 --email nuwan.perera@waypoint.lk`)
  process.exit(has("help") ? 0 : 1)
}

const api = (flag("api") ?? process.env.API_URL ?? "http://localhost:3000").replace(/\/$/, "")
const base = `${api}/api/v1`
const origin = process.env.DISPATCHER_ORIGIN ?? "http://localhost:5174"

async function json(res: Response) { try { return await res.json() as any } catch { return {} } }

const login = await fetch(`${base}/auth/login`, {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ employeeId: flag("dispatcher") ?? "DSP-1001", password: flag("password") ?? "Dispatch@123", email: flag("email") ?? "nuwan.perera@waypoint.lk" }),
})
const loginBody = await json(login)
if (!login.ok) { console.error(`Login failed (${login.status}): ${loginBody.error?.message ?? "is the API running at " + api + "?"}`); process.exit(1) }
const exchange = await fetch(`${base}/auth/exchange`, { method: "POST", headers: { "content-type": "application/json", Origin: origin }, body: JSON.stringify({ handoffCode: loginBody.data.handoffCode }) })
const exchangeBody = await json(exchange)
if (!exchange.ok) { console.error(`Token exchange failed (${exchange.status}): ${exchangeBody.error?.message}`); process.exit(1) }

const payload = {
  stage: flag("stage"), outletId: flag("outlet"), orderType: flag("order-type"), productSku: flag("sku"), quantity: flag("quantity") ? Number(flag("quantity")) : undefined,
  vehicleId: flag("vehicle"), driverEmployeeId: flag("driver"), loaderEmployeeId: flag("loader"), asOf: flag("as-of"), serviceDate: flag("service-date"),
  departureTime: flag("departure"), arrivedAt: flag("arrived-at"), completedAt: flag("completed-at"),
}
const res = await fetch(`${base}/dev/seed-scenario`, {
  method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${exchangeBody.data.accessToken}` },
  body: JSON.stringify(Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined))),
})
const body = await json(res)
if (res.status === 404) { console.error("404: the dev scenario endpoint does not exist on this API (it is only available when NODE_ENV=development)."); process.exit(1) }
if (!res.ok) { console.error(`Request failed (${res.status}): ${body.error?.message ?? JSON.stringify(body)}`); process.exit(1) }

const r = body.data
console.log(r.ok ? `\nOK - reached stage: ${r.stageReached}` : `\nSTOPPED at step "${r.failedStep.step}" (${r.failedStep.status} ${r.failedStep.code})\n  ${r.failedStep.message}`)
for (const n of r.notes) console.log(`  - ${n}`)
const s = r.snapshot
console.log("\nCurrent state (read back from the database):")
if (s.order) console.log(`  order     ${s.order.orderNumber}  status=${s.order.status}  requestedDate=${s.order.requestedDate}  ${s.order.cutoffBucket}  outlet=${s.order.outletId}  ${s.order.weightKg}kg`)
if (s.trip) console.log(`  trip      ${s.trip.tripNumber}  status=${s.trip.status}  serviceDate=${s.trip.serviceDate}  vehicle=${s.trip.vehicleId}  depot=${s.trip.depot}\n  driver    ${s.trip.driver}`)
if (s.loadRecord) console.log(`  load      status=${s.loadRecord.status}  items=${s.loadRecord.items}`)
for (const d of s.deliveryRecords) console.log(`  delivery  ${d.outletId}  status=${d.status}  outcome=${d.outcome}  timing=${d.timingResult}  receipt=${d.receipt}`)
for (const f of s.fileAssets) console.log(`  file      ${f.kind}  ${f.provider}  ${f.publicId}  ${f.status}`)
process.exit(r.ok ? 0 : 2)
