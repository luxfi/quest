/**
 * Distance on the ground, and the one question the game asks: am I there yet?
 *
 * Pure — no geolocation API, no React. The browser supplies a position, this
 * decides what it means, so the rule that awards points is testable without a
 * device and without standing somewhere.
 */

const EARTH_RADIUS_M = 6_371_008.8 // IUGG mean radius

const rad = (deg: number) => (deg * Math.PI) / 180

/**
 * Great-circle distance in metres (haversine).
 *
 * Haversine treats the earth as a sphere, which is wrong by up to ~0.5%. At the
 * scale that matters here — tens of metres — that is centimetres, far below GPS
 * noise, so the extra cost of an ellipsoidal formula buys nothing real.
 */
export function distance(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * Whether a reading counts as arriving at a stop.
 *
 * `accuracy` is the browser's own error estimate in metres, and it is ADDED to
 * the stop's radius rather than ignored. A phone indoors or between tall
 * buildings routinely reports ±50 m; holding it to the bare radius means
 * someone standing at the right door is told they are not there, which is the
 * one failure that makes the game feel broken. Being generous costs a player
 * nothing — the prize is the maker's to award — while being strict costs them
 * the walk.
 *
 * A missing or absurd accuracy is treated as zero rather than trusted, so a
 * device claiming ±10 km cannot unlock a whole city from the sofa.
 */
export const MAX_TRUSTED_ACCURACY_M = 200

export function arrived(
  here: { lat: number; lng: number; accuracy?: number },
  stop: { lat: number; lng: number; radius: number },
): boolean {
  const slack =
    Number.isFinite(here.accuracy) && (here.accuracy as number) > 0
      ? Math.min(here.accuracy as number, MAX_TRUSTED_ACCURACY_M)
      : 0
  return distance(here, stop) <= stop.radius + slack
}

/** Metres for a nearby stop, kilometres once it is a walk. */
export function formatDistance(m: number): string {
  if (!Number.isFinite(m)) return '—'
  if (m < 1000) return `${Math.round(m)} m`
  return `${(m / 1000).toFixed(m < 10_000 ? 1 : 0)} km`
}
