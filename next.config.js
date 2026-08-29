const withGui = require('@hanzo/ui/next')

/**
 * BASE_PATH exists because a GitHub *project* page serves from
 * `/<repo>`, not from the root, and `output: 'export'` bakes asset URLs at
 * build time — so a root-built export 404s every chunk when served from a
 * sub-path. Set `BASE_PATH=/quest` for that host; leave it unset for a root
 * domain and for local dev, which is why it is an env var and not a constant.
 */
const basePath = process.env.BASE_PATH || ''

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath,
  // The share link is built from window.location.origin at runtime, so it
  // picks up the sub-path from the browser rather than needing this value.
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  typescript: {
    ignoreBuildErrors: true,
  },

  output: 'export',
  images: {
    unoptimized: true,
  },
  transpilePackages: [
    '@hanzo/auth',
    '@luxfi/data',
    '@luxfi/menu-icons',
  ],

}

module.exports = withGui(nextConfig, __dirname)
