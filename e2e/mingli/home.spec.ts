import { test, expect } from 'playwright/test'
import type { Page } from 'playwright/test'
import { BASE, checkLayout, prepare } from './checks'


// 只在手機尺寸 390×844 跑
test.use({ viewport: { width: 390, height: 844 } })

test.beforeEach(async ({ page }) => {
  await prepare(page)
  await page.goto(BASE)
  await expect(page.getByTestId('ml-home')).toBeVisible()
})

test('首頁可選卡剛好 3 張，沒有奇門入口', async ({ page }) => {
  await expect(page.locator('[data-testid^="ml-method-"]')).toHaveCount(3)
  await expect(page.locator('button, a[href]').filter({ hasText: '奇門' })).toHaveCount(0)
  // 之後開放的項目不是按鈕
  await expect(page.locator('.ml-soon-pill').first()).toBeVisible()
  expect(await page.locator('.ml-soon-pill').evaluateAll((els) => els.filter((e) => e.matches('button, a, [role]')).length)).toBe(0)
})

test('選塔羅按開始會到 #/tarot', async ({ page }) => {
  await page.getByTestId('ml-method-tarot').click()
  await page.getByTestId('ml-start').click()
  await expect(page).toHaveURL(/#\/tarot$/)
  await expect(page.getByTestId('ml-tarot')).toBeVisible()
})

test('首頁版面檢查沒有問題', async ({ page }) => {
  // 等標題逐字動畫跑完
  await page.waitForTimeout(2800)
  expect(await checkLayout(page)).toEqual([])
})

test('背景有在畫格', async ({ page }) => {
  const a = await page.evaluate(() => window.__mlFrames ?? 0)
  await expect.poll(() => page.evaluate(() => window.__mlFrames ?? 0)).toBeGreaterThan(a)
})
