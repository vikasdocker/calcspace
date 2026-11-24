import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from 'playwright-core'
import { createServer } from 'vite'

const executable = process.env.CALCSPACE_BROWSER ?? [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find(path => existsSync(path))
if (!executable) throw new Error('Set CALCSPACE_BROWSER to the executable path of Chrome, Edge or Chromium.')

const server = process.env.CALCSPACE_TEST_URL ? null : await createServer({ server: { port: 5178, strictPort: false } })
let browser
try {
  await server?.listen()
  const base = new URL(process.env.CALCSPACE_TEST_URL ?? server.resolvedUrls.local[0]).origin
  browser = await chromium.launch({ executablePath: executable, headless: true })
  await verifyDesktop(browser, base)
  await verifyResponsive(browser, base)
} finally {
  await browser?.close()
  await server?.close()
}

function issues(page) {
  const found = []
  page.on('pageerror', error => found.push(error.message))
  page.on('console', message => { if (message.type() === 'error') found.push(message.text()) })
  return found
}

async function open(page, base, path) {
  const response = await page.goto(new URL(path, base).href, { waitUntil: 'domcontentloaded' })
  assert.equal(response?.status(), 200, `HTTP status for ${path}`)
  await page.locator('main h1').waitFor({ timeout: 8000 })
}

async function output(page) {
  const result = page.locator('.primary-result output')
  return result.innerText({ timeout: 6500 })
}

async function verifyDesktop(browser, base) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, colorScheme: 'light' })
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base })
  const page = await context.newPage()
  page.setDefaultTimeout(6500)
  const errors = issues(page)
  await open(page, base, '/')
  assert.match(await page.locator('main h1').innerText(), /Every calculation/)
  await screenshot(page, 'home-desktop')
  const categoryRoutes = await page.locator('.category-card').evaluateAll(links => links.map(link => link.pathname))
  assert.equal(new Set(categoryRoutes).size, 8)

  await page.keyboard.press('Control+k')
  const quickSearch = page.getByRole('combobox', { name: 'Quick search' })
  assert.equal(await quickSearch.evaluate(input => input === document.activeElement), true)
  await quickSearch.fill('home loan')
  await page.getByRole('option', { name: /Home Loan Calculator/ }).waitFor()
  assert.equal(await page.getByRole('option', { name: /Loan EMI Calculator/ }).count(), 1)
  await quickSearch.press('ArrowDown')
  await quickSearch.press('Enter')
  await page.waitForURL('**/home-loan-calculator')

  await open(page, base, '/')
  const heroSearch = page.getByRole('combobox', { name: 'Search all calculators' })
  await heroSearch.fill('guntha')
  await page.getByRole('option', { name: /Acre to Guntha/ }).click()
  await page.waitForURL('**/acre-to-guntha')

  await open(page, base, '/calculators')
  const calculatorRoutes = await page.locator('.calculator-card .card-link').evaluateAll(links => links.map(link => link.pathname))
  assert.equal(new Set(calculatorRoutes).size, 105)
  const search = page.getByRole('searchbox', { name: 'Filter calculators' })
  await search.fill('salary')
  await page.waitForURL('**/calculators?q=salary')
  assert.match(await page.locator('.card-grid').innerText(), /Salary Hike Calculator/)
  assert.match(await page.locator('.card-grid').innerText(), /CTC to In-Hand Salary/)
  await page.getByLabel('Filter by category').selectOption('health')
  await page.getByText('No calculators found').waitFor()
  await page.getByLabel('Filter by category').selectOption('finance')
  await page.getByLabel('Sort calculators').selectOption('za')
  const sorted = await page.locator('.calculator-card h3').allTextContents()
  assert.ok(sorted.length >= 2)
  assert.deepEqual(sorted, sorted.toSorted((a,b) => b.localeCompare(a)))

  const titles = new Set()
  const descriptions = new Set()
  for (const path of calculatorRoutes) {
    try {
      await open(page, base, path)
      const heading = await page.locator('main h1').innerText()
      assert.equal(await page.title(), `${heading} | CalcSpace`)
      titles.add(await page.title())
      descriptions.add(await page.locator('meta[name="description"]').getAttribute('content'))
      assert.equal(await page.getByRole('heading', { name: 'Worked example' }).count(), 1)
      assert.equal(await page.getByRole('heading', { name: 'Related calculators' }).count(), 1)
      const expression = page.getByLabel('Expression', { exact: true })
      if (await expression.count()) {
        const example = await expression.getAttribute('placeholder')
        assert.ok(example)
        await expression.fill(example)
      }
      await page.getByRole('button', { name: 'Calculate', exact: true }).click()
      const calculated = await output(page)
      assert.ok(calculated.trim())
      assert.doesNotMatch(calculated, /^(NaN|Infinity)$/)
      assert.equal(await page.getByRole('alert').count(), 0)
      if (path.endsWith('/regex-tester')) assert.equal(calculated, '2')
      if (path.endsWith('/password-generator')) assert.equal(calculated.length, 20)
      if (path.endsWith('/sha-256-hash-generator')) assert.equal(calculated, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    } catch (error) {
      throw new Error(`Calculator smoke test failed at ${path}`, { cause: error })
    }
  }
  assert.equal(titles.size, calculatorRoutes.length)
  assert.equal(descriptions.size, calculatorRoutes.length)

  for (const path of categoryRoutes) {
    await open(page, base, path)
    assert.ok(await page.locator('.calculator-card').count() > 0)
  }
  for (const path of ['/categories/daily-life', '/categories/date-time']) {
    await open(page, base, path)
    assert.equal(await page.locator('a[href="/calculators/age-calculator"]').count(), 1)
  }

  await open(page, base, '/calculators/scientific-calculator')
  const expression = page.getByLabel('Expression', { exact: true })
  await expression.fill('sqrt(81) + 2')
  await expression.press('Enter')
  assert.equal(await output(page), '11')
  await page.getByRole('button', { name: 'Copy result' }).click()
  await page.getByRole('button', { name: 'Copied' }).waitFor()
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'Answer: 11')
  await page.getByRole('button', { name: 'Share link' }).click()
  await page.getByRole('button', { name: 'Link copied' }).waitFor()
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), base + '/calculators/scientific-calculator')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await page.getByRole('button', { name: '2', exact: true }).click()
  await page.getByRole('button', { name: 'Evaluate expression' }).click()
  assert.equal(await output(page), '13')
  await screenshot(page, 'scientific-desktop')
  await page.getByRole('button', { name: 'Reset' }).click()
  assert.equal(await expression.inputValue(), '')
  await expression.fill('1/0')
  await expression.press('Enter')
  assert.match(await page.getByRole('alert').innerText(), /Division by zero/)
  await expression.press('Escape')
  assert.equal(await expression.inputValue(), '')
  await page.getByRole('button', { name: 'Save to favorites', exact: true }).click()
  await page.getByRole('button', { name: 'Switch to dark mode' }).click()
  await page.reload()
  await page.getByRole('button', { name: 'Remove from favorites', exact: true }).waitFor()
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark')
  await page.getByRole('link', { name: 'Favorites', exact: true }).click()
  await page.getByRole('heading', { name: 'Scientific Calculator' }).waitFor()

  await open(page, base, '/converters/length-converter')
  await page.getByRole('button', { name: 'Swap units' }).click()
  assert.equal(await page.getByLabel('From', { exact: true }).inputValue(), 'm')
  assert.equal(await page.getByLabel('To', { exact: true }).inputValue(), 'ft')
  await page.getByRole('button', { name: 'Calculate' }).click()
  assert.equal(await output(page), '32.8083989501 ft')

  await open(page, base, '/calculators/regex-tester')
  await page.getByLabel('Pattern', { exact: true }).fill('[')
  await page.getByRole('button', { name: 'Calculate' }).click()
  assert.match(await page.getByRole('alert').innerText(), /regular expression/i)
  await page.getByLabel('Pattern', { exact: true }).fill('(a+)+$')
  await page.getByLabel('Test text').fill('a'.repeat(1000) + '!')
  await page.getByRole('button', { name: 'Calculate' }).click()
  assert.match(await page.getByRole('alert').innerText(), /took too long/)
  await page.getByRole('button', { name: 'Reset' }).click()
  await page.getByRole('button', { name: 'Calculate' }).click()
  assert.equal(await output(page), '2')

  await page.getByRole('link', { name: 'Calculation history' }).click()
  await page.getByRole('heading', { name: 'History', exact: true }).waitFor()
  assert.match(await page.locator('.history-list').innerText(), /Answer · 13/)
  assert.doesNotMatch(await page.locator('.history-list').innerText(), /Password Generator|SHA-256 Hash Generator|Regex Tester|JSON Formatter/)
  await page.getByRole('button', { name: 'Clear history', exact: true }).click()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  assert.ok(await page.locator('.history-list li').count() > 0)
  await page.getByRole('button', { name: 'Clear history', exact: true }).click()
  await page.getByRole('button', { name: 'Clear all' }).click()
  await page.getByText('No saved results yet').waitFor()
  await page.getByText('No recent calculators').waitFor()

  await open(page, base, '/missing-calculator-route')
  assert.equal(await page.locator('main h1').textContent(), 'Page not found')
  const robots = await (await page.request.get(base + '/robots.txt')).text()
  const sitemap = await (await page.request.get(base + '/sitemap.xml')).text()
  assert.match(robots, /User-agent: \*/)
  assert.equal((sitemap.match(/<loc>/g) ?? []).length, 115)
  assert.ok(!sitemap.includes('/history</loc>'))
  assert.deepEqual(errors, [], 'Browser console and page errors')
  await context.close()
  process.stdout.write(`Checked ${calculatorRoutes.length} calculator routes and results, ${categoryRoutes.length} category routes, search, persistence, clipboard and SEO files.\n`)
}

async function screenshot(page, name) {
  const directory = process.env.CALCSPACE_SCREENSHOTS
  if (!directory) return
  await mkdir(directory, { recursive: true })
  await page.screenshot({ path: join(directory, name + '.png') })
}

async function verifyResponsive(browser, base) {
  const context = await browser.newContext({ colorScheme: 'dark' })
  const page = await context.newPage()
  const errors = issues(page)
  for (const width of [320,390,768,1024,1440]) {
    await page.setViewportSize({ width, height: 870 })
    for (const path of ['/','/calculators','/calculators/scientific-calculator','/calculators/india-income-tax-estimator']) {
      await open(page, base, path)
      const viewport = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, available: document.documentElement.clientWidth }))
      assert.ok(viewport.content <= viewport.available + 1, `Horizontal overflow at ${width}px on ${path}`)
      if (width === 390 && path === '/') await screenshot(page, 'home-mobile-dark')
      if (width === 390 && path === '/calculators/india-income-tax-estimator') await screenshot(page, 'tax-mobile-dark')
    }
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page, base, '/')
  await page.getByRole('button', { name: 'Open navigation' }).click()
  const menu = page.getByRole('dialog', { name: 'Navigation' })
  await menu.getByRole('link', { name: 'Health & Fitness', exact: true }).click()
  await page.waitForURL('**/health-fitness')
  assert.equal(await menu.isVisible(), false)
  await page.getByRole('link', { name: /BMI Calculator/ }).click()
  await page.getByRole('button', { name: 'Calculate' }).click()
  assert.match(await output(page), /^23\.51/)
  assert.deepEqual(errors, [], 'Responsive browser console and page errors')
  await context.close()
  process.stdout.write('Checked responsive layouts at 320, 390, 768, 1024 and 1440 px, and mobile navigation and calculation.\n')
}
