import { Box } from '@hanzo/ui'
import React from 'react'
import Link from 'next/link'

export default function Page() {
  return (
    <Box tag="main" className='mx-auto grid grid-cols-1 w-full max-w-2xl justify-center gap-10 px-6 py-16'>
      <Box tag="header" className='grid grid-cols-1 gap-4'>
        <Box tag="p" className='text-xs uppercase tracking-[0.2em] text-white/40'>Lux</Box>
        <Box tag="h1" className='text-4xl font-semibold leading-tight sm:text-5xl'>Quest</Box>
        <Box tag="p" className='text-lg leading-relaxed text-white/70'>
          Build a scavenger hunt out of real places and send it to a friend. They walk the
          city to solve it — clue by clue, checking in when they arrive.
        </Box>
      </Box>

      <Box className='grid grid-cols-1 gap-3 sm:grid-flow-col sm:auto-cols-auto'>
        <Link
          href='/create'
          className='cta'
        >
          Make a quest
        </Link>
        <Box tag="a"
          href='#how'
          className='rounded-lg border border-white/20 px-6 py-3 text-center font-medium transition hover:border-white/40'
        >
          How it works
        </Box>
      </Box>

      <Box tag="section" id='how' className='grid grid-cols-1 gap-5 border-t border-white/10 pt-8'>
        <Box tag="h2" className='text-sm uppercase tracking-widest text-white/40'>How it works</Box>
        {/* Numbered because it genuinely is a sequence — make, send, walk. */}
        <Box tag="ol" className='grid grid-cols-1 gap-4'>
          {[
            ['Pin the places', 'Drop stops on a map. Give each one a clue and a point value.'],
            ['Name a prize', 'Whatever you want to offer, in your own words.'],
            ['Send the link', 'The whole quest travels in the link. No accounts, nothing to install.'],
            ['They walk it', 'Each stop unlocks only when they actually get there.'],
          ].map(([title, body], i) => (
            <Box tag="li" key={title} className='grid grid-cols-[auto_minmax(0,1fr)] gap-4'>
              <Box tag="span" className='mt-0.5 tabular-nums text-white/30'>
                {String(i + 1).padStart(2, '0')}
              </Box>
              <span>
                <Box tag="span" className='font-medium'>{title}</Box>
                <Box tag="span" className='block text-white/60'>{body}</Box>
              </span>
            </Box>
          ))}
        </Box>
      </Box>

      <Box tag="p" className='border-t border-white/10 pt-6 text-sm leading-relaxed text-white/40'>
        Prizes are between you and whoever you send it to — Lux Quest doesn&rsquo;t hold money
        or hand anything out. The quest lives in the link itself, so nobody needs an account
        and no copy is kept.
      </Box>
    </Box>
  )
}
