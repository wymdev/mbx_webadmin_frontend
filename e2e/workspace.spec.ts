import { test, expect } from '@playwright/test'

test('overview loads without requesting the optional ECharts view', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (request) => requests.push(request.url()))
  const started = Date.now()
  await page.goto('/')
  await expect(page.getByText('Recent transactions', { exact: true })).toBeVisible()
  await expect(page.locator('.recharts-pie-sector').first()).toBeVisible()
  expect(requests.some((url) => url.includes('rate-chart') || url.includes('echarts'))).toBe(false)
  console.log(`Overview ready in ${Date.now() - started} ms (fresh browser context)`)
})

test('rate order supports dragging, keyboard and move controls', async ({ page }) => {
  await page.goto('/rates')
  await expect(page.getByText('A clearer way to work', { exact: true })).toHaveCount(0)
  await expect(page.locator('tbody tr').first()).toContainText('THB / MMK')
  await page
    .getByRole('button', { name: 'Reorder rate-1', exact: true })
    .dragTo(page.locator('tbody tr').nth(2))
  await expect(page.locator('tbody tr').first()).toContainText('USD / MMK')
  await expect(page.locator('tbody tr').nth(2)).toContainText('THB / MMK')
  await page.getByRole('button', { name: 'Reorder rate-1', exact: true }).focus()
  await page.keyboard.press('ArrowUp')
  await expect(page.locator('tbody tr').nth(1)).toContainText('THB / MMK')
  await page.getByRole('button', { name: 'Move THB up', exact: true }).click()
  await expect(page.locator('tbody tr').first()).toContainText('THB / MMK')
  await page.getByRole('textbox', { name: 'Search currency or country…' }).fill('Singapore')
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Reorder rate-3', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Move SGD up', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Move SGD down', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Clear view to reorder', exact: true }).click()
  await expect(page.locator('tbody tr')).toHaveCount(4)
  await page.screenshot({ path: 'test-results/rates-ordering.png', fullPage: true })
})

test('desktop navigation, table search, pagination, virtual mode and dark theme', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible()
  await expect(page.getByText('Recent transactions', { exact: true })).toBeVisible()
  await expect(page.locator('.recharts-pie-sector').first()).toBeVisible()
  await page.screenshot({ path: 'test-results/overview-desktop.png', fullPage: true })
  await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click()
  await expect(page.locator('.app-layout')).toHaveClass(/sidebar-collapsed/)
  await page.getByRole('button', { name: 'Expand sidebar', exact: true }).click()
  await page.getByRole('link', { name: 'Transactions Ledger' }).click()
  await expect(page.getByRole('heading', { name: 'Transactions', exact: true })).toBeVisible()
  await expect(page.getByText('Page 1 of 84')).toBeVisible()
  await page.getByRole('button', { name: 'Next page', exact: true }).click()
  await expect(page.getByText('Page 2 of 84')).toBeVisible()
  const search = page.getByRole('textbox', { name: 'Search customer, ID, currency…' })
  await search.fill('zzzz_no_customer')
  await expect(page.getByText('No matching records')).toBeVisible()
  await search.fill('Aye Chan')
  await expect(page.getByText('No matching records')).not.toBeVisible()
  const filteredDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export', exact: true }).click()
  const exported = await filteredDownload
  const stream = await exported.createReadStream()
  let csv = ''
  for await (const chunk of stream!) csv += chunk.toString()
  expect(csv).toContain('Aye Chan')
  expect(csv).not.toContain('Hnin Wai')
  await search.fill('THB')
  await expect(page.getByText('No matching records')).not.toBeVisible()
  await search.fill('')
  await page.getByRole('button', { name: 'Virtual ledger', exact: true }).click()
  await expect(page.getByText('Virtual scrolling enabled')).toBeVisible()
  await expect(page.locator('.virtual-scroll tbody tr').first()).toBeVisible()
  await page.getByRole('button', { name: 'Switch to dark mode' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.screenshot({ path: 'test-results/ledger-dark.png', fullPage: true })
  await page.keyboard.press('Control+k')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByPlaceholder('Search pages and actions…').fill('Exchange rates')
  await page.getByRole('option', { name: 'Exchange rates' }).click()
  await expect(page.getByRole('heading', { name: 'Exchange rates', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'History', exact: true }).first().click()
  await expect(page.getByRole('img', { name: /Sample buy and sell history/ })).toBeVisible()
  expect(errors).toEqual([])
})

test('administration transfer methods feed the new transaction form', async ({ page }) => {
  await page.goto('/settings/methods')
  await page.getByRole('button', { name: 'Add transfer method', exact: true }).click()
  await page.getByLabel('Name', { exact: true }).fill('Demo transfer')
  await page.getByLabel('Description', { exact: true }).fill('Session transfer option')
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('link', { name: 'Transactions Ledger' }).click()
  await page.getByRole('button', { name: 'New transaction', exact: true }).click()
  await page.getByRole('combobox', { name: 'Transfer method', exact: true }).click()
  await expect(page.getByRole('option', { name: 'Demo transfer', exact: true })).toBeVisible()
})

test('create fractional transaction, inspect receipt, trash and restore', async ({ page }) => {
  await page.goto('/transactions/new')
  await page.getByRole('button', { name: 'Create transaction', exact: true }).click()
  await expect(page.getByText('Enter the customer name')).toBeVisible()
  await page.getByLabel('Customer name *').fill('Demo Workflow Customer')
  await page.getByLabel('Phone number *').fill('+66812345678')
  await page.getByLabel('Passport number *').fill('DEMO12345')
  await page.getByLabel('Amount *', { exact: true }).fill('10.25')
  await expect(page.getByLabel('Exchanged amount', { exact: true })).toHaveValue('1,286.38 MMK')
  await page.getByRole('button', { name: 'Create transaction', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(
    page.getByRole('dialog').getByText('Demo Workflow Customer', { exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Close', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: 'Transactions', exact: true })).toBeVisible()
  await page
    .getByRole('textbox', { name: 'Search customer, ID, currency…' })
    .fill('Demo Workflow Customer')
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await page.getByRole('button', { name: 'Actions for MBX-012841' }).click()
  await page.getByRole('menuitem', { name: 'Move to trash' }).click()
  await page.getByRole('button', { name: 'Move to trash', exact: true }).click()
  await expect(page.getByText('No matching records')).toBeVisible()
  await page.getByRole('link', { name: 'Trash', exact: true }).click()
  await expect(page.getByText('Demo Workflow Customer', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Restore', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Restore', exact: true }).click()
  await expect(page.getByText('No matching records')).toBeVisible()
})

test('mobile layout, navigation drawer, settings and reports export', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.screenshot({ path: 'test-results/overview-mobile.png', fullPage: true })
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('link', { name: 'Reports', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Reports', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export report', exact: true }).click()
  expect((await downloadPromise).suggestedFilename()).toBe('mbx-demo-transactions.csv')
  for (const path of [
    '/customers',
    '/settings/users',
    '/settings/methods',
    '/settings/sources',
    '/settings/slips',
    '/settings/preferences',
    '/profile',
    '/trash',
  ]) {
    await page.goto(path)
    await expect(page.locator('h1')).toBeVisible()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      path,
    ).toBe(true)
  }
})
