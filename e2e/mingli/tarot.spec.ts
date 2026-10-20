import { test, expect } from 'playwright/test'
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

// 牌堆的牌互相疊著，直接對該張送點擊事件
const pick = (page: Page, pos: number) => page.getByTestId('ml-fan-card').nth(pos).dispatchEvent('click')

async function pickAll(page: Page) {
  for (const p of PICKS) await pick(page, p)
  await expect(page.getByTestId('ml-reading')).toBeVisible()
}

const slotNames = (page: Page) => page.getByTestId('ml-slot').evaluateAll((els) => els.map((e) => e.getAttribute('data-card')))

test('牌序編號與牌堆張數', async ({ page }) => {
  await open(page)
  await expect(page.getByTestId('ml-seed')).toHaveText('牌序 No. 04271')
  await expect(page.getByTestId('ml-fan-card')).toHaveCount(22)
  await expect(page.getByTestId('ml-slot')).toHaveCount(3)
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
