export interface LatLng {
  lat: number;
  lng: number;
}

export const ARRIVAL_RADIUS_METERS = 150;

/**
 * Calculates great-circle distance between two coordinates in meters using the Haversine formula.
 */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371000; // Earth's mean radius in meters
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;

  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

/**
 * Formats straight-line distance in meters:
 * - Under 1000 m: rounded to nearest 10 m (e.g. "≈ 450 m")
 * - 1000 m and above: in kilometers with 1 decimal (e.g. "≈ 1.2 km")
 * Always prefixed with approximate symbol '≈' as specified.
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    const rounded = Math.round(meters / 10) * 10;
    return `≈ ${rounded} m`;
  }
  const km = (meters / 1000).toFixed(1);
  return `≈ ${km} km`;
}
