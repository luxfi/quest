import { defineConfig, devices } from '@playwright/test'

const PORT = 4312

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'list' : [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    // A hunt is played outdoors on a phone, so that is what is tested.
    ...devices['Pixel 5'],
    trace: 'retain-on-failure',
  },
  webServer: {
    // Serve the real static export — the artifact that actually ships — rather
    // than a dev server, so what the tests drive is what a player gets.
    command: `npx next build && npx http-server out -p ${PORT} -s`,
    url: `http://127.0.0.1:${PORT}/index.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
