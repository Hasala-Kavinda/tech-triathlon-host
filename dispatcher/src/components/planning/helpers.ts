import { DAILY_TURN_LIMIT, OPEN_ORDER_EVENT } from "../../lib/constants";
import type { Order, Vehicle } from "../../types/dispatcher";
export const VEHICLE_DAY: Record<string, { turnsToday: number; volumeM3: number }> = {
  "WP PH-2210": { turnsToday: 1, volumeM3: 6 },
  "WP PK-7741": { turnsToday: 2, volumeM3: 6 },
  "WP LC-8870": { turnsToday: 0, volumeM3: 18 },
  "WP LE-1123": { turnsToday: 1, volumeM3: 30 },
  "WP LR-5006": { turnsToday: 0, volumeM3: 12 },
}
export function vehicleDay(v: Vehicle) {
  const known = VEHICLE_DAY[v.id]
  const fallbackVolume =
    v.type === "Van" ? 6 : v.type === "Refrigerated" ? 12 : v.capacityKg >= 3000 ? 30 : 18
  return {
    turnsToday: known?.turnsToday ?? 0,
    volumeM3: known?.volumeM3 ?? fallbackVolume,
  }
}
export function blockedReason(v: Vehicle) {
  if (isAtQuota(v)) return "Quota reached"
  if (isDayLimit(v)) return `Day limit · ${DAILY_TURN_LIMIT}/${DAILY_TURN_LIMIT} turns`
  return null
}
export function openOrderDetails(order: Order) {
  window.dispatchEvent(new CustomEvent<Order>(OPEN_ORDER_EVENT, { detail: order }))
}
export function orderRowOpenProps(order: Order) {
  return {
    role: "button" as const,
    tabIndex: 0,
    title: "Open order details",
    onClick: (e: React.MouseEvent<HTMLElement>) => {
      if ((e.target as HTMLElement).closest("button")) return
      openOrderDetails(order)
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key === "Enter" && e.target === e.currentTarget) openOrderDetails(order)
    },
  }
}
export const TOWN_POS: Record<string, { x: number; y: number }> = {
  "Galle Fort": { x: 70, y: 262 },
  Galle: { x: 92, y: 244 },
  Hikkaduwa: { x: 36, y: 170 },
  Baddegama: { x: 120, y: 120 },
  Unawatuna: { x: 150, y: 256 },
  Ahangama: { x: 225, y: 258 },
  Weligama: { x: 300, y: 248 },
  Mirissa: { x: 360, y: 258 },
  Matara: { x: 452, y: 250 },
  Imaduwa: { x: 250, y: 160 },
  Akuressa: { x: 405, y: 92 },
}
export function dayLabel(day: number) {
  const date = new Date(2026, 8, day)
  return {
    weekday: date.toLocaleString("en", { weekday: "short" }),
    short: `${date.toLocaleString("en", { weekday: "short" })} ${day} Sep`,
  }
}
export function pinsFor(list: Order[]) {
  const seen: Record<string, number> = {}
  const pins: Record<string, { x: number; y: number }> = {}
  list.forEach((o, i) => {
    const base = TOWN_POS[o.town] ?? { x: 120 + i * 70, y: 200 - (i % 2) * 40 }
    const n = seen[o.town] ?? 0
    seen[o.town] = n + 1
    pins[o.id] = { x: base.x + n * 22, y: base.y + n * 16 }
  })
  return pins
}
export function routeNameFor(list: Order[]) {
  const pins = pinsFor(list)
  if (!list.length) return "Galle"
  const far = list.reduce((a, b) => (pins[b.id].x > pins[a.id].x ? b : a))
  return `Galle → ${far.town}`
}
export function isAtQuota(v: Vehicle) {
  return v.turns >= v.turnQuota || v.km >= v.kmQuota
}
export function isDayLimit(v: Vehicle) {
  return vehicleDay(v).turnsToday >= DAILY_TURN_LIMIT
}
export function canGo(v: Vehicle) {
  return !isAtQuota(v) && !isDayLimit(v)
}
export function recordTurn(v: Vehicle) {
  const day = vehicleDay(v)
  VEHICLE_DAY[v.id] = { ...day, turnsToday: day.turnsToday + 1 }
}
export function orderVolume(o: Order) {
  const match = o.items.match(/(\d+)\s*(crate|box|bag|pallet)/i)
  if (!match) return Math.round((o.kg / 250) * 100) / 100
  const perUnit: Record<string, number> = { crate: 0.06, box: 0.04, bag: 0.03, pallet: 1.2 }
  return Math.round(Number(match[1]) * perUnit[match[2].toLowerCase()] * 100) / 100
}
export function volumeOf(list: Order[]) {
  return Math.round(list.reduce((sum, o) => sum + orderVolume(o), 0) * 10) / 10
}
export const ROUTE_EXTRAS_BY_DAY: Record<number, Order[]> = {
  27: [
    { id: "ORD-1061", shop: "Imaduwa Traders", town: "Imaduwa", type: "Tech", items: "5 boxes", kg: 140, emergency: false, inReach: true, suggested: true, dueDay: 28 },
    { id: "ORD-1064", shop: "Akuressa Food City", town: "Akuressa", type: "Fresh", items: "12 crates", kg: 180, emergency: false, inReach: true, suggested: true, dueDay: 28 },
    { id: "ORD-1066", shop: "Fort Book Corner", town: "Galle Fort", type: "Style", items: "3 boxes", kg: 60, emergency: false, inReach: true, suggested: true, dueDay: 30 },
  ] as Order[],
  28: [
    { id: "ORD-1080", shop: "Weligama Bay Stores", town: "Weligama", type: "Fresh", items: "9 crates", kg: 130, emergency: false, inReach: true, suggested: true, dueDay: 30 },
    { id: "ORD-1082", shop: "Unawatuna Beach Mart", town: "Unawatuna", type: "Style", items: "4 boxes", kg: 90, emergency: false, inReach: true, suggested: true, dueDay: 30 },
  ] as Order[],
}
