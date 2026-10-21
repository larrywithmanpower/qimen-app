import { test, expect } from './checks'
import { BASE, DEFAULT_QUESTION, checkLayout, prepare } from './checks'


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
  await page.getByTestId('ml-question').fill(DEFAULT_QUESTION)
  await page.getByTestId('ml-start').click()
  await expect(page).toHaveURL(/#\/tarot$/)
  await expect(page.getByTestId('ml-tarot')).toBeVisible()
  // 首頁填的問題帶進塔羅頁，不再出現輸入框
  await expect(page.getByTestId('ml-question-input')).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(DEFAULT_QUESTION)
})

for (const m of ['tarot', 'meihua']) {
  test(`首頁問題空白按開始（${m}）：留在首頁、顯示提示並聚焦輸入框`, async ({ page }) => {
    await page.getByTestId(`ml-method-${m}`).click()
    await page.getByTestId('ml-question').fill('   ')
    await page.getByTestId('ml-start').click()
    await expect(page.getByTestId('ml-home-need')).toHaveText('先寫下你想問的事')
    await expect(page.getByTestId('ml-question')).toBeFocused()
    await page.waitForTimeout(900)
    await expect(page.getByTestId('ml-home')).toBeVisible()
    await expect(page).not.toHaveURL(/#\/(tarot|meihua)/)
    // 開始打字提示就消失
    await page.getByTestId('ml-question').fill('a')
    await expect(page.getByTestId('ml-home-need')).toHaveCount(0)
  })
}

test('首頁版面檢查沒有問題', async ({ page }) => {
  // 等標題逐字動畫跑完
  await page.waitForTimeout(2800)
  expect(await checkLayout(page)).toEqual([])
})

test('背景有在畫格', async ({ page }) => {
  const a = await page.evaluate(() => window.__mlFrames ?? 0)
  await expect.poll(() => page.evaluate(() => window.__mlFrames ?? 0)).toBeGreaterThan(a)
})

test('減少動態：標題立刻完整清楚', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload()
  await expect(page.getByTestId('ml-home')).toBeVisible()
  await page.waitForTimeout(200)
  const states = await page.locator('.ml-home-title-seg span').evaluateAll((els) =>
    els.map((e) => ({ o: getComputedStyle(e).opacity, f: getComputedStyle(e).filter })))
  expect(states).toHaveLength(8)
  states.forEach((s) => {
    expect(s.o).toBe('1')
    expect(['none', 'blur(0px)']).toContain(s.f)
  })
})

test('標題兩段各自不換行', async ({ page }) => {
  const tops = await page.locator('.ml-home-title-seg').evaluateAll((els) => els.map((e) => e.getClientRects().length))
  expect(tops).toEqual([1, 1])
})

for (const size of [{ width: 390, height: 844 }, { width: 820, height: 1180 }]) {
  test(`${size.width}×${size.height} 不捲動就看得到開始鈕`, async ({ page }) => {
    await page.setViewportSize(size)
    await page.reload()
    await expect(page.getByTestId('ml-home')).toBeVisible()
    await page.waitForTimeout(300)
    const r = await page.evaluate(() => {
      const b = document.querySelector('[data-testid="ml-start"]')!.getBoundingClientRect()
      const bar = document.querySelector('.ml-tabbar')!
      const barTop = getComputedStyle(bar).display === 'none' ? innerHeight : bar.getBoundingClientRect().top
      return { top: b.top, bottom: b.bottom, barTop, vh: innerHeight }
    })
    expect(r.top).toBeGreaterThanOrEqual(0)
    expect(r.bottom).toBeLessThanOrEqual(r.vh)
    expect(r.bottom).toBeLessThanOrEqual(r.barTop)
  })
}

test('舊網址 #/qimen 與未知網址一律導回首頁', async ({ page }) => {
  for (const hash of ['#/qimen', '#/qimen/chart', '#/nowhere']) {
    await page.goto(BASE + hash)
    await expect(page).toHaveURL(/#\/$/)
    await expect(page.getByTestId('ml-home')).toBeVisible()
  }
})
