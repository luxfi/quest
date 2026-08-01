import React from 'react'
import Link from 'next/link'

export default function Page() {
  return (
    <main className='mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-10 px-6 py-16'>
      <header className='space-y-4'>
        <p className='text-xs uppercase tracking-[0.2em] text-white/40'>Lux</p>
        <h1 className='text-4xl font-semibold leading-tight sm:text-5xl'>Quest</h1>
        <p className='text-lg leading-relaxed text-white/70'>
          Build a scavenger hunt out of real places and send it to a friend. They walk the
          city to solve it — clue by clue, checking in when they arrive.
        </p>
      </header>

      <div className='flex flex-col gap-3 sm:flex-row'>
        <Link
          href='/create'
          className='rounded-lg bg-white px-6 py-3 text-center font-medium text-black transition hover:bg-white/90'
        >
          Make a quest
        </Link>
        <a
          href='#how'
          className='rounded-lg border border-white/20 px-6 py-3 text-center font-medium transition hover:border-white/40'
        >
          How it works
        </a>
      </div>

      <section id='how' className='space-y-5 border-t border-white/10 pt-8'>
        <h2 className='text-sm uppercase tracking-widest text-white/40'>How it works</h2>
        {/* Numbered because it genuinely is a sequence — make, send, walk. */}
        <ol className='space-y-4'>
          {[
            ['Pin the places', 'Drop stops on a map. Give each one a clue and a point value.'],
            ['Name a prize', 'Whatever you want to offer, in your own words.'],
            ['Send the link', 'The whole quest travels in the link. No accounts, nothing to install.'],
            ['They walk it', 'Each stop unlocks only when they actually get there.'],
          ].map(([title, body], i) => (
            <li key={title} className='flex gap-4'>
              <span className='mt-0.5 tabular-nums text-white/30'>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span>
                <span className='font-medium'>{title}</span>
                <span className='block text-white/60'>{body}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <p className='border-t border-white/10 pt-6 text-sm leading-relaxed text-white/40'>
        Prizes are between you and whoever you send it to — Lux Quest doesn&rsquo;t hold money
        or hand anything out. The quest lives in the link itself, so nobody needs an account
        and no copy is kept.
      </p>
    </main>
  )
}
