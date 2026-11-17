import { createServer } from 'vite'
import { chromium } from '@playwright/test'

// Separate dependency cache and browser profile: does not reset the normal dev cache.
const started = performance.now()
const server = await createServer({
  cacheDir: 'node_modules/.vite-startup-check',
  server: { host: '127.0.0.1', port: 0, strictPort: true, open: false },
})
let browser
try {
  await server.listen()
  console.log(`Development server ready: ${Math.round(performance.now() - started)} ms`)
  browser = await chromium.launch({
    executablePath:
      process.env.PLAYWRIGHT_CHROME_EXECUTABLE ||
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  })
  const page = await browser.newPage()
  const navigationStart = performance.now()
  const url = server.resolvedUrls?.local[0]
  if (!url) throw new Error('The startup-check server did not provide a URL')
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await page.getByText('Recent transactions', { exact: true }).waitFor({ timeout: 120_000 })
  await page.locator('.recharts-pie-sector').first().waitFor({ timeout: 120_000 })
  console.log(`Development overview ready: ${Math.round(performance.now() - navigationStart)} ms`)
} finally {
  await browser?.close()
  await server.close()
}
