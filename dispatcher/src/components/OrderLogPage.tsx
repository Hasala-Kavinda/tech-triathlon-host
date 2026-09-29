import {
  CheckCircle2,
  Circle,
  Download,
  PackageCheck,
  Search,
  Truck,
  XCircle,
} from "lucide-react"
import { useMemo, useState } from "react"
import type { Order } from "../data/sampleData"
import { Button, Heading, PageTitle, ShopTag, TextInput, UnstyledButton } from "./ui"

/* ------------------------------------------------------------------ */
/* Order log — every order with when, where, id and whether it was     */
/* completed, in a spreadsheet-style sheet. Left panel: day history    */
/* and the selected order's event history.                             */
/* ------------------------------------------------------------------ */

export type LogStatus =
  | "Delivered"
  | "Not delivered"
  | "In transit"
  | "Scheduled"
  | "Not scheduled"
  | "Deferred"

export type LogEntry = {
  day: number
  time: string
  id: string
  shop: string
  town: string
  type: "Fresh" | "Tech" | "Style"
  vehicle: string
  route: string
  stop: string
  items: string
  kg: number
  status: LogStatus
  deliveredAt: string
  delay: string
  note: string
}

const SHOPS: { shop: string; town: string; type: LogEntry["type"] }[] = [
  { shop: "Sunrise Mart", town: "Galle Fort", type: "Fresh" },
  { shop: "Lanka Super Stores", town: "Unawatuna", type: "Style" },
  { shop: "Coastal Traders", town: "Weligama", type: "Tech" },
  { shop: "Matara City Mart", town: "Matara", type: "Fresh" },
  { shop: "Mirissa Mart", town: "Mirissa", type: "Tech" },
  { shop: "Hill View Stores", town: "Akuressa", type: "Fresh" },
  { shop: "Galle Fashion House", town: "Galle", type: "Style" },
  { shop: "Fort Book Corner", town: "Galle Fort", type: "Style" },
]

const ROUTES = [
  { vehicle: "SP ND-4417", route: "Galle → Matara" },
  { vehicle: "WP CAB-7810", route: "Galle → Hikkaduwa" },
  { vehicle: "WP KD-3301", route: "Galle → Elpitiya" },
  { vehicle: "WP PH-2210", route: "Galle → Akuressa" },
]

const FAIL_NOTES = ["Shop closed on arrival", "Stock manager not available", "Short quantity, returned to depot"]

function weekday(day: number) {
  return new Date(2026, 8, day).toLocaleString("en", { weekday: "short" })
}

function pad(n: number) {
  return String(n).padStart(2, "0")
}

/** Past days (Mon 21 – Sat 26): generated so the log has history. */
function pastEntries(): LogEntry[] {
  const list: LogEntry[] = []
  let serial = 940
  for (let day = 21; day <= 26; day++) {
    const count = 5 + (day % 3)
    for (let i = 0; i < count; i++) {
      serial += 1
      const shop = SHOPS[(serial + i) % SHOPS.length]
      const route = ROUTES[(day + i) % ROUTES.length]
      const hour = 7 + Math.floor(i * 0.9)
      const minute = (serial * 7) % 60
      const failed = (serial % 9 === 0)
      const deferred = !failed && serial % 13 === 0
      const late = (serial * 3) % 4
      list.push({
        day,
        time: `${pad(hour)}:${pad(minute)}`,
        id: `ORD-0${serial}`,
        ...shop,
        vehicle: deferred ? "—" : route.vehicle,
        route: deferred ? "—" : route.route,
        stop: deferred ? "—" : String((i % 4) + 1),
        items: `${4 + ((serial * 5) % 11)} ${shop.type === "Fresh" ? "crates" : "boxes"}`,
        kg: 60 + ((serial * 37) % 360),
        status: deferred ? "Deferred" : failed ? "Not delivered" : "Delivered",
        deliveredAt: deferred || failed ? "—" : `${pad(hour)}:${pad((minute + late * 5) % 60)}`,
        delay: deferred || failed ? "—" : late === 0 ? "on time" : `+${late * 5} min`,
        note: deferred
          ? `Deferred to ${weekday(day + 1)} ${day + 1} · customer request`
          : failed
            ? FAIL_NOTES[serial % FAIL_NOTES.length]
            : "",
      })
    }
  }
  return list
}

/** Today (Sun 27): the finished route, plus live orders from the app. */
function todayEntries(orders: Order[]): LogEntry[] {
  const finished: LogEntry[] = [
    { stop: "1", shop: "Sunrise Mart", town: "Galle Fort", type: "Fresh", id: "ORD-1031", time: "06:30", deliveredAt: "07:10", delay: "+5 min", kg: 210, items: "6 crates" },
    { stop: "2", shop: "Lanka Super Stores", town: "Unawatuna", type: "Style", id: "ORD-1033", time: "06:30", deliveredAt: "07:55", delay: "+5 min", kg: 180, items: "5 boxes" },
    { stop: "3", shop: "Coastal Traders", town: "Weligama", type: "Tech", id: "ORD-1034", time: "06:30", deliveredAt: "08:40", delay: "on time", kg: 140, items: "4 boxes" },
    { stop: "4", shop: "Matara City Mart", town: "Matara", type: "Fresh", id: "ORD-1036", time: "06:30", deliveredAt: "09:50", delay: "+5 min", kg: 260, items: "8 crates" },
  ].map((e) => ({
    ...e,
    type: e.type as LogEntry["type"],
    day: 27,
    vehicle: "SP ND-4417",
    route: "Galle → Matara",
    status: "Delivered" as LogStatus,
    note: "",
  }))

  const live = orders
    .filter((o) => (o.dueDay ?? 27) === 27 || o.deferred)
    .map((o, i): LogEntry => {
      const status: LogStatus = o.deferred
        ? "Deferred"
        : o.stop
          ? i % 2 === 0
            ? "In transit"
            : "Scheduled"
          : "Not scheduled"
      return {
        day: 27,
        time: `${pad(8 + (i % 4))}:${pad((i * 17) % 60)}`,
        id: o.id,
        shop: o.shop,
        town: o.town,
        type: o.type as LogEntry["type"],
        vehicle: status === "In transit" ? "WP LB-4521" : status === "Scheduled" ? "WP LC-8870" : "—",
        route: status === "In transit" ? "Galle → Matara" : status === "Scheduled" ? "Galle → Weligama" : "—",
        stop: o.stop ? String(o.stop) : "—",
        items: o.items,
        kg: o.kg,
        status,
        deliveredAt: "—",
        delay: "—",
        note: o.deferred
          ? `Deferred${o.deferredTo ? ` to ${o.deferredTo}` : ""}${o.deferredNotice ? ` · ${o.deferredNotice}` : ""}`
          : o.emergency
            ? "Emergency order"
            : "",
      }
    })
  return [...finished, ...live]
}

const COLUMNS: { key: keyof LogEntry | "date" | "row"; label: string; width: number }[] = [
  { key: "date", label: "Date", width: 104 },
  { key: "time", label: "Time", width: 70 },
  { key: "id", label: "Order ID", width: 110 },
  { key: "status", label: "Status", width: 136 },
  { key: "shop", label: "Shop", width: 180 },
  { key: "town", label: "Town", width: 110 },
  { key: "type", label: "Type", width: 80 },
  { key: "vehicle", label: "Vehicle", width: 118 },
  { key: "route", label: "Route", width: 150 },
  { key: "stop", label: "Stop", width: 56 },
  { key: "items", label: "Items", width: 96 },
  { key: "kg", label: "kg", width: 64 },
  { key: "deliveredAt", label: "Delivered", width: 88 },
  { key: "delay", label: "Delay", width: 84 },
  { key: "note", label: "Note", width: 260 },
]

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

const STATUS_FILTERS: ("All" | "Completed" | "Not completed" | "Open")[] = [
  "All",
  "Completed",
  "Not completed",
  "Open",
]

function isCompleted(s: LogStatus) {
  return s === "Delivered"
}
function isFailed(s: LogStatus) {
  return s === "Not delivered"
}

function cellValue(e: LogEntry, key: (typeof COLUMNS)[number]["key"]) {
  if (key === "date") return `${weekday(e.day)} ${e.day} Sep`
  if (key === "row") return ""
  return String(e[key])
}

function statusClass(s: LogStatus) {
  return {
    Delivered: "log-status log-status--done",
    "Not delivered": "log-status log-status--failed",
    "In transit": "log-status log-status--transit",
    Scheduled: "log-status log-status--scheduled",
    "Not scheduled": "log-status log-status--open",
    Deferred: "log-status log-status--open",
  }[s]
}

function historyFor(e: LogEntry) {
  const submitted = { label: "Submitted by the store", when: `${weekday(e.day - 1)} ${e.day - 1} Sep · 15:${pad((e.kg * 3) % 60)}` }
  const steps: { label: string; when: string; state: "done" | "failed" | "todo" }[] = [
    { ...submitted, state: "done" },
  ]
  if (e.status === "Deferred") {
    steps.push({ label: e.note || "Deferred by dispatcher", when: `${weekday(e.day)} ${e.day} Sep`, state: "failed" })
    return steps
  }
  const scheduled = e.status !== "Not scheduled"
  steps.push({ label: scheduled ? `Scheduled on ${e.vehicle} · stop ${e.stop}` : "Waiting for a route", when: scheduled ? `${weekday(e.day)} ${e.day} Sep · ${e.time}` : "—", state: scheduled ? "done" : "todo" })
  const moving = ["In transit", "Delivered", "Not delivered"].includes(e.status)
  steps.push({ label: "Loaded and left the depot", when: moving ? e.time : "—", state: moving ? "done" : "todo" })
  if (e.status === "Delivered") steps.push({ label: `Delivered to ${e.shop} · ${e.delay}`, when: e.deliveredAt, state: "done" })
  else if (e.status === "Not delivered") steps.push({ label: `Not delivered · ${e.note}`, when: "—", state: "failed" })
  else steps.push({ label: `Delivery to ${e.shop}`, when: "—", state: "todo" })
  return steps
}

function toCsv(rows: LogEntry[]) {
  const head = COLUMNS.map((c) => c.label)
  const lines = rows.map((e) =>
    COLUMNS.map((c) => `"${cellValue(e, c.key).replace(/"/g, '""')}"`).join(","),
  )
  return [head.join(","), ...lines].join("\n")
}

export function OrderLogPage({
  orders,
  onOpenOrder,
}: {
  orders: Order[]
  onOpenOrder: (entry: LogEntry) => void
}) {
  const all = useMemo(
    () =>
      [...todayEntries(orders), ...pastEntries()].sort(
        (a, b) => b.day - a.day || b.time.localeCompare(a.time),
      ),
    [orders],
  )
  const [day, setDay] = useState<number | "all">(27)
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("All")
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<{ row: number; col: number } | null>({ row: 0, col: 2 })

  const rows = all.filter((e) => {
    if (day !== "all" && e.day !== day) return false
    if (statusFilter === "Completed" && !isCompleted(e.status)) return false
    if (statusFilter === "Not completed" && !isFailed(e.status)) return false
    if (statusFilter === "Open" && (isCompleted(e.status) || isFailed(e.status))) return false
    if (query) {
      const q = query.toLowerCase()
      return [e.id, e.shop, e.town, e.vehicle, e.route, e.note].some((v) => v.toLowerCase().includes(q))
    }
    return true
  })

  const days = [27, 26, 25, 24, 23, 22, 21].map((d) => {
    const list = all.filter((e) => e.day === d)
    return {
      day: d,
      total: list.length,
      done: list.filter((e) => isCompleted(e.status)).length,
      failed: list.filter((e) => isFailed(e.status)).length,
    }
  })

  const selectedEntry = selected ? rows[selected.row] : null
  const cellRef = selected ? `${LETTERS[selected.col]}${selected.row + 2}` : "A1"
  const cellText = selected && selectedEntry ? cellValue(selectedEntry, COLUMNS[selected.col].key) : "Date"

  const totals = {
    orders: rows.length,
    done: rows.filter((e) => isCompleted(e.status)).length,
    failed: rows.filter((e) => isFailed(e.status)).length,
    kg: rows.reduce((sum, e) => sum + e.kg, 0),
  }

  const exportCsv = () => {
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `waylink-order-log-${day === "all" ? "week" : `2026-09-${day}`}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="page page-enter">
      <div className="page-heading">
        <div>
          <PageTitle>Order log</PageTitle>
          <span className="step-subtitle">
            Every order · when, where, which route and whether it was completed
          </span>
        </div>
      </div>

      <div className="workspace-card order-log">
        {/* Side panel: history */}
        <aside className="order-log__side">
          <Heading>History</Heading>
          <UnstyledButton
            className={`log-day ${day === "all" ? "log-day--active" : ""}`}
            onClick={() => {
              setDay("all")
              setSelected(null)
            }}
          >
            <span>
              <strong>This week</strong>
              <small>Mon 21 – Sun 27 Sep</small>
            </span>
            <b className="data-text">{all.length}</b>
          </UnstyledButton>
          {days.map((d) => (
            <UnstyledButton
              className={`log-day ${day === d.day ? "log-day--active" : ""}`}
              key={d.day}
              onClick={() => {
                setDay(d.day)
                setSelected(null)
              }}
            >
              <span>
                <strong>
                  {weekday(d.day)} {d.day} Sep{d.day === 27 ? " · today" : ""}
                </strong>
                <small>
                  {d.done} completed
                  {d.failed ? ` · ${d.failed} not delivered` : ""}
                </small>
                <span className="log-day__bar">
                  <i style={{ width: `${d.total ? (d.done / d.total) * 100 : 0}%` }} />
                </span>
              </span>
              <b className="data-text">{d.total}</b>
            </UnstyledButton>
          ))}

          <div className="order-log__timeline">
            <strong>Order history</strong>
            {selectedEntry ? (
              <>
                <span className="order-log__timeline-id">
                  <span className="data-text">{selectedEntry.id}</span>
                  <ShopTag type={selectedEntry.type} />
                </span>
                <ol>
                  {historyFor(selectedEntry).map((step, i) => (
                    <li className={`log-step log-step--${step.state}`} key={i}>
                      {step.state === "done" ? (
                        <CheckCircle2 aria-hidden="true" size={18} />
                      ) : step.state === "failed" ? (
                        <XCircle aria-hidden="true" size={18} />
                      ) : (
                        <Circle aria-hidden="true" size={18} />
                      )}
                      <span>
                        <b>{step.label}</b>
                        <small className="data-text">{step.when}</small>
                      </span>
                    </li>
                  ))}
                </ol>
                <Button onClick={() => onOpenOrder(selectedEntry)} variant="secondary">
                  Open order details
                </Button>
              </>
            ) : (
              <small>Select a row in the log to see its history.</small>
            )}
          </div>
        </aside>

        {/* Sheet */}
        <div className="order-log__main">
          <div className="order-log__stats">
            <span>
              <PackageCheck aria-hidden="true" size={18} />
              <b className="data-text">{totals.orders}</b> orders
            </span>
            <span className="order-log__stat--done">
              <CheckCircle2 aria-hidden="true" size={18} />
              <b className="data-text">{totals.done}</b> completed
            </span>
            <span className="order-log__stat--failed">
              <XCircle aria-hidden="true" size={18} />
              <b className="data-text">{totals.failed}</b> not delivered
            </span>
            <span>
              <Truck aria-hidden="true" size={18} />
              <b className="data-text">{totals.orders - totals.done - totals.failed}</b> open
            </span>
            <span>
              <b className="data-text">{totals.kg.toLocaleString()}</b> kg
            </span>
          </div>

          <div className="order-log__toolbar">
            <label className="order-log__search">
              <Search aria-hidden="true" size={18} />
              <TextInput
                aria-label="Search the order log"
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search order ID, shop, town, vehicle, note…"
                value={query}
              />
            </label>
            <div className="order-filters">
              {STATUS_FILTERS.map((f) => (
                <UnstyledButton
                  className={statusFilter === f ? "order-filter order-filter--active" : "order-filter"}
                  key={f}
                  onClick={() => setStatusFilter(f)}
                >
                  {f}
                </UnstyledButton>
              ))}
            </div>
            <Button icon={Download} onClick={exportCsv} variant="secondary">
              Export CSV
            </Button>
          </div>

          <div className="formula-bar order-log__formula">
            <span>{cellRef}</span>
            <b>fx</b>
            <code>{cellText}</code>
            <em>
              {day === "all" ? "This week" : `${weekday(day)} ${day} Sep`} · {rows.length} rows ·
              double-click a row for order details
            </em>
          </div>

          <div className="sheet-scroll">
            <table className="sheet">
              <colgroup>
                <col style={{ width: 44 }} />
                {COLUMNS.map((c) => (
                  <col key={c.key} style={{ width: c.width }} />
                ))}
              </colgroup>
              <thead>
                <tr className="sheet__letters">
                  <th />
                  {COLUMNS.map((c, i) => (
                    <th className={selected?.col === i ? "sheet__letter--active" : ""} key={c.key}>
                      {LETTERS[i]}
                    </th>
                  ))}
                </tr>
                <tr className="sheet__head">
                  <th>1</th>
                  {COLUMNS.map((c) => (
                    <th key={c.key}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((e, r) => (
                  <tr
                    className={`${selected?.row === r ? "sheet__row--selected" : ""} ${
                      isFailed(e.status) ? "sheet__row--failed" : ""
                    }`}
                    key={`${e.id}-${e.day}`}
                    onDoubleClick={() => onOpenOrder(e)}
                  >
                    <th>{r + 2}</th>
                    {COLUMNS.map((c, col) => (
                      <td
                        className={`${selected?.row === r && selected.col === col ? "sheet__cell--active" : ""} ${
                          ["time", "id", "kg", "stop", "deliveredAt", "delay"].includes(c.key)
                            ? "data-text"
                            : ""
                        } ${c.key === "kg" || c.key === "stop" ? "sheet__num" : ""}`}
                        key={c.key}
                        onClick={() => setSelected({ row: r, col })}
                        title={cellValue(e, c.key)}
                      >
                        {c.key === "status" ? (
                          <span className={statusClass(e.status)}>
                            {isCompleted(e.status) ? "✓ " : isFailed(e.status) ? "✕ " : ""}
                            {e.status}
                          </span>
                        ) : c.key === "type" ? (
                          <ShopTag type={e.type} />
                        ) : (
                          cellValue(e, c.key)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="sheet__totals">
                  <th>{rows.length + 2}</th>
                  <td>Total</td>
                  <td />
                  <td>{totals.orders} orders</td>
                  <td>
                    {totals.done} ✓ · {totals.failed} ✕
                  </td>
                  <td colSpan={7} />
                  <td className="data-text sheet__num">{totals.kg.toLocaleString()}</td>
                  <td colSpan={3} />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}
