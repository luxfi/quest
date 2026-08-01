import { describe, it, expect } from 'vitest'
import { encodeQuest, decodeQuest, emptyQuest, totalPoints, DEFAULT_RADIUS, type Quest } from './quest'
import { distance, arrived, formatDistance, MAX_TRUSTED_ACCURACY_M } from './geo'
import { load, save, markFound, clear, type Progress } from './progress'

const sample: Quest = {
  name: 'Mission murals',
  place: 'San Francisco',
  prize: 'Coffee at Ritual, on me. Text me a photo of the last one.',
  hidden: false,
  stops: [
    { name: 'Clarion Alley', lat: 37.76474, lng: -122.42201, clue: 'Where the walls argue back', points: 10, radius: 60 },
    { name: 'Balmy Alley', lat: 37.75218, lng: -122.41213, clue: 'The oldest paint in the barrio', points: 20, radius: 45 },
  ],
}

describe('quest codec', () => {
  it('round-trips a quest through a share code', () => {
    const back = decodeQuest(encodeQuest(sample))
    expect(back).not.toBeNull()
    expect(back!.name).toBe(sample.name)
    expect(back!.prize).toBe(sample.prize)
    expect(back!.stops).toHaveLength(2)
    expect(back!.stops[1].clue).toBe('The oldest paint in the barrio')
  })

  it('keeps coordinates accurate to about a metre', () => {
    const back = decodeQuest(encodeQuest(sample))!
    // 5dp is ~1.1m. Anything coarser would be visible against a 45m radius.
    expect(distance(back.stops[0], sample.stops[0])).toBeLessThan(2)
  })

  it('survives names and clues that are not ASCII', () => {
    const q: Quest = {
      ...sample,
      name: '東京クエスト',
      stops: [{ ...sample.stops[0], name: 'Café Ubuntu — Ñoño', clue: '🗼 look up' }],
    }
    const back = decodeQuest(encodeQuest(q))!
    expect(back.name).toBe('東京クエスト')
    expect(back.stops[0].name).toBe('Café Ubuntu — Ñoño')
    expect(back.stops[0].clue).toBe('🗼 look up')
  })

  it('produces a code safe to paste in a URL', () => {
    expect(encodeQuest(sample)).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('carries hard mode', () => {
    expect(decodeQuest(encodeQuest({ ...sample, hidden: true }))!.hidden).toBe(true)
    expect(decodeQuest(encodeQuest(sample))!.hidden).toBe(false)
  })

  it('tolerates a leading # from a raw location.hash', () => {
    expect(decodeQuest('#' + encodeQuest(sample))).not.toBeNull()
  })

  // A share code arrives from a stranger's link. Every one of these is a real
  // way a link gets mangled, and none may throw during render.
  it.each([
    ['empty', ''],
    ['whitespace', '   '],
    ['not base64', '!!!!'],
    ['base64 of nonsense', btoa('hello world')],
    ['base64 of a non-quest object', btoa('{"a":1}')],
    ['truncated mid-code', encodeQuest(sample).slice(0, 12)],
    ['a JSON array', btoa('[1,2,3]')],
  ])('returns null for %s rather than throwing', (_label, code) => {
    expect(decodeQuest(code)).toBeNull()
  })

  it('rejects a quest whose stops are off the globe', () => {
    const broken = { n: 'x', l: '', z: '', s: [{ n: 'a', a: 999, o: 999, c: '', p: 1, r: 10 }] }
    expect(decodeQuest(btoa(JSON.stringify(broken)))).toBeNull()
  })

  it('defaults a missing radius instead of producing an unreachable stop', () => {
    const wire = { n: 'x', l: '', z: '', s: [{ n: 'a', a: 37.7, o: -122.4, c: 'c', p: 5 }] }
    const q = decodeQuest(btoa(JSON.stringify(wire)))!
    expect(q.stops[0].radius).toBe(DEFAULT_RADIUS)
  })

  it('sums points', () => {
    expect(totalPoints(sample)).toBe(30)
    expect(totalPoints(emptyQuest())).toBe(0)
  })
})

describe('geo', () => {
  it('measures a known distance', () => {
    // Clarion Alley to Balmy Alley is a bit over 1.5 km on the ground.
    const d = distance(sample.stops[0], sample.stops[1])
    expect(d).toBeGreaterThan(1400)
    expect(d).toBeLessThan(1800)
  })

  it('is zero at the same point and symmetric', () => {
    expect(distance(sample.stops[0], sample.stops[0])).toBe(0)
    expect(distance(sample.stops[0], sample.stops[1])).toBeCloseTo(
      distance(sample.stops[1], sample.stops[0]), 6,
    )
  })

  it('counts arrival inside the radius', () => {
    const stop = sample.stops[0]
    expect(arrived({ lat: stop.lat, lng: stop.lng }, stop)).toBe(true)
  })

  it('does not count a stop across town', () => {
    expect(arrived(sample.stops[1], sample.stops[0])).toBe(false)
  })

  it('forgives GPS error, so standing at the door counts', () => {
    const stop = { ...sample.stops[0], radius: 20 }
    // 40 m away — outside a 20 m radius, but the phone admits to ±50 m.
    const near = { lat: stop.lat + 0.00036, lng: stop.lng }
    expect(arrived(near, stop)).toBe(false)
    expect(arrived({ ...near, accuracy: 50 }, stop)).toBe(true)
  })

  it('will not let a wildly inaccurate reading unlock the city', () => {
    const stop = { ...sample.stops[0], radius: 20 }
    // 5 km away with a claimed accuracy of 50 km.
    const far = { lat: stop.lat + 0.045, lng: stop.lng, accuracy: 50_000 }
    expect(arrived(far, stop)).toBe(false)
    expect(MAX_TRUSTED_ACCURACY_M).toBeLessThan(1000)
  })

  it('formats for humans', () => {
    expect(formatDistance(42)).toBe('42 m')
    expect(formatDistance(1500)).toBe('1.5 km')
    expect(formatDistance(42_000)).toBe('42 km')
    expect(formatDistance(NaN)).toBe('—')
  })
})

describe('progress', () => {
  const code = encodeQuest(sample)
  const other = encodeQuest({ ...sample, name: 'A different hunt' })

  it('starts empty and persists a find', () => {
    clear(code)
    expect(load(code).found).toEqual([])
    save(code, markFound(load(code), 1))
    expect(load(code).found).toEqual([1])
  })

  it('counts one find once, however many times you arrive', () => {
    clear(code)
    let p: Progress = load(code)
    p = markFound(p, 0)
    const first = p.startedAt
    p = markFound(p, 0)
    expect(p.found).toEqual([0])
    expect(p.startedAt).toBe(first)
  })

  it('keeps two quests apart', () => {
    clear(code); clear(other)
    save(code, markFound(load(code), 0))
    expect(load(other).found).toEqual([])
  })

  it('reads hand-edited storage as an unstarted hunt rather than crashing', () => {
    window.localStorage.clear()
    save(code, markFound(load(code), 0))
    // Corrupt the row this quest actually wrote. Storage keys are reachable
    // only through key(i) — Object.keys does not enumerate a Storage — and
    // after the clear above there is exactly one.
    const stored = window.localStorage.key(0)
    expect(stored).toBeTruthy()
    window.localStorage.setItem(stored as string, '{{{not json')

    // Anything could be in here; a player must still be able to play.
    expect(() => load(code)).not.toThrow()
    expect(load(code).found).toEqual([])
  })

  it('ignores a stored shape that is not progress', () => {
    window.localStorage.clear()
    save(code, markFound(load(code), 0))
    const stored = window.localStorage.key(0) as string
    // Valid JSON, wrong shape — the arm that a bare try/catch would miss.
    window.localStorage.setItem(stored, JSON.stringify({ found: 'all of them' }))
    expect(load(code).found).toEqual([])
  })
})
