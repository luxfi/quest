import { test, expect, type Page } from '@playwright/test'

/**
 * The game loop, end to end, in a real browser: build a quest, share the link,
 * walk to a stop, find it.
 *
 * Geolocation is faked by Playwright rather than stubbed in the app, so the
 * production `navigator.geolocation` path and the real arrival maths both run.
 * A unit test cannot prove someone standing at Clarion Alley gets their point;
 * this can.
 */

const CLARION = { latitude: 37.76474, longitude: -122.42201 }
const BALMY = { latitude: 37.75218, longitude: -122.41213 }
/** A few blocks off — close enough to be plausible, far enough to be wrong. */
const NEARBY = { latitude: 37.7689, longitude: -122.4265 }

async function buildQuest(page: Page) {
  await page.goto('/create.html')
  await page.getByPlaceholder('Mission murals').fill('Mission murals')
  await page.getByPlaceholder('San Francisco').fill('San Francisco')
  await page.getByPlaceholder(/Coffee at Ritual/).fill('Coffee at Ritual, on me.')

  const coords = page.getByLabel('Add a stop by coordinates')
  for (const [pt, clue, answer] of [
    [CLARION, 'Where the walls argue back', 'Clarion Alley'],
    [BALMY, 'The oldest paint in the barrio', 'Balmy Alley'],
  ] as const) {
    await coords.fill(`${pt.latitude}, ${pt.longitude}`)
    await coords.press('Enter')
    const i = page.locator('li', { hasText: /^Stop/ }).last()
    await i.getByPlaceholder(/^Clue/).fill(clue)
    await i.getByPlaceholder(/^Answer/).fill(answer)
  }

  const link = await page.getByLabel('Share link').inputValue()
  expect(link).toContain('/play#')
  return link
}

test('a maker builds a quest and the link carries the whole thing', async ({ page }) => {
  const link = await buildQuest(page)

  // The quest travels in the FRAGMENT — never the query string, so it is not
  // sent to a server and cannot land in an access log.
  const url = new URL(link)
  expect(url.hash.length).toBeGreaterThan(20)
  expect(url.search).toBe('')

  await expect(page.getByText('20 pts', { exact: false })).toBeVisible()
})

test('a player walks to a stop and finds it', async ({ page, context }) => {
  const link = await buildQuest(page)
  await context.grantPermissions(['geolocation'])

  // Standing somewhere else in the Mission.
  await context.setGeolocation(NEARBY)
  await page.goto(link.replace(/^https?:\/\/[^/]+/, '') .replace('/play#', '/play.html#'))

  await expect(page.getByRole('heading', { name: 'Mission murals' })).toBeVisible()
  await expect(page.getByText('0 of 2 found')).toBeVisible()
  // The clue shows; the answer does not, until it is found.
  await expect(page.getByRole('paragraph').filter({ hasText: 'Where the walls argue back' })).toBeVisible()
  await expect(page.getByText('Clarion Alley')).toHaveCount(0)

  await page.getByRole('button', { name: "I'm here" }).click()
  await expect(page.getByText(/Not there yet/)).toBeVisible()
  await expect(page.getByText('0 of 2 found')).toBeVisible()

  // Now actually walk there.
  await context.setGeolocation(CLARION)
  await page.getByRole('button', { name: "I'm here" }).click()
  await expect(page.getByText(/Found it/)).toBeVisible()
  await expect(page.getByText('1 of 2 found')).toBeVisible()
  await expect(page.getByText('10/20 pts')).toBeVisible()
  // The answer is revealed only now. Scoped to the stop list: after a find the
  // name legitimately appears three times — the list, the status line, and the
  // map's link — and a loose locator would trip strict mode on correct output.
  await expect(
    page.getByRole('paragraph').filter({ hasText: /^Clarion Alley$/ }),
  ).toBeVisible()
})

test('progress survives closing the page', async ({ page, context }) => {
  const link = await buildQuest(page)
  const path = link.replace(/^https?:\/\/[^/]+/, '').replace('/play#', '/play.html#')
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation(CLARION)

  await page.goto(path)
  await page.getByRole('button', { name: "I'm here" }).click()
  await expect(page.getByText('1 of 2 found')).toBeVisible()

  await page.reload()
  await expect(page.getByText('1 of 2 found')).toBeVisible()
})

test('finishing every stop reveals the prize', async ({ page, context }) => {
  const link = await buildQuest(page)
  const path = link.replace(/^https?:\/\/[^/]+/, '').replace('/play#', '/play.html#')
  await context.grantPermissions(['geolocation'])

  await context.setGeolocation(CLARION)
  await page.goto(path)
  await page.getByRole('button', { name: "I'm here" }).click()
  await expect(page.getByText('1 of 2 found')).toBeVisible()

  await context.setGeolocation(BALMY)
  await page.getByRole('button', { name: "I'm here" }).click()

  await expect(page.getByRole('heading', { name: 'Quest complete' })).toBeVisible()
  await expect(page.getByText('Coffee at Ritual, on me.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'All found' })).toBeDisabled()
})

test('a mangled link says so instead of breaking', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.goto('/play.html#thisIsNotAQuest')
  await expect(page.getByRole('heading', { name: /not a quest/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /Make your own/ })).toBeVisible()
  expect(errors).toEqual([])
})

test('refusing location is explained, not silently ignored', async ({ page, context }) => {
  const link = await buildQuest(page)
  const path = link.replace(/^https?:\/\/[^/]+/, '').replace('/play#', '/play.html#')
  // Permission NOT granted — the browser will refuse.
  await context.clearPermissions()
  await page.goto(path)
  await page.getByRole('button', { name: "I'm here" }).click()

  // The one thing this screen must never do is nothing.
  await expect(page.getByText(/blocked|Could not get a location/i)).toBeVisible()
})

test('the whole app renders on a phone with no horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  for (const path of ['/index.html', '/create.html', '/play.html#x']) {
    await page.goto(path)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    )
    expect(overflow, `${path} scrolls sideways on a 390px phone`).toBe(false)
  }
})
