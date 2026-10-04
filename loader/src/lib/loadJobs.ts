import type { LoadRecord } from "../api/loads"
import type { ActiveStop, LoadCase, LoadItemData } from "../types/loader"

const ZONE = "Asia/Colombo"
const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" })

/** The Colombo calendar day containing this instant, as YYYY-MM-DD. */
export const colomboDate = (instant: Date) => dayFormat.format(instant)

export function addDays(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number)
  const value = new Date(Date.UTC(year, month - 1, day + days))
  return value.toISOString().slice(0, 10)
}

const clock = (value: string) => new Date(value).toLocaleTimeString("en-GB", { timeZone: ZONE, hour: "2-digit", minute: "2-digit" })

/**
 * One card for the Available Work list. A job another loader holds is shown as already
 * assigned; one this loader holds (claimed, loading or reconciled) as claimed by them.
 */
export function toLoadCase(record: LoadRecord, myUserId: string | undefined): LoadCase {
  const mine = record.claimedBy !== undefined && record.claimedBy === myUserId
  const state: LoadCase["state"] =
    record.status === "available" ? "available"
      : record.status === "confirmed" ? (mine ? "completed" : "completed-other")
        : mine ? "claimed" : "unavailable"
  const trip = record.trip
  const weightKg = trip?.totals?.weightKg
  return {
    tripId: record.tripId,
    version: record.version,
    recordStatus: record.status,
    departure: trip ? clock(trip.departureAt) : "—",
    items: record.items.length,
    // The backend does not rank load jobs, so none is marked urgent here.
    priority: "normal",
    route: trip?.tripNumber ?? record.tripId,
    state,
    stops: trip?.stops.length ?? 0,
    vehicle: trip?.vehicleId ?? "Unassigned",
    weight: weightKg ? `${Math.round(weightKg).toLocaleString()} kg` : "—",
    timing: {
      receivedAt: Date.parse(record.createdAt),
      departureAt: trip ? Date.parse(trip.departureAt) : Date.parse(record.createdAt),
    },
    planChanges: record.planChanges ?? [],
  }
}

/**
 * The open load, grouped by delivery stop. Stops are listed in reverse stop sequence: the
 * last delivery is loaded first so the first delivery is nearest the doors.
 */
export function toActiveStops(record: LoadRecord): ActiveStop[] {
  const stops = record.trip?.stops ?? []
  const byStop = new Map(stops.map((stop) => [stop.tripStopId, stop]))
  const grouped = new Map<string, LoadRecord["items"]>()
  for (const item of record.items) grouped.set(item.tripStopId, [...(grouped.get(item.tripStopId) ?? []), item])
  return [...grouped.entries()]
    .map(([tripStopId, items]) => {
      const stop = byStop.get(tripStopId)
      return {
        stopNumber: stop?.sequence ?? 0,
        outlet: stop?.outletId ?? "Unknown stop",
        deliveryWindow: stop?.plannedArrivalAt ? clock(stop.plannedArrivalAt) : "—",
        orderId: String(items[0]?.orderIds[0] ?? ""),
        items: items.map(toLoadItem),
      }
    })
    .sort((a, b) => b.stopNumber - a.stopNumber)
}

function toLoadItem(item: LoadRecord["items"][number]): LoadItemData {
  const status: LoadItemData["status"] = item.status === "pending" ? "pending" : item.status === "loaded" ? "loaded" : "flagged"
  return {
    id: item.itemId,
    name: item.name,
    quantity: String(item.expectedQuantity),
    status,
    ...(item.exception
      ? { exception: { type: item.exception.type, affectedQuantity: item.exception.quantity, reason: item.exception.reasonCode.split("_").join(" "), ...(item.exception.note ? { note: item.exception.note } : {}), pendingSync: false, unit: "units" } }
      : {}),
  }
}
