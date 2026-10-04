export interface CandidateDriver { _id: unknown; name: string; depot?: string | undefined }
export interface BusyTrip { driverId: unknown; departureAt: Date; plannedEndAt?: Date | null | undefined }

const same = (a: unknown, b: unknown) => String(a) === String(b)

/**
 * Chooses the Driver for a new trip. Policy (decided with the Dispatcher team):
 *   1. only Drivers based at the vehicle's depot (never cross-depot),
 *   2. who have no overlapping trip in [start, end),
 *   3. the one with the fewest trips that day, so work spreads across Drivers (ties: by name).
 * `allowOtherDepots` is the development-phase escape hatch: when nobody at the depot qualifies, any
 * free Driver may be used (the caller reports that). Returns undefined when nobody qualifies.
 */
export function pickDriver(
  drivers: readonly CandidateDriver[],
  tripsThatDay: readonly BusyTrip[],
  window: { start: Date; end: Date },
  options: { depot: string; allowOtherDepots?: boolean },
): { driver: CandidateDriver; otherDepot: boolean } | undefined {
  const overlaps = (trip: BusyTrip) => trip.departureAt < window.end && (trip.plannedEndAt ?? trip.departureAt) > window.start
  const load = (driver: CandidateDriver) => tripsThatDay.filter((t) => same(t.driverId, driver._id)).length
  const free = (driver: CandidateDriver) => !tripsThatDay.some((t) => same(t.driverId, driver._id) && overlaps(t))
  const best = (list: readonly CandidateDriver[]) =>
    [...list].filter(free).sort((a, b) => load(a) - load(b) || a.name.localeCompare(b.name))[0]

  const local = best(drivers.filter((d) => d.depot === options.depot))
  if (local) return { driver: local, otherDepot: false }
  if (!options.allowOtherDepots) return undefined
  const other = best(drivers)
  return other ? { driver: other, otherDepot: true } : undefined
}
