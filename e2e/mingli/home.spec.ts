import { test, expect } from './checks'
import { BASE, DEFAULT_QUESTION, checkLayout, prepare } from './checks'

// 2026-11-09 新首頁：自己打問題＋三顆算法鈕、煩惱字卡幫忙填問題、東西兩塊入口
test.use({ viewport: { width: 390, height: 844 } })

test.beforeEach(async ({ page }) => {
  await prepare(page)
  await page.goto(BASE)
  await expect(page.getByTestId('ml-home')).toBeVisible()
})

test('入口：東方有梅花、紫微，西方有塔羅；籌備中的不是按鈕，也沒有奇門入口', async ({ page }) => {
  await expect(page.getByTestId('ml-door-meihua')).toHaveAttribute('href', '#/meihua')
  await expect(page.getByTestId('ml-door-ziwei')).toHaveAttribute('href', '#/ziwei')
  await expect(page.getByTestId('ml-door-tarot')).toHaveAttribute('href', '#/tarot')
  await expect(page.locator('button, a[href]').filter({ hasText: '奇門' })).toHaveCount(0)
  expect(await page.locator('.ml-hm-soon').evaluateAll((els) => els.filter((e) => e.matches('button, a, [role]')).length)).toBe(0)
  await expect(page.locator('.ml-hm-soon')).toHaveCount(2)
})

test('點煩惱字卡：只填問題、標推薦，不跳頁', async ({ page }) => {
  // 跑馬燈在動，測試點不穩；停掉動畫再點（實際使用 36 秒一圈很慢）
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByTestId('ml-worry').filter({ hasText: /^感情$/ }).click()
  await expect(page.getByTestId('ml-question')).toHaveValue('我的感情接下來會怎麼走？')
  await expect(page.getByTestId('ml-go-tarot')).toHaveAttribute('data-rec', 'true')
  await expect(page.getByTestId('ml-go-meihua')).not.toHaveAttribute('data-rec')
  await expect(page).not.toHaveURL(/#\/(tarot|meihua|ziwei)/)
  await page.getByTestId('ml-worry').filter({ hasText: /^工作$/ }).click()
  await expect(page.getByTestId('ml-go-meihua')).toHaveAttribute('data-rec', 'true')
  await expect(page.getByTestId('ml-go-tarot')).not.toHaveAttribute('data-rec')
})

test('字卡填的問題可以改，改完按「用塔羅問」帶著改過的問題進塔羅頁（最多 2 步）', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByTestId('ml-worry').filter({ hasText: /^感情$/ }).click()
  await page.getByTestId('ml-question').fill(DEFAULT_QUESTION)
  await page.getByTestId('ml-go-tarot').click()
  await expect(page).toHaveURL(/#\/tarot$/)
  await expect(page.getByTestId('ml-tarot')).toBeVisible()
  await expect(page.getByTestId('ml-question-input')).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(DEFAULT_QUESTION)
})

for (const m of ['tarot', 'meihua']) {
  test(`問題空白按「用${m === 'tarot' ? '塔羅' : '梅花'}問」：留在首頁、顯示提示並聚焦輸入框`, async ({ page }) => {
    await page.getByTestId('ml-question').fill('   ')
    await page.getByTestId(`ml-go-${m}`).click()
    await expect(page.getByTestId('ml-home-need')).toHaveText('先寫下你想問的事')
    await expect(page.getByTestId('ml-question')).toBeFocused()
    await expect(page.getByTestId('ml-home')).toBeVisible()
    await page.getByTestId('ml-question').fill('a')
    await expect(page.getByTestId('ml-home-need')).toHaveCount(0)
  })
}

test('紫微不用問題也能進', async ({ page }) => {
  await page.getByTestId('ml-go-ziwei').click()
  await expect(page).toHaveURL(/#\/ziwei$/)
})

test('今日資訊有干支與月相', async ({ page }) => {
  await expect(page.getByTestId('ml-today')).toHaveText(/年.+月.+日.+(月)$/)
})

test('首頁版面檢查沒有問題', async ({ page }) => {
  await page.waitForTimeout(1200)
  expect(await checkLayout(page)).toEqual([])
})

test('減少動態：字卡不跑馬燈、重複的那組藏起來', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload()
  await expect(page.getByTestId('ml-home')).toBeVisible()
  expect(await page.locator('.ml-hm-track').evaluate((e) => getComputedStyle(e).animationName)).toBe('none')
  expect(await page.locator('.ml-hm-chip[aria-hidden="true"]').first().isVisible()).toBe(false)
})

test('重複的字卡不能用 Tab 點到', async ({ page }) => {
  const tabbable = await page.locator('.ml-hm-chip[aria-hidden="true"]').evaluateAll((els) => els.filter((e) => (e as HTMLElement).tabIndex >= 0).length)
  expect(tabbable).toBe(0)
})

for (const size of [{ width: 390, height: 844 }, { width: 820, height: 1180 }]) {
  test(`${size.width}×${size.height} 不捲動就看得到輸入框、三顆算法鈕和字卡`, async ({ page }) => {
    await page.setViewportSize(size)
    await page.reload()
    await expect(page.getByTestId('ml-home')).toBeVisible()
    const r = await page.evaluate(() => {
      const bar = document.querySelector('.ml-tabbar')!
      const barTop = getComputedStyle(bar).display === 'none' ? innerHeight : bar.getBoundingClientRect().top
      const bottoms = ['[data-testid="ml-question"]', '[data-testid="ml-go-ziwei"]', '.ml-hm-marquee']
        .map((s) => document.querySelector(s)!.getBoundingClientRect().bottom)
      return { max: Math.max(...bottoms), barTop }
    })
    expect(r.max).toBeLessThanOrEqual(r.barTop)
  })
}

test('舊網址 #/qimen 與未知網址一律導回首頁', async ({ page }) => {
  for (const hash of ['#/qimen', '#/qimen/chart', '#/nowhere']) {
    await page.goto(BASE + hash)
    await expect(page).toHaveURL(/#\/$/)
    await expect(page.getByTestId('ml-home')).toBeVisible()
  }
})

test('大標題換行平均分配（text-wrap: balance），最後一行不會只剩一兩個字', async ({ page }) => {
  await prepare(page)
  await page.goto(`${BASE}#/`)
  const wrap = (sel: string) => page.locator(sel).first().evaluate((el) => getComputedStyle(el).textWrapStyle || getComputedStyle(el).textWrap)
  expect(await wrap('.ml-hm-title')).toContain('balance')
  await page.goto(`${BASE}#/privacy`)
  expect(await wrap('.ml-page-title')).toContain('balance')
})
