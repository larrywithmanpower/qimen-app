import { test, expect, BASE } from './checks'

// 防白屏：新版 Chrome（155 起）的 window.scrollTo 會回傳 Promise。
// 頁面腳本執行前先把 scrollTo／scrollBy／scroll 換成回傳 Promise 的版本，各頁都要正常顯示且 console 沒有 error（consoleGuard 會檢查）
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    for (const k of ['scrollTo', 'scrollBy', 'scroll'] as const) {
      const orig = window[k].bind(window) as (...a: unknown[]) => void
      ;(window as unknown as Record<string, unknown>)[k] = (...a: unknown[]) => { orig(...a); return Promise.resolve() }
    }
  })
})

const PAGES = [
  { hash: '#/', testid: 'ml-home' },
  { hash: '#/tarot?seed=4271', testid: 'ml-tarot' },
  { hash: '#/meihua?t=2024-03-15T23:30', testid: 'ml-meihua' },
  { hash: '#/ziwei?d=1990-07-05&t=4&g=男', testid: 'ml-ziwei' },
  { hash: '#/records', testid: 'ml-records' },
]

test('scrollTo 回傳 Promise 時各頁仍正常顯示', async ({ page }) => {
  for (const p of PAGES) {
    await page.goto(BASE + p.hash)
    await expect(page.getByTestId(p.testid)).toBeVisible()
  }
  // 頁面之間用 hash 切換（會觸發 scrollTo 的 effect 與 cleanup）
  await page.goto(BASE + '#/')
  for (const p of PAGES) {
    await page.evaluate((h) => { location.hash = h }, p.hash)
    await expect(page.getByTestId(p.testid)).toBeVisible()
  }
})
