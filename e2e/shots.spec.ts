import { test } from '@playwright/test'

/**
 * Screenshots of the real screens, at phone size, for review.
 * Not assertions — quest.spec.ts does the proving. This exists so a human can
 * LOOK at what renders instead of trusting a green run.
 */

const CLARION = { latitude: 37.76474, longitude: -122.42201 }
const BALMY = { latitude: 37.75218, longitude: -122.41213 }

test('screens', async ({ page, context }) => {
  await page.goto('/index.html')
  await page.screenshot({ path: 'e2e/shots/1-landing.png', fullPage: true })

  await page.goto('/create.html')
  await page.getByPlaceholder('Mission murals').fill('Mission murals')
  await page.getByPlaceholder('San Francisco').fill('San Francisco')
  await page
    .getByPlaceholder(/Coffee at Ritual/)
    .fill('Coffee at Ritual, on me. Text me a photo of the last one.')

  const coords = page.getByLabel('Add a stop by coordinates')
  for (const [pt, clue, answer] of [
    [CLARION, 'Where the walls argue back', 'Clarion Alley'],
    [BALMY, 'The oldest paint in the barrio', 'Balmy Alley'],
  ] as const) {
    await coords.fill(`${pt.latitude}, ${pt.longitude}`)
    await coords.press('Enter')
    const row = page.locator('li', { hasText: /^Stop/ }).last()
    await row.getByPlaceholder(/^Clue/).fill(clue)
    await row.getByPlaceholder(/^Answer/).fill(answer)
  }
  await page.screenshot({ path: 'e2e/shots/2-create.png', fullPage: true })

  const link = await page.getByLabel('Share link').inputValue()
  const path = link.replace(/^https?:\/\/[^/]+/, '').replace('/play#', '/play.html#')

  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 37.7689, longitude: -122.4265 })
  await page.goto(path)
  await page.getByRole('button', { name: "I'm here" }).click()
  await page.getByText(/Not there yet/).waitFor()
  await page.screenshot({ path: 'e2e/shots/3-playing.png', fullPage: true })

  await context.setGeolocation(CLARION)
  await page.getByRole('button', { name: "I'm here" }).click()
  await page.getByText('1 of 2 found').waitFor()
  await context.setGeolocation(BALMY)
  await page.getByRole('button', { name: "I'm here" }).click()
  await page.getByRole('heading', { name: 'Quest complete' }).waitFor()
  await page.screenshot({ path: 'e2e/shots/4-complete.png', fullPage: true })
})
