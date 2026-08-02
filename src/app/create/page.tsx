'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import QuestMap from '../../components/quest-map'
import {
  emptyQuest,
  encodeQuest,
  totalPoints,
  DEFAULT_RADIUS,
  MAX_STOPS,
  type Quest,
  type Stop,
} from '../../lib/quest'

const field =
  'w-full rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 text-white ' +
  'placeholder:text-white/30 focus:border-white/40 focus:outline-none'

export default function CreatePage() {
  const [quest, setQuest] = useState<Quest>(emptyQuest)
  const [copied, setCopied] = useState(false)

  const set = <K extends keyof Quest>(k: K, v: Quest[K]) =>
    setQuest((q) => ({ ...q, [k]: v }))

  const addStop = (lat: number, lng: number) =>
    setQuest((q) =>
      q.stops.length >= MAX_STOPS
        ? q
        : {
            ...q,
            stops: [
              ...q.stops,
              { name: '', lat, lng, clue: '', points: 10, radius: DEFAULT_RADIUS },
            ],
          },
    )

  const editStop = (i: number, patch: Partial<Stop>) =>
    setQuest((q) => ({
      ...q,
      stops: q.stops.map((s, j) => (j === i ? { ...s, ...patch } : s)),
    }))

  const removeStop = (i: number) =>
    setQuest((q) => ({ ...q, stops: q.stops.filter((_, j) => j !== i) }))

  /**
   * The share link is derived, never stored — it is a pure function of the
   * quest, so it cannot drift from what is on screen.
   *
   * Built only in the browser: `location.origin` does not exist during the
   * static export, and guessing a host would bake a wrong domain into the page.
   */
  const link = useMemo(() => {
    if (quest.stops.length === 0) return ''
    const code = encodeQuest(quest)
    // The base path must be carried: on a GitHub project page the app lives at
    // /<repo>, so a link built as origin + /play points at a route that does
    // not exist there. It is empty on a root domain, which is the common case.
    const base = process.env.NEXT_PUBLIC_BASE_PATH || ''
    if (typeof window === 'undefined') return `${base}/play#${code}`
    return `${window.location.origin}${base}/play#${code}`
  }, [quest])

  const ready = quest.name.trim() !== '' && quest.stops.length > 0

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard is blocked without a user gesture in some browsers, and on
      // http. The input below is selectable, so there is always a way out.
    }
  }

  return (
    <main className='mx-auto w-full max-w-2xl flex-1 px-6 py-10'>
      <Link href='/' className='text-sm text-white/40 transition hover:text-white'>
        ← Lux Quest
      </Link>

      <h1 className='mt-6 text-3xl font-semibold'>Make a quest</h1>

      <div className='mt-8 space-y-4'>
        <label className='block'>
          <span className='mb-1.5 block text-sm text-white/60'>Name</span>
          <input
            className={field}
            value={quest.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder='Mission murals'
          />
        </label>

        <label className='block'>
          <span className='mb-1.5 block text-sm text-white/60'>Where</span>
          <input
            className={field}
            value={quest.place}
            onChange={(e) => set('place', e.target.value)}
            placeholder='San Francisco'
          />
        </label>

        <label className='block'>
          <span className='mb-1.5 block text-sm text-white/60'>
            Prize — what they get, and how to claim it
          </span>
          <textarea
            className={field}
            rows={2}
            value={quest.prize}
            onChange={(e) => set('prize', e.target.value)}
            placeholder='Coffee at Ritual, on me. Text me a photo of the last one.'
          />
          <span className='mt-1.5 block text-xs text-white/40'>
            You award this yourself — Lux Quest never holds money or hands anything out.
          </span>
        </label>
      </div>

      <section className='mt-10'>
        <div className='flex items-baseline justify-between'>
          <h2 className='text-sm uppercase tracking-widest text-white/40'>
            Stops {quest.stops.length > 0 && `· ${totalPoints(quest)} pts`}
          </h2>
          {quest.stops.length >= MAX_STOPS && (
            <span className='text-xs text-white/40'>Max {MAX_STOPS}</span>
          )}
        </div>

        <p className='mt-2 text-sm text-white/50'>Tap the map to drop a stop.</p>

        <QuestMap pins={quest.stops} onPick={addStop} className='mt-3' />

        <CoordinateEntry onAdd={addStop} disabled={quest.stops.length >= MAX_STOPS} />

        <ol className='mt-5 space-y-4'>
          {quest.stops.map((s, i) => (
            <li key={i} className='rounded-xl border border-white/10 p-4'>
              <div className='flex items-baseline justify-between'>
                <span className='text-sm font-medium text-white/50 tabular-nums'>
                  Stop {i + 1}
                </span>
                <button
                  onClick={() => removeStop(i)}
                  className='text-sm text-white/40 transition hover:text-white'
                >
                  Remove
                </button>
              </div>

              <div className='mt-3 space-y-3'>
                <input
                  className={field}
                  value={s.clue}
                  onChange={(e) => editStop(i, { clue: e.target.value })}
                  placeholder='Clue — this is what they see before they arrive'
                />
                <input
                  className={field}
                  value={s.name}
                  onChange={(e) => editStop(i, { name: e.target.value })}
                  placeholder='Answer — revealed once they get there'
                />
                <div className='flex gap-3'>
                  <label className='flex-1'>
                    <span className='mb-1 block text-xs text-white/50'>Points</span>
                    <input
                      type='number'
                      inputMode='numeric'
                      min={0}
                      className={field}
                      value={s.points}
                      onChange={(e) =>
                        editStop(i, { points: Math.max(0, Number(e.target.value) || 0) })
                      }
                    />
                  </label>
                  <label className='flex-1'>
                    <span className='mb-1 block text-xs text-white/50'>Radius (m)</span>
                    <input
                      type='number'
                      inputMode='numeric'
                      min={10}
                      className={field}
                      value={s.radius}
                      onChange={(e) =>
                        editStop(i, { radius: Math.max(10, Number(e.target.value) || DEFAULT_RADIUS) })
                      }
                    />
                  </label>
                </div>
                <p className='text-xs text-white/30 tabular-nums'>
                  {s.lat.toFixed(5)}, {s.lng.toFixed(5)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <label className='mt-8 flex items-start gap-3'>
        <input
          type='checkbox'
          className='mt-1'
          checked={quest.hidden}
          onChange={(e) => set('hidden', e.target.checked)}
        />
        <span>
          <span className='font-medium'>Hard mode</span>
          <span className='block text-sm text-white/50'>
            No pins on the map until a stop is found — the clue is all they get.
          </span>
        </span>
      </label>

      <section className='mt-10 border-t border-white/10 pt-8'>
        <h2 className='text-sm uppercase tracking-widest text-white/40'>Share it</h2>
        {ready ? (
          <>
            <div className='mt-3 flex gap-2'>
              <input
                readOnly
                value={link}
                onFocus={(e) => e.currentTarget.select()}
                className={`${field} font-mono text-xs`}
                aria-label='Share link'
              />
              <button
                onClick={copy}
                className='shrink-0 rounded-lg bg-white px-4 py-2 font-medium text-black transition hover:bg-white/90'
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className='mt-2 text-xs text-white/40'>
              The whole quest is inside this link. Keep a copy — there is no other one.
            </p>
            <a
              href={link}
              target='_blank'
              rel='noopener noreferrer'
              className='mt-4 inline-block text-sm underline underline-offset-4 hover:text-white'
            >
              Open it yourself first →
            </a>
          </>
        ) : (
          <p className='mt-3 text-sm text-white/50'>
            {quest.stops.length === 0 ? 'Add at least one stop.' : 'Give it a name.'}
          </p>
        )}
      </section>
    </main>
  )
}

/**
 * Adding a stop by hand.
 *
 * Not a fallback for a missing map key — it is also how someone pastes a
 * coordinate straight out of Google Maps, which is faster than hunting for the
 * same spot by eye.
 */
function CoordinateEntry({
  onAdd,
  disabled,
}: {
  onAdd: (lat: number, lng: number) => void
  disabled: boolean
}) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  const submit = () => {
    // Accepts "37.7749, -122.4194" — the format Google Maps puts on the
    // clipboard when you copy a dropped pin.
    const m = text.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/)
    if (!m) return setError('Paste as: 37.7749, -122.4194')
    const lat = Number(m[1])
    const lng = Number(m[2])
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return setError('That is not on the globe.')
    onAdd(lat, lng)
    setText('')
    setError('')
  }

  return (
    <div className='mt-3'>
      <div className='flex gap-2'>
        <input
          className={`${field} font-mono text-sm`}
          value={text}
          disabled={disabled}
          onChange={(e) => {
            setText(e.target.value)
            setError('')
          }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder='or paste coordinates: 37.7749, -122.4194'
          aria-label='Add a stop by coordinates'
        />
        <button
          onClick={submit}
          disabled={disabled}
          className='shrink-0 rounded-lg border border-white/20 px-4 py-2 transition hover:border-white/40 disabled:opacity-40'
        >
          Add
        </button>
      </div>
      {error && <p className='mt-1.5 text-xs text-red-400'>{error}</p>}
    </div>
  )
}
