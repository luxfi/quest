import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // The codec uses btoa/atob and progress uses localStorage — both are
    // browser APIs, and both are exactly what these tests pin.
    environment: 'happy-dom',
    // Node 22's own experimental `localStorage` global takes the name before
    // either DOM environment can install one, so window.localStorage is
    // undefined under jsdom AND happy-dom. The setup file supplies a real
    // Storage; see src/test-setup.ts for why that is the environment's fault
    // and not the code's.
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
