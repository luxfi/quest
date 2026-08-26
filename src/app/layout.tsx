import React, { type PropsWithChildren } from 'react'
import type { Viewport, Metadata } from 'next'
import { Hanzo } from '@hanzo/ui'

// The Hanzo theme: every design token the components read, plus the `.hz-prose`
// rules. A real stylesheet the package ships, so nothing generates CSS at build
// time.
import '@hanzo/ui/theme.css'
// The atomic rules gui compiles its style props against. <Hanzo> imports this
// itself, but a bundler that will not follow a CSS import out of node_modules
// drops it silently — which is a fully unstyled page behind a green build.
import '@hanzo/ui/styles.css'
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
  // html and body stay host elements — they are the document, not components,
  // and their ground and ink are stated in globals.css from the theme's own
  // tokens rather than as utility classes needing an engine to resolve them.
  return (
    <html lang="en" className="dark">
      <body>
        {/* gui needs its config in context before anything mounts. Without it
            the prerender dies with a minified code naming no component. */}
        <Hanzo theme="dark">{children}</Hanzo>
      </body>
    </html>
  )
}
