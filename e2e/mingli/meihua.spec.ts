import { test, expect } from './checks'
import type { Page } from 'playwright/test'
import { BASE, askQuestion, checkLayout, prepare } from './checks'

import { castByNumbers, castByTime } from '../../src/mingli/meihua/engine'
import type { MeihuaResult } from '../../src/mingli/meihua/engine'

// 只在手機尺寸 390×844 跑
test.use({ viewport: { width: 390, height: 844 } })

const TIME_URL = `${BASE}#/meihua?t=2024-03-15T23:30`
const YAO_NAMES = ['初', '二', '三', '四', '五', '上']

async function open(page: Page, url: string) {
  await prepare(page)
  await page.goto(url)
  await expect(page.getByTestId('ml-meihua')).toBeVisible()
  await askQuestion(page)
}

// 右側各行的文字，key 是行標題
const rowTexts = (page: Page) =>
  page.getByTestId('ml-gua-row').evaluateAll((els) =>
    Object.fromEntries(els.map((e) => [e.getAttribute('data-k'), (e.querySelector('.ml-gua-v')?.textContent ?? '').trim()])),
  )

async function expectResult(page: Page, res: MeihuaResult) {
  await expect(page.locator('[data-testid="ml-gua-row"][data-on="true"]')).toHaveCount(6, { timeout: 10_000 })
  const rows = await rowTexts(page)
  expect(rows['本卦']).toBe(res.name)
  expect(rows['互卦']).toBe(res.mutual.name)
  expect(rows['動爻']).toBe(`${YAO_NAMES[res.moving - 1]}爻`)
  expect(rows['變卦']).toBe(res.changed.name)
  expect(rows['體用']).toContain(`體${res.ti}${res.tiElement}・用${res.yong}${res.yongElement}`)
  await expect(page.getByTestId('ml-seal')).toHaveText(res.tone)
  // 爻線條數：陽 1 筆、陰 2 筆；動爻是朱砂色
  await expect(page.getByTestId('ml-yao')).toHaveCount(res.lines.reduce((n, v) => n + (v ? 1 : 2), 0))
  const moving = await page.locator('[data-testid="ml-yao"].ml-moving').count()
  expect(moving).toBe(res.lines[res.moving - 1] ? 1 : 2)
}

test('時間起卦：畫面上的卦等於 castByTime 的結果', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page, TIME_URL)
  await page.getByTestId('ml-cast').click()
  await expectResult(page, castByTime(new Date('2024-03-15T23:30')))
  // 23:30 算隔天，農曆甲辰年二月初七子時
  await expect(page.getByTestId('ml-cast-info')).toHaveText('甲辰年 二月初七 子時')
})

test('報數起卦：網址帶 a、b 直接起卦，等於 castByNumbers', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page, `${BASE}#/meihua?a=16&b=5`)
  await expectResult(page, castByNumbers(16, 5))
  await expect(page.getByTestId('ml-cast-info')).toHaveText('報數 16、5')
})

test('報數欄位：不合法時起卦鈕不能按並有說明，合法後可按', async ({ page }) => {
  await open(page, `${BASE}#/meihua`)
  await page.getByTestId('ml-method-numbers').click()
  await expect(page.getByTestId('ml-cast')).toBeDisabled()
  await page.getByTestId('ml-num-a').fill('0')
  await page.getByTestId('ml-num-b').fill('5')
  await expect(page.getByTestId('ml-cast')).toBeDisabled()
  await expect(page.getByTestId('ml-num-msg')).toBeVisible()
  await page.getByTestId('ml-num-a').fill('12')
  await expect(page.getByTestId('ml-cast')).toBeEnabled()
  await expect(page.getByTestId('ml-num-msg')).toHaveCount(0)
  await page.getByTestId('ml-num-a').fill('1.5')
  await expect(page.getByTestId('ml-cast')).toBeDisabled()
  expect(await checkLayout(page)).toEqual([])
})

test('防坑：筆畫濾鏡範圍用 userSpaceOnUse，完整起卦後卦象有足夠亮色', async ({ page }) => {
  await open(page, TIME_URL)
  const units = await page.evaluate(() => ['ml-brush', 'ml-brush-s'].map((id) => document.getElementById(id)?.getAttribute('filterUnits')))
  expect(units).toEqual(['userSpaceOnUse', 'userSpaceOnUse'])

  await page.getByTestId('ml-cast').click()
  await expect(page.locator('[data-testid="ml-gua-row"][data-on="true"]')).toHaveCount(6, { timeout: 10_000 })
  await page.waitForTimeout(1000)
  const png = (await page.getByTestId('ml-hex').screenshot()).toString('base64')
  const share = await page.evaluate(async (b64) => {
    const img = new Image()
    img.src = `data:image/png;base64,${b64}`
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.width
    c.height = img.height
    const ctx = c.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    const d = ctx.getImageData(0, 0, c.width, c.height).data
    let bright = 0
    for (let i = 0; i < d.length; i += 4) {
      const [r, g, b] = [d[i], d[i + 1], d[i + 2]]
      const paper = r > 180 && g > 170 && b > 150
      const cinnabar = r > 170 && g < 90 && b < 80
      if (paper || cinnabar) bright++
    }
    return bright / (d.length / 4)
  }, png)
  expect(share).toBeGreaterThan(0.03)
})

test('減少動態：起卦後 300ms 內六爻畫完、印章可見', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page, TIME_URL)
  await page.getByTestId('ml-cast').click()
  await expect(page.getByTestId('ml-seal')).toBeVisible({ timeout: 300 })
  await expect
    .poll(
      () => page.getByTestId('ml-yao').evaluateAll((els) => els.length >= 6 && els.every((e) => parseFloat(getComputedStyle(e).strokeDashoffset) === 0)),
      { timeout: 300 },
    )
    .toBe(true)
  await expect(page.locator('[data-testid="ml-gua-row"][data-on="true"]')).toHaveCount(6, { timeout: 300 })
})

test('解讀頁：依據標籤對應本卦、體用、變卦；版面檢查沒有問題', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page, TIME_URL)
  await page.waitForTimeout(1200)
  expect(await checkLayout(page)).toEqual([])
  await page.getByTestId('ml-cast').click()
  await expect(page.getByTestId('ml-to-reading')).toBeVisible()
  await page.waitForTimeout(500)
  expect(await checkLayout(page)).toEqual([])

  const res = castByTime(new Date('2024-03-15T23:30'))
  await page.getByTestId('ml-to-reading').click()
  await expect(page.getByTestId('ml-reading')).toBeVisible()
  await expect(page.getByTestId('ml-reading')).toContainText('範例解讀，正式版由 AI 依卦義規則卡撰寫')
  const basis = await page.getByTestId('ml-basis').allTextContents()
  expect(basis).toHaveLength(3)
  expect(basis[0]).toContain(`本卦 ${res.name}`)
  expect(basis[1]).toContain('體用')
  expect(basis[2]).toContain(`變卦 ${res.changed.name}`)
  basis.forEach((t) => expect(t).not.toContain('互卦'))
  await page.waitForTimeout(1200)
  expect(await checkLayout(page)).toEqual([])

  // 手機解讀是另一個畫面：卦象收起來，能返回
  await expect(page.getByTestId('ml-hex')).toBeHidden()
  await page.getByTestId('ml-back-hex').click()
  await expect(page.getByTestId('ml-hex')).toBeVisible()
  await expect(page.getByTestId('ml-reading')).toHaveCount(0)
})
