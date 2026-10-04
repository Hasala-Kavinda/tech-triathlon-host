/**
 * Human-readable route label, derived on read from fields trips already have (no stored route name):
 *   "Peliyagoda → Colombo · Colombo 02"
 *   origin      = the trip's depot
 *   destination = district of the stops' outlets (a trip is single-district)
 *   name        = "<District> <NN>", NN = the trip's position among that day's trips by departure time
 * The trip number stays available as a secondary reference; other roles keep showing it as the main ID.
 */
export type LabelTrip = { tripNumber: string; depot: string; serviceDate: string; stops: Array<{ outletId: string }> }
export type DayTrip = { tripNumber: string; departureAt: string; status: string }
export type RouteLabel = { origin: string; destination: string; name: string; title: string }

const CANCELLED_OR_DRAFT = new Set(["draft", "cancelled"])

export function routeLabel(trip: LabelTrip, districtOf: (outletId: string) => string | undefined, tripsThatDay: readonly DayTrip[]): RouteLabel {
  const districts = [...new Set(trip.stops.map((s) => districtOf(s.outletId)).filter((d): d is string => Boolean(d)))]
  const destination = districts.length ? districts.join(" / ") : "Unknown district"
  const ordered = tripsThatDay
    .filter((t) => !CANCELLED_OR_DRAFT.has(t.status))
    .sort((a, b) => a.departureAt.localeCompare(b.departureAt) || a.tripNumber.localeCompare(b.tripNumber))
  const position = ordered.findIndex((t) => t.tripNumber === trip.tripNumber) + 1
  const name = `${districts[0] ?? "Route"} ${String(position || ordered.length + 1).padStart(2, "0")}`
  return { origin: trip.depot, destination, name, title: `${trip.depot} → ${destination} · ${name}` }
}
