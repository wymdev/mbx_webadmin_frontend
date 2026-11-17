import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:5174',
    headless: true,
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROME_EXECUTABLE ||
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
    },
    viewport: { width: 1440, height: 1050 },
    screenshot: 'only-on-failure',
  },
  reporter: 'list',
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5174 --strictPort',
        url: 'http://127.0.0.1:5174',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
})
