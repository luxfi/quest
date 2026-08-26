'use client'

import { Box } from '@hanzo/ui'
import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import QuestMap from '../../components/quest-map'
import { decodeQuest, totalPoints, type Quest } from '../../lib/quest'
import { arrived, distance, formatDistance } from '../../lib/geo'
import { load, save, markFound, clear, type Progress } from '../../lib/progress'
import { directionsUrl } from '../../lib/maps'

type Fix = { lat: number; lng: number; accuracy?: number }

export default function PlayPage() {
  const [code, setCode] = useState<string | null>(null)
  const [quest, setQuest] = useState<Quest | null>(null)
  const [progress, setProgress] = useState<Progress>({ found: [], startedAt: null })
  const [fix, setFix] = useState<Fix | null>(null)
  const [checking, setChecking] = useState(false)
  const [message, setMessage] = useState('')

  /**
   * The quest arrives in the fragment, which only exists client-side — this is
   * a static export, so there is no server that ever sees it. That is the
   * point: a shared hunt never lands in an access log.
   */
  useEffect(() => {
    const raw = window.location.hash.slice(1)
    setCode(raw)
    const q = decodeQuest(raw)
    setQuest(q)
    if (q && raw) setProgress(load(raw))
  }, [])

  const found = useMemo(() => new Set(progress.found), [progress])

  const pins = useMemo(() => {
    if (!quest) return []
    // Hard mode hides a stop until it is found, so the map cannot give the
    // answer away.
    return quest.stops
      .map((s, i) => ({ ...s, found: found.has(i), index: i }))
      .filter((s) => !quest.hidden || s.found)
  }, [quest, found])

  const score = useMemo(
    () => (quest ? quest.stops.reduce((n, s, i) => n + (found.has(i) ? s.points : 0), 0) : 0),
    [quest, found],
  )

  const complete = quest != null && found.size === quest.stops.length

  /**
   * Ask the device where it is, then decide.
   *
   * The decision lives in geo.arrived, not here — this function only turns a
   * browser callback into a position. Refusing permission, or a device with no
   * fix, has to say so plainly: "check in" that silently does nothing is the
   * single worst thing this screen could do to someone standing in the right
   * place.
   */
  const checkIn = () => {
    if (!quest || !code) return
    if (!('geolocation' in navigator)) {
      setMessage('This browser cannot share your location.')
      return
    }
    setChecking(true)
    setMessage('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setChecking(false)
        const here: Fix = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }
        setFix(here)

        const hit = quest.stops.findIndex((s, i) => !found.has(i) && arrived(here, s))
        if (hit === -1) {
          const nearest = quest.stops
            .map((s, i) => ({ i, d: distance(here, s) }))
            .filter(({ i }) => !found.has(i))
            .sort((a, b) => a.d - b.d)[0]
          setMessage(
            nearest
              ? `Not there yet — closest stop is ${formatDistance(nearest.d)} away.`
              : 'Every stop is already found.',
          )
          return
        }
        const next = markFound(progress, hit)
        setProgress(next)
        save(code, next)
        setMessage(`Found it — ${quest.stops[hit].name || `stop ${hit + 1}`}.`)
      },
      (err) => {
        setChecking(false)
        setMessage(
          err.code === err.PERMISSION_DENIED
            ? 'Location is blocked. Allow it in your browser settings to check in.'
            : 'Could not get a location fix. Try again in the open.',
        )
      },
      // A hunt needs the real GPS, and a cached fix from an hour ago is how
      // someone "arrives" at a stop they are nowhere near.
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    )
  }

  if (quest === null) {
    return (
      <Box tag="main" className='mx-auto w-full max-w-2xl flex-1 px-6 py-16'>
        <Link href='/' className='quiet'>
          ← Lux Quest
        </Link>
        <Box tag="h1" className='mt-6 text-2xl font-semibold'>
          {code === null ? 'Loading…' : 'This link is not a quest'}
        </Box>
        {code !== null && (
          <>
            <Box tag="p" className='mt-3 text-white/60'>
              It may have been cut short when it was shared — links break when they wrap in
              a message. Ask for the whole thing again.
            </Box>
            <Link
              href='/create'
              className='cta mt-6'
            >
              Make your own
            </Link>
          </>
        )}
      </Box>
    )
  }

  return (
    <Box tag="main" className='mx-auto w-full max-w-2xl flex-1 px-6 py-10'>
      <Link href='/' className='quiet'>
        ← Lux Quest
      </Link>

      <Box tag="header" className='mt-6'>
        <Box tag="h1" className='text-3xl font-semibold'>{quest.name || 'Untitled quest'}</Box>
        {quest.place && <Box tag="p" className='mt-1 text-white/50'>{quest.place}</Box>}
        <Box tag="p" className='mt-3 tabular-nums text-white/60'>
          {found.size} of {quest.stops.length} found · {score}/{totalPoints(quest)} pts
        </Box>
      </Box>

      {complete && (
        <Box tag="section" className='mt-6 rounded-xl border border-green-500/30 bg-green-500/10 p-5'>
          <Box tag="h2" className='text-lg font-semibold'>Quest complete</Box>
          <Box tag="p" className='mt-1 text-white/70'>You found every stop — {score} points.</Box>
          {quest.prize && (
            <>
              <Box tag="p" className='mt-4 text-sm uppercase tracking-widest text-white/40'>The prize</Box>
              <Box tag="p" className='mt-1 whitespace-pre-wrap'>{quest.prize}</Box>
              <Box tag="p" className='mt-3 text-xs text-white/40'>
                Claim it with whoever sent you this. Lux Quest doesn&rsquo;t hold or hand out
                prizes.
              </Box>
            </>
          )}
        </Box>
      )}

      <QuestMap pins={pins} className='mt-6' />

      <Box className='sticky bottom-4 z-10 mt-6'>
        <Box tag="button"
          onClick={checkIn}
          disabled={checking || complete}
          className='w-full rounded-lg bg-white px-6 py-4 text-lg font-medium text-black shadow-lg transition hover:bg-white/90 disabled:opacity-50'
        >
          {complete ? 'All found' : checking ? 'Getting your location…' : "I'm here"}
        </Box>
        {message && (
          <Box tag="p" aria-live='polite' className='mt-2 text-center text-sm text-white/70'>
            {message}
          </Box>
        )}
      </Box>

      <Box tag="ol" className='mt-8 flex flex-col gap-3'>
        {quest.stops.map((s, i) => {
          const got = found.has(i)
          const away = fix ? distance(fix, s) : null
          return (
            <Box tag="li"
              key={i}
              className={`rounded-xl border p-4 ${
                got ? 'border-green-500/30 bg-green-500/[0.06]' : 'border-white/10'
              }`}
            >
              <Box className='flex items-baseline justify-between gap-3'>
                <Box tag="span" className='text-sm tabular-nums text-white/40'>
                  {String(i + 1).padStart(2, '0')}
                </Box>
                <Box tag="span" className='text-sm tabular-nums text-white/40'>{s.points} pts</Box>
              </Box>
              <Box tag="p" className='mt-1.5 font-medium'>{got ? s.name || 'Found' : s.clue || 'No clue given'}</Box>
              {got && s.clue && <Box tag="p" className='mt-1 text-sm text-white/50'>{s.clue}</Box>}
              <Box className='mt-2 flex items-center gap-4 text-sm'>
                {away !== null && !got && (
                  <Box tag="span" className='tabular-nums text-white/40'>{formatDistance(away)} away</Box>
                )}
                {/* Directions are given only once a stop is found, or when the
                    maker chose a guided hunt — otherwise this link is the
                    answer to the clue. */}
                {(got || !quest.hidden) && (
                  <Box tag="a"
                    href={directionsUrl(s.lat, s.lng)}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='underline underline-offset-2 text-white/60 hover:text-white'
                  >
                    Directions
                  </Box>
                )}
              </Box>
            </Box>
          )
        })}
      </Box>

      {found.size > 0 && (
        <button
          onClick={() => {
            if (!code) return
            clear(code)
            setProgress({ found: [], startedAt: null })
            setMessage('')
          }}
          className='mt-8 text-sm text-white/30 transition hover:text-white/60'
        >
          Start over
        </button>
      )}
    </Box>
  )
}
