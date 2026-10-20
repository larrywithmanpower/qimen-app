import { test, expect } from './checks'
import type { Page } from 'playwright/test'
import { BASE, checkLayout, prepare } from './checks'

import { drawThree } from '../../src/mingli/tarot/engine'

// 只在手機尺寸 390×844 跑
test.use({ viewport: { width: 390, height: 844 } })

const SEED = 4271
const PICKS: [number, number, number] = [3, 9, 17]
const URL = `${BASE}#/tarot?seed=${SEED}`

async function open(page: Page) {
  await prepare(page)
  await page.goto(URL)
  await expect(page.getByTestId('ml-tarot')).toBeVisible()
}

// 牌堆的牌互相疊著，直接對該張送點擊事件；抽牌要點兩下（第一下浮起、第二下確認）
const tap = (page: Page, pos: number) => page.getByTestId('ml-fan-card').nth(pos).dispatchEvent('click')
const pick = async (page: Page, pos: number) => {
  await tap(page, pos)
  await tap(page, pos)
}

async function pickAll(page: Page) {
  for (const p of PICKS) await pick(page, p)
  await expect(page.getByTestId('ml-reading')).toBeVisible()
}

const slotNames = (page: Page) => page.getByTestId('ml-slot').evaluateAll((els) => els.map((e) => e.getAttribute('data-card')))

test('牌序編號與牌堆張數', async ({ page }) => {
  await open(page)
  await expect(page.getByTestId('ml-seed')).toHaveText('牌序 No. 04271')
  await expect(page.getByTestId('ml-fan-card')).toHaveCount(78)
  await expect(page.getByTestId('ml-slot')).toHaveCount(3)
})

test('滑動牌堆會轉動扇形：捲到最左，第 1 張轉到正上方且真的點得到', async ({ page }) => {
  await open(page)
  const cards = page.getByTestId('ml-fan-card')
  const centerX = (await page.viewportSize())!.width / 2
  const midX = async (i: number) => { const b = (await cards.nth(i).boundingBox())!; return b.x + b.width / 2 }
  // 初始置中：中間那張在正上方，第 1 張偏在左邊外面
  expect(Math.abs((await midX(38)) - centerX)).toBeLessThan(30)
  expect(Math.abs((await midX(0)) - centerX)).toBeGreaterThan(100)
  await page.locator('.ml-fan').evaluate((el) => { el.scrollLeft = 0; el.dispatchEvent(new Event('scroll')) })
  await expect.poll(async () => Math.abs((await midX(0)) - centerX)).toBeLessThan(30)
  // 用真的滑鼠點第 1 張露出的左上角（不是 dispatchEvent），要浮起
  const box = (await cards.nth(0).boundingBox())!
  await page.mouse.click(box.x + 6, box.y + 14)
  await expect(cards.nth(0)).toHaveAttribute('data-lifted', 'true')
})

test('兩步驟抽牌：點 A 浮起，點 B 後 A 放下 B 浮起，再點 B 才算抽到', async ({ page }) => {
  await open(page)
  const cards = page.getByTestId('ml-fan-card')
  const [a, b] = [PICKS[0], PICKS[1]]
  await tap(page, a)
  await expect(cards.nth(a)).toHaveAttribute('data-lifted', 'true')
  await expect(page.locator('.ml-tarot-hint')).toContainText('再點一次確定抽這張')
  await tap(page, b)
  await expect(cards.nth(a)).toHaveAttribute('data-lifted', 'false')
  await expect(cards.nth(b)).toHaveAttribute('data-lifted', 'true')
  expect(await slotNames(page)).toEqual(['', '', ''])
  await tap(page, b)
  await expect(page.getByTestId('ml-slot').first()).toHaveAttribute('data-card', drawThree(SEED, [b, 0, 1])[0].card.zh, { timeout: 5000 })
  await expect(cards.nth(b)).toHaveCSS('visibility', 'hidden')
})

test('三個牌位的牌名等於引擎抽出的牌，重新整理後相同', async ({ page }) => {
  await open(page)
  await pickAll(page)
  const expected = drawThree(SEED, PICKS).map((d) => d.card.zh)
  expect(await slotNames(page)).toEqual(expected)

  await page.reload()
  await expect(page.getByTestId('ml-tarot')).toBeVisible()
  await pickAll(page)
  expect(await slotNames(page)).toEqual(expected)
})

test('抽滿後牌堆隱藏、外框與解讀區不相交，依據標籤只有這 3 張牌', async ({ page }) => {
  await open(page)
  await pickAll(page)
  await expect(page.getByTestId('ml-fan')).toBeHidden()
  expect(await page.getByTestId('ml-fan').boundingBox()).toBeNull()

  const names = drawThree(SEED, PICKS).map((d) => d.card.zh)
  const basis = await page.getByTestId('ml-basis').allTextContents()
  expect(basis).toHaveLength(3)
  basis.forEach((text, k) => {
    expect(text).toContain(names[k])
    const others = names.filter((_, i) => i !== k)
    others.forEach((n) => expect(text).not.toContain(n))
  })
  await expect(page.getByTestId('ml-verdict')).toBeVisible()
  await expect(page.getByTestId('ml-reading')).toContainText('範例解讀，正式版由 AI 依牌義規則卡撰寫')
})

test('減少動態：抽完第 3 張 300ms 內解讀出現', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page)
  await pick(page, PICKS[0])
  await pick(page, PICKS[1])
  await pick(page, PICKS[2])
  await expect(page.getByTestId('ml-reading')).toBeVisible({ timeout: 300 })
})

test('抽牌中與解讀後版面檢查沒有問題', async ({ page }) => {
  await open(page)
  await page.waitForTimeout(1200)
  expect(await checkLayout(page)).toEqual([])
  await pick(page, PICKS[0])
  await pick(page, PICKS[1])
  expect(await checkLayout(page)).toEqual([])
  await pick(page, PICKS[2])
  await expect(page.getByTestId('ml-reading')).toBeVisible()
  await page.waitForTimeout(1500)
  expect(await checkLayout(page)).toEqual([])
})

test('解讀範例標示捲到底看得到，不被分頁列蓋住', async ({ page }) => {
  await open(page)
  await pickAll(page)
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await page.waitForTimeout(300)
  const gap = await page.evaluate(() => {
    const note = document.querySelector('.ml-note')!.getBoundingClientRect()
    const bar = document.querySelector('.ml-tabbar')!.getBoundingClientRect()
    return bar.top - note.bottom
  })
  expect(gap).toBeGreaterThanOrEqual(0)
})
