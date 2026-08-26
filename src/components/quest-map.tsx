'use client'

import { Box } from '@hanzo/ui'
import React, { useEffect, useRef, useState } from 'react'
import { loadMaps, MAPS_KEY, mapPlaceUrl, type MapsStatus } from '../lib/maps'
import type { Stop } from '../lib/quest'

export type Pin = Stop & { found?: boolean }

type Props = {
  pins: Pin[]
  /** Where to look when there are no pins yet. */
  center?: { lat: number; lng: number }
  /** Builder mode: clicking the map drops a stop. */
  onPick?: (lat: number, lng: number) => void
  /** Applied in every state — margins, width. */
  className?: string
  /**
   * Applied ONLY to the rendered map, which needs a fixed height because it has
   * no intrinsic one. The fallback must NOT inherit it: a list of two stops in a
   * 288px box is a screenful of dead space with the page's primary action
   * stranded in the middle of it.
   */
  height?: string
}

const SF = { lat: 37.7749, lng: -122.4194 }

/**
 * The map.
 *
 * Google is loaded once, here, and everything above this component deals in
 * plain lat/lng. When there is no key — a fork, a local checkout, a preview
 * build — this renders a real, usable list instead of a grey rectangle: every
 * stop still has a link that opens Google Maps in a new tab, so the hunt is
 * playable without the JS API at all. A missing key degrades the map, never
 * the game.
 */
export default function QuestMap({ pins, center, onPick, className = '', height = 'h-72' }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const markers = useRef<any[]>([])
  const [status, setStatus] = useState<MapsStatus>(MAPS_KEY ? 'loading' : 'no-key')

  // Load once.
  useEffect(() => {
    if (!MAPS_KEY) return
    let alive = true
    loadMaps()
      .then(() => alive && setStatus('ready'))
      .catch((e: Error) => alive && setStatus(e.message === 'no-key' ? 'no-key' : 'failed'))
    return () => {
      alive = false
    }
  }, [])

  // Create the map once the API is in.
  useEffect(() => {
    if (status !== 'ready' || !host.current || map.current) return
    const g = (window as any).google
    map.current = new g.maps.Map(host.current, {
      center: center ?? pins[0] ?? SF,
      zoom: pins.length ? 14 : 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      // A dark map so a bright pin reads at a glance in sunlight.
      styles: DARK,
    })
  }, [status, center, pins])

  // Clicking to add a stop, in builder mode.
  useEffect(() => {
    if (status !== 'ready' || !map.current || !onPick) return
    const listener = map.current.addListener('click', (e: any) => {
      onPick(e.latLng.lat(), e.latLng.lng())
    })
    return () => listener?.remove?.()
  }, [status, onPick])

  // Redraw pins whenever they change.
  useEffect(() => {
    if (status !== 'ready' || !map.current) return
    const g = (window as any).google
    markers.current.forEach((m) => m.setMap(null))
    markers.current = pins.map(
      (p, i) =>
        new g.maps.Marker({
          position: { lat: p.lat, lng: p.lng },
          map: map.current,
          // Number the stops so the map and the list read as one thing.
          label: { text: String(i + 1), color: '#000', fontWeight: '700' },
          title: p.found ? p.name : p.clue,
          icon: {
            path: g.maps.SymbolPath.CIRCLE,
            scale: 14,
            fillColor: p.found ? '#4ade80' : '#ffffff',
            fillOpacity: 1,
            strokeWeight: 0,
          },
        }),
    )
    // Frame everything, but never zoom so far into a single pin that there is
    // no context around it.
    if (pins.length > 1) {
      const b = new g.maps.LatLngBounds()
      pins.forEach((p) => b.extend({ lat: p.lat, lng: p.lng }))
      map.current.fitBounds(b, 64)
    } else if (pins.length === 1) {
      map.current.setCenter(pins[0])
      map.current.setZoom(15)
    }
  }, [pins, status])

  if (status === 'ready') {
    return <Box ref={host} className={`w-full rounded-xl overflow-hidden ${height} ${className}`} />
  }

  return (
    <Box
      className={`w-full rounded-xl border border-white/15 bg-white/[0.03] p-4 ${className}`}
      role='region'
      aria-label='Stops'
    >
      <Box tag="p" className='text-sm text-white/60'>
        {status === 'loading' && 'Loading the map…'}
        {status === 'no-key' && 'No map key configured — the stops and links below all work.'}
        {status === 'failed' && 'The map failed to load. The stops and links below all work.'}
      </Box>
      {pins.length > 0 && (
        <Box tag="ol" className='mt-3 grid grid-cols-1 gap-2'>
          {pins.map((p, i) => (
            <Box tag="li" key={i} className='grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-2 text-sm'>
              <Box tag="span" className='text-white/40 tabular-nums'>{i + 1}.</Box>
              <Box tag="a"
                href={mapPlaceUrl(p.lat, p.lng)}
                target='_blank'
                rel='noopener noreferrer'
                className='underline underline-offset-2 hover:text-white'
              >
                {p.found ? p.name : p.clue || 'Open in Google Maps'}
              </Box>
            </Box>
          ))}
        </Box>
      )}
      {onPick && (
        <Box tag="p" className='mt-3 text-xs text-white/40'>
          Without a map key you can still add stops by pasting coordinates below.
        </Box>
      )}
    </Box>
  )
}

/** Enough to darken the map; not a whole theme. */
const DARK = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#2c2c2c' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
]
