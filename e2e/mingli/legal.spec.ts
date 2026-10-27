import { test, expect } from './checks'
import type { Page } from 'playwright/test'
import { BASE, askQuestion, prepare } from './checks'

const AI_URL = 'http://localhost:9/mingli-status'

// 攔狀態端點（GET）；其他請求不管
async function mockStatus(page: Page, status: number, body: object = {}) {
  await page.addInitScript((u) => { (window as unknown as { __MINGLI_AI_URL__: string }).__MINGLI_AI_URL__ = u }, AI_URL)
  await page.route(AI_URL, (route) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) }))
}

const hasHScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)

test.describe('頁尾連結', () => {
  test.use({ viewport: { width: 390, height: 844 } })
  test.beforeEach(async ({ page }) => { await prepare(page) })

  // 手機塔羅抽牌畫面不放頁尾（牌堆佔滿一屏），要抽完看解讀才檢查
  const drawThree = async (page: Page) => {
    for (const k of [0, 5, 10]) {
      await page.getByTestId('ml-fan-card').nth(k).dispatchEvent('click')
      await page.getByTestId('ml-fan-card').nth(k).dispatchEvent('click')
      await page.waitForTimeout(150)
    }
    await expect(page.getByTestId('ml-reading')).toBeVisible({ timeout: 10_000 })
  }
  // 問題存在 session，第二次進同一頁就不會再出現輸入框
  const askIfNeeded = async (page: Page) => { if (await page.getByTestId('ml-question-input').count()) await askQuestion(page) }
  const pages: { name: string; hash: string; testid: string; setup?: (page: Page) => Promise<void> }[] = [
    { name: '首頁', hash: '#/', testid: 'ml-home' },
    { name: '塔羅', hash: '#/tarot?seed=4271', testid: 'ml-tarot', setup: async (page) => { await askIfNeeded(page); await drawThree(page) } },
    { name: '梅花', hash: '#/meihua', testid: 'ml-meihua', setup: askIfNeeded },
    { name: '紫微', hash: '#/ziwei', testid: 'ml-ziwei' },
  ]

  for (const p of pages) {
    test(`${p.name}頁底部點得到隱私權與免責聲明`, async ({ page }) => {
      for (const [id, target] of [['ml-footer-privacy', 'ml-privacy'], ['ml-footer-terms', 'ml-terms']] as const) {
        await page.goto(BASE + p.hash)
        await expect(page.getByTestId(p.testid)).toBeVisible()
        if (p.setup) await p.setup(page)
        // 使用者捲到最底：連結要在分頁列上方，不被蓋住
        const link = page.getByTestId(id)
        await expect(link).toBeVisible()
        // 內容可能還在長（動畫、字型），每次量之前都重新捲到底
        await expect.poll(async () => {
          await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
          const [lb, tb] = await Promise.all([link.boundingBox(), page.locator('.ml-tabbar').boundingBox()])
          return lb!.y + lb!.height <= tb!.y + 1
        }).toBe(true)
        await link.click()
        await expect(page.getByTestId(target)).toBeVisible()
      }
    })
  }

  test('手機塔羅抽牌畫面不放頁尾（牌堆佔滿一屏）', async ({ page }) => {
    await page.goto(BASE + '#/tarot')
    await askQuestion(page)
    await expect(page.getByTestId('ml-fan-card').first()).toBeVisible()
    await expect(page.getByTestId('ml-footer-privacy')).toBeHidden()
  })

  test('隱私與免責頁內容：1925、Anthropic、聯絡方式待補', async ({ page }) => {
    await page.goto(BASE + '#/terms')
    await expect(page.getByTestId('ml-terms')).toContainText('1925')
    await expect(page.getByTestId('ml-terms')).toContainText('不保證')
    await page.goto(BASE + '#/privacy')
    await expect(page.getByTestId('ml-privacy')).toContainText('Anthropic')
    await expect(page.getByTestId('ml-privacy')).toContainText('不含你的生日原文')
  })
})

for (const width of [390, 820, 1440]) {
  test.describe(`${width} 寬`, () => {
    test.use({ viewport: { width, height: 900 } })
    test(`首頁、隱私、免責頁沒有橫向捲動`, async ({ page }) => {
      await prepare(page)
      for (const hash of ['#/', '#/privacy', '#/terms']) {
        await page.goto(BASE + hash)
        await expect(page.getByTestId('ml-footer-privacy')).toBeVisible()
        expect(await hasHScroll(page), `${hash} 橫向捲動`).toBe(false)
      }
    })
  })
}

test.describe('維護頁', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('狀態端點回 maintenance:true 時只顯示維護頁，仍有隱私與免責連結', async ({ page }) => {
    await prepare(page)
    await mockStatus(page, 200, { ai: true, maintenance: true })
    await page.goto(BASE)
    await expect(page.getByTestId('ml-maintenance')).toBeVisible()
    await expect(page.getByTestId('ml-maintenance')).toContainText('系統維護中，請稍後再來')
    await expect(page.getByTestId('ml-home')).toHaveCount(0)
    await expect(page.getByTestId('ml-footer-privacy')).toBeVisible()
    await page.getByTestId('ml-footer-terms').click()
    await expect(page.getByTestId('ml-terms')).toBeVisible()
  })

  // 非 200 會讓瀏覽器自己在 console 印 Failed to load resource（被 consoleGuard 擋），
  // 所以畫面測試用「回來的格式不對」代表失敗；非 200 的處理由 ai.test.ts 的 fetchSiteStatus 單元測試涵蓋
  test('狀態端點回壞掉的內容時照常顯示首頁', async ({ page }) => {
    await prepare(page)
    await mockStatus(page, 200, { oops: true })
    await page.goto(BASE)
    await expect(page.getByTestId('ml-home')).toBeVisible()
    await page.waitForTimeout(500)
    await expect(page.getByTestId('ml-maintenance')).toHaveCount(0)
    await expect(page.getByTestId('ml-home')).toBeVisible()
  })

  test('狀態還沒回來前照常顯示首頁', async ({ page }) => {
    await prepare(page)
    await page.addInitScript((u) => { (window as unknown as { __MINGLI_AI_URL__: string }).__MINGLI_AI_URL__ = u }, AI_URL)
    await page.route(AI_URL, async (route) => {
      await new Promise((r) => setTimeout(r, 1500))
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ai: true, maintenance: true }) })
    })
    await page.goto(BASE)
    await expect(page.getByTestId('ml-home')).toBeVisible()
    await expect(page.getByTestId('ml-maintenance')).toBeVisible({ timeout: 5000 })
  })
})
