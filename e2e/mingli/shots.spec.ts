import { test, expect } from './checks'
import type { Page } from 'playwright/test'
import { mkdirSync } from 'node:fs'
import { BASE, SIZES, askQuestion, checkLayout, prepare } from './checks'

// 四尺寸全套：每頁截圖存 qa-reports/mingli-v2/<頁>/<寬x高>.png，並跑版面檢查
// 只在交件前跑：SHOTS=1 npx playwright test -c playwright.mingli.config.ts shots
// 只跑部分頁：SHOTS=home,tarot-read
test.skip(!process.env.SHOTS, '交件前才跑（設 SHOTS=1）')

const OUT = 'qa-reports/mingli-v2'

type Step = (page: Page) => Promise<void>

// 抽三張：用固定牌序，點牌堆的第 0、5、10 張（各點兩下：浮起再確認）
const drawThree: Step = async (page) => {
  for (const k of [0, 5, 10]) {
    await page.getByTestId('ml-fan-card').nth(k).dispatchEvent('click')
    await page.getByTestId('ml-fan-card').nth(k).dispatchEvent('click')
    await page.waitForTimeout(150)
  }
  await expect(page.getByTestId('ml-reading')).toBeVisible({ timeout: 10_000 })
}

export const PAGES: { name: string; hash: string; step?: Step }[] = [
  { name: 'home', hash: '#/' },
  { name: 'tarot-draw', hash: '#/tarot?seed=4271' },
  { name: 'tarot-read', hash: '#/tarot?seed=4271', step: drawThree },
  { name: 'meihua-cast', hash: '#/meihua?t=2024-03-15T23:30', step: async (page) => {
    await page.getByTestId('ml-cast').click()
    await expect(page.getByTestId('ml-to-reading')).toBeVisible({ timeout: 10_000 })
  } },
  { name: 'meihua-read', hash: '#/meihua?t=2024-03-15T23:30', step: async (page) => {
    await page.getByTestId('ml-cast').click()
    await page.getByTestId('ml-to-reading').click()
    await expect(page.getByTestId('ml-reading')).toBeVisible({ timeout: 10_000 })
  } },
  { name: 'ziwei-input', hash: '#/ziwei', step: async (page) => {
    await page.evaluate(() => new Promise((done) => {
      const q = indexedDB.deleteDatabase('keyval-store')
      q.onsuccess = q.onerror = q.onblocked = () => done(null)
    }))
    await page.reload()
    await expect(page.getByTestId('ml-birth-form')).toBeVisible()
  } },
  { name: 'ziwei-chart', hash: '#/ziwei?d=1990-07-05&t=4&g=男', step: async (page) => {
    await expect(page.getByTestId('ml-chart')).toBeVisible()
  } },
]

const wanted = (process.env.SHOTS ?? '').split(',')
const pick = PAGES.filter(p => wanted.includes('1') || wanted.includes(p.name))

for (const pg of pick) {
  for (const s of SIZES) {
    test(`${pg.name} ${s.width}x${s.height}`, async ({ page }) => {
      await page.setViewportSize({ width: s.width, height: s.height })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await prepare(page)
      await page.goto(BASE + pg.hash)
      await page.waitForTimeout(600)
      if (/^#\/(tarot|meihua)/.test(pg.hash)) await askQuestion(page)
      if (pg.step) await pg.step(page)
      await page.waitForTimeout(800)
      mkdirSync(`${OUT}/${pg.name}`, { recursive: true })
      await page.screenshot({ path: `${OUT}/${pg.name}/${s.width}x${s.height}.png`, fullPage: true })
      const issues = await checkLayout(page)
      expect(issues).toEqual([])
    })
  }
}
