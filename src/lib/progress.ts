/**
 * What this player has found, kept on this device.
 *
 * Progress is deliberately local. The quest itself lives in the link, so there
 * is no account to attach a score to and nothing to sync; keeping it in
 * localStorage means a hunt survives a locked screen and a closed tab, which is
 * the whole of what a walk actually needs.
 *
 * Keyed by a hash of the share code, so two different quests never collide and
 * editing a quest starts a clean run rather than inheriting the old one's
 * finds — a stop that moved is not a stop that was found.
 */

const PREFIX = 'lux.quest.'

/** FNV-1a. Not cryptographic — this only has to be stable and short. */
function key(code: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < code.length; i++) {
    h ^= code.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return PREFIX + (h >>> 0).toString(36)
}

export type Progress = {
  /** Indices of found stops. An index, not a name — names repeat. */
  found: number[]
  /** ms since epoch of the first find; null until the hunt starts. */
  startedAt: number | null
}

const EMPTY: Progress = { found: [], startedAt: null }

/**
 * Every read is defensive. localStorage throws in private mode on some
 * browsers, can hold another version's shape, and is editable by hand — none of
 * which should ever stop someone playing. A bad read reads as "nothing found
 * yet", which is the honest fallback and the one that loses nothing real.
 */
export function load(code: string): Progress {
  if (typeof window === 'undefined') return EMPTY
  try {
    const raw = window.localStorage.getItem(key(code))
    if (!raw) return EMPTY
    const p = JSON.parse(raw)
    const found = Array.isArray(p?.found)
      ? [...new Set(p.found.filter((n: unknown) => Number.isInteger(n) && (n as number) >= 0))]
      : []
    return {
      found: found as number[],
      startedAt: Number.isFinite(p?.startedAt) ? p.startedAt : null,
    }
  } catch {
    return EMPTY
  }
}

export function save(code: string, p: Progress): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key(code), JSON.stringify(p))
  } catch {
    // A full or disabled store must not interrupt a hunt in progress.
  }
}

/** Records a find. Idempotent — arriving twice is one find, not two. */
export function markFound(prev: Progress, index: number): Progress {
  if (prev.found.includes(index)) return prev
  return {
    found: [...prev.found, index],
    startedAt: prev.startedAt ?? Date.now(),
  }
}

export function clear(code: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(key(code))
  } catch {
    /* nothing to undo */
  }
}
