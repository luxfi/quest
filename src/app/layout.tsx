import React, { type PropsWithChildren } from 'react'
import type { Viewport, Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Lux Quest',
  description:
    'Build a scavenger hunt out of real places and send it to a friend. They walk the city to solve it.',
}

export const viewport: Viewport = {
  // A hunt is played on a phone, one-handed, outdoors.
  width: 'device-width',
  initialScale: 1,
  // Deliberately no maximumScale: pinch-zoom is how someone reads a clue in
  // bright sun, and locking it out is an accessibility regression.
  themeColor: '#000000',
}

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang='en' className='dark'>
      <body className='bg-black text-white flex flex-col min-h-full'>{children}</body>
    </html>
  )
}
