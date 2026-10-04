/** Pure helpers for the Dispatcher's live-tracking view. */

export type TrackingState = "live" | "delayed" | "gps_gap" | "offline_unknown" | "completed"

/** Same thresholds the dispatcher monitor list has always used. */
export const LIVE_MAX_SECONDS = 120
export const DELAYED_MAX_SECONDS = 600

export function trackingState(tripStatus: string, ageSeconds: number | null): TrackingState {
  if (tripStatus === "completed") return "completed"
  if (ageSeconds === null) return "offline_unknown"
  if (ageSeconds <= LIVE_MAX_SECONDS) return "live"
  if (ageSeconds <= DELAYED_MAX_SECONDS) return "delayed"
  return "gps_gap"
}

export interface LatLng { latitude: number; longitude: number }

export function haversineMeters(a: LatLng, b: LatLng) {
  const rad = (deg: number) => (deg * Math.PI) / 180
  const dLat = rad(b.latitude - a.latitude)
  const dLng = rad(b.longitude - a.longitude)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h))
}

export interface PlaceCandidate { district: string; coordinates?: LatLng | undefined }

/**
 * Human-readable "near <place>" label. There is no geocoder in the system and outlets are known by district,
 * so: the district of the closest outlet that has real coordinates (within 25 km); otherwise the district of the
 * next stop the driver is heading to ("towards <district>"); otherwise null (the UI shows raw coordinates).
 */
export function nearLabel(position: LatLng | null, outlets: PlaceCandidate[], nextStopDistrict?: string | null) {
  if (!position) return null
  let best: { district: string; meters: number } | null = null
  for (const outlet of outlets) {
    if (!outlet.coordinates || outlet.coordinates.latitude == null || outlet.coordinates.longitude == null) continue
    const meters = haversineMeters(position, outlet.coordinates)
    if (!best || meters < best.meters) best = { district: outlet.district, meters }
  }
  if (best && best.meters <= 25_000) return `near ${best.district}`
  if (nextStopDistrict) return `towards ${nextStopDistrict}`
  return null
}
