/**
 * A quest is a VALUE, not a database row.
 *
 * The whole hunt — name, prize, every stop — encodes into the share link, so
 * making one and sending it to a friend needs no account, no server and no
 * storage. The link IS the quest. That is why this module is pure: it has no
 * I/O to mock and no lifecycle to get wrong.
 *
 * It rides in the URL FRAGMENT (`/play#<code>`), never the query string. A
 * fragment is not sent to the server and does not appear in a Referer header,
 * so the places someone chose stay out of access logs and off any site they
 * click through to. That is a privacy property, not an implementation detail —
 * moving this to `?q=` would quietly publish every quest anyone shares.
 */

/** One place to find. */
export type Stop = {
  /** What the finder sees once they arrive. */
  name: string
  lat: number
  lng: number
  /** The riddle. This is the game — it is shown before arrival, the name is not. */
  clue: string
  /** Awarded on arrival. Harder clue, more points. */
  points: number
  /** How close counts as "here", in metres. */
  radius: number
}

export type Quest = {
  name: string
  /** Free text — where this hunt happens. Shown to the player before they start. */
  place: string
  /**
   * What the winner gets, in the maker's own words, plus how to claim it.
   *
   * Deliberately a STRING and not an escrow. Lux Quest does not hold value,
   * take payment, or promise to pay anyone: the maker offers something and the
   * two of them settle it however they like. Anything else is a custody
   * problem, and pretending otherwise in the UI would be a lie about what
   * happens when someone wins.
   */
  prize: string
  stops: Stop[]
  /** Hard mode: clues only, no pins on the map until a stop is found. */
  hidden: boolean
}

export const MAX_STOPS = 20

export function emptyQuest(): Quest {
  return { name: '', place: '', prize: '', stops: [], hidden: false }
}

export function totalPoints(q: Quest): number {
  return q.stops.reduce((sum, s) => sum + s.points, 0)
}

/**
 * The wire form uses one-letter keys and rounds coordinates to 5 decimals
 * (~1.1 m — far finer than any radius worth walking to). A share link is typed,
 * texted and scanned, so its length is a feature: the short keys and the
 * rounding together cut a ten-stop quest roughly in half.
 */
type WireStop = { n: string; a: number; o: number; c: string; p: number; r: number }
type WireQuest = { n: string; l: string; z: string; h?: 1; s: WireStop[] }

const coord = (n: number) => Math.round(n * 1e5) / 1e5

function toWire(q: Quest): WireQuest {
  const w: WireQuest = {
    n: q.name,
    l: q.place,
    z: q.prize,
    s: q.stops.map((s) => ({
      n: s.name,
      a: coord(s.lat),
      o: coord(s.lng),
      c: s.clue,
      p: s.points,
      r: s.radius,
    })),
  }
  // Omitted when false so the common case costs nothing.
  if (q.hidden) w.h = 1
  return w
}

function fromWire(w: WireQuest): Quest {
  return {
    name: String(w.n ?? ''),
    place: String(w.l ?? ''),
    prize: String(w.z ?? ''),
    hidden: w.h === 1,
    stops: (Array.isArray(w.s) ? w.s : []).map((s) => ({
      name: String(s?.n ?? ''),
      lat: Number(s?.a),
      lng: Number(s?.o),
      clue: String(s?.c ?? ''),
      points: Number(s?.p) || 0,
      radius: Number(s?.r) || DEFAULT_RADIUS,
    })),
  }
}

export const DEFAULT_RADIUS = 60

/** base64url — `+/=` are all punctuation a URL or a chat client will mangle. */
function b64urlEncode(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** Encode for the URL fragment. Unicode-safe: place names are not ASCII. */
export function encodeQuest(q: Quest): string {
  return b64urlEncode(new TextEncoder().encode(JSON.stringify(toWire(q))))
}

/**
 * Decode a share code. Returns null for anything that is not a quest.
 *
 * The code arrives from a stranger's link, so every failure mode — truncated in
 * a chat client, hand-edited, a different site's fragment — has to land on the
 * same honest "this link is not a quest" rather than a half-built quest or a
 * thrown error in render.
 */
export function decodeQuest(code: string): Quest | null {
  const trimmed = code.trim().replace(/^#/, '')
  if (!trimmed) return null
  try {
    const parsed = JSON.parse(new TextDecoder().decode(b64urlDecode(trimmed)))
    if (!parsed || typeof parsed !== 'object') return null
    const q = fromWire(parsed as WireQuest)
    // A quest with no findable stop is not a quest.
    const stops = q.stops.filter(
      (s) => Number.isFinite(s.lat) && Number.isFinite(s.lng) && Math.abs(s.lat) <= 90 && Math.abs(s.lng) <= 180,
    )
    if (stops.length === 0) return null
    return { ...q, stops }
  } catch {
    return null
  }
}
