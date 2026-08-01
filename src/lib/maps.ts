/**
 * The one place that loads Google Maps.
 *
 * Everything else in the app talks to a Quest and a position; only this module
 * knows Google exists. That keeps the game logic testable without a network and
 * leaves one seam to cut if the map ever changes vendor.
 */

export const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? ''

export type MapsStatus = 'ready' | 'loading' | 'no-key' | 'failed'

let pending: Promise<void> | null = null

/**
 * Loads the Maps JS API once per page.
 *
 * Two failures are told apart on purpose, because they need different answers
 * from a human:
 *
 *   no-key  — nobody configured NEXT_PUBLIC_GOOGLE_MAPS_KEY. Nothing is broken;
 *             the build simply has no key. The UI says so and stays usable.
 *   failed  — a key exists and Google still refused (billing off, referrer not
 *             allowed, offline). That is a real fault and worth surfacing.
 *
 * Collapsing both into "map unavailable" is how a missing environment variable
 * gets mistaken for an outage for an afternoon.
 */
export function loadMaps(): Promise<void> {
  if (!MAPS_KEY) return Promise.reject(new Error('no-key'))
  if (typeof window === 'undefined') return Promise.reject(new Error('no-window'))
  if ((window as any).google?.maps) return Promise.resolve()
  if (pending) return pending

  pending = new Promise<void>((resolve, reject) => {
    const el = document.createElement('script')
    el.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(MAPS_KEY)}` +
      `&libraries=places&loading=async&v=weekly`
    el.async = true
    el.onload = () => resolve()
    el.onerror = () => {
      // Let a later attempt retry rather than caching the failure forever.
      pending = null
      reject(new Error('failed'))
    }
    document.head.appendChild(el)
  })
  return pending
}

/** A Google Maps link anyone can open, with or without a key configured. */
export function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

export function mapPlaceUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
}
