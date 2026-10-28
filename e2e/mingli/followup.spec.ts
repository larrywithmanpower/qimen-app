import { test, expect } from './checks'
import type { Page, Route } from 'playwright/test'
import { BASE, checkLayout, prepare } from './checks'
import { buildChart } from '../../src/mingli/ziwei/engine'

// 紫微解讀完繼續追問。用 page.route 攔截代理網址，依 request body 的 mode 區分解讀與追問
test.use({ viewport: { width: 390, height: 844 } })

const MOCK_URL = '/__mock-ai'
const HASH = `#/ziwei?d=1990-07-05&t=4&g=${encodeURIComponent('男')}`
const chart = buildChart({ solarDate: '1990-07-05', timeIndex: 4, gender: '男' })
const star = chart.palaces.flatMap((p) => p.majorStars)[0].name
const CARD = { id: 'fu-card-1', title: '追問卡', source: '追問來源' }

const READING = {
  verdict: '這是 AI 寫的一句話',
  tone: '平',
  paragraphs: [{ title: '現在', text: '慢慢來', basis: ['依據甲'], cards: [{ id: 'test-card', title: '測試卡', source: '測試來源' }] }],
  prediction: { claim: '三週內有消息', dueDate: '2099-01-01' },
}
const json = (body: unknown, status = 200) => async (route: Route) => {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
}
const answer = (text: string, over: Record<string, unknown> = {}) => ({
  followup: { action: 'answer', text, basis: ['追問依據'], cards: [CARD], ...over },
})

type Body = Record<string, unknown> & { mode?: string; question: string; focus: string; facts: { horoscope?: { date: string; focus: string } }; history: { q: string; a: string }[] }

// 設好攔截：解讀固定成功；追問依序用 followups 裡的回應（用完就重複最後一個）
async function setup(page: Page, followups: ((route: Route) => Promise<void>)[], reading: (route: Route) => Promise<void> = json(READING)) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await prepare(page)
  await page.addInitScript((url) => {
    (window as unknown as { __MINGLI_AI_URL__: string }).__MINGLI_AI_URL__ = url
  }, MOCK_URL)
  const readings: Body[] = []
  const fups: Body[] = []
  await page.route(`**${MOCK_URL}`, async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ai":true,"maintenance":false}' })
    const body = route.request().postDataJSON() as Body
    if (body.mode === 'followup') {
      fups.push(body)
      return followups[Math.min(fups.length - 1, followups.length - 1)](route)
    }
    readings.push(body)
    return reading(route)
  })
  return { readings, fups }
}

async function openWithReading(page: Page) {
  await page.goto(`${BASE}${HASH}`)
  await expect(page.getByTestId('ml-chart')).toBeVisible()
  await expect(page.getByTestId('ml-followup-input')).toHaveCount(0)
  await page.getByTestId('ml-ai-ziwei-btn').click()
  await expect(page.getByTestId('ml-ai-reading')).toBeVisible()
  await expect(page.getByTestId('ml-followup-input')).toBeVisible()
}

async function ask(page: Page, q: string) {
  await page.getByTestId('ml-followup-input').fill(q)
  await page.getByTestId('ml-followup-send').click()
}

test('解讀成功後出現輸入框；空白不能送；answer 顯示回答、依據、知識卡，請求帶 mode／history／facts', async ({ page }) => {
  const { readings, fups } = await setup(page, [json({ ...answer(`看到${star}在命宮`), notice: ['medical'] })])
  await openWithReading(page)
  expect(readings).toHaveLength(1)
  expect(readings[0].mode).toBeUndefined()
  const input = page.getByTestId('ml-followup-input')
  await expect(input).toHaveAttribute('placeholder', '接著問，例如：那明年呢？感情那段再講細一點')
  await expect(page.getByTestId('ml-followup-send')).toBeDisabled()
  await input.fill('   ')
  await expect(page.getByTestId('ml-followup-send')).toBeDisabled()

  await ask(page, '那明年呢')
  await expect(page.getByTestId('ml-followup-item')).toHaveCount(1)
  const item = page.getByTestId('ml-followup-item')
  await expect(item).toHaveAttribute('data-action', 'answer')
  await expect(item).toContainText('問：那明年呢')
  await expect(item).toContainText(`看到${star}在命宮`)
  await expect(item.getByTestId('ml-ai-notice')).toContainText('這題涉及健康')
  await expect(item.getByTestId('ml-followup-basis')).toHaveText('依據：追問依據')
  await expect(item.getByTestId('ml-followup-cards')).toHaveText('知識卡：fu-card-1 追問卡')
  await expect(input).toHaveValue('')
  // 解讀還在串的最前面
  await expect(page.getByTestId('ml-followup-thread').getByTestId('ml-ai-reading')).toHaveCount(1)

  expect(fups).toHaveLength(1)
  const b = fups[0]
  expect(b.kind).toBe('ziwei')
  expect(b.mode).toBe('followup')
  expect(b.question).toBe('那明年呢')
  expect(b.tone).toBe('平')
  expect(b.focus).toBe('natal')
  expect(b.facts).toEqual(readings[0].facts)
  expect(b.history).toHaveLength(1)
  expect(b.history[0].q).toBe('整體運勢')
  expect(b.history[0].a).toContain('這是 AI 寫的一句話')
  expect(b.history[0].a).toContain('慢慢來')
  expect(JSON.stringify(b)).not.toContain('1990')

  // 第二則追問：history 變兩筆，舊的在前
  await ask(page, '感情呢')
  await expect(page.getByTestId('ml-followup-item')).toHaveCount(2)
  expect(fups[1].history).toHaveLength(2)
  expect(fups[1].history[1]).toEqual({ q: '那明年呢', a: `看到${star}在命宮` })
})

test('cards、refuse 各顯示對', async ({ page }) => {
  await setup(page, [
    json({ followup: { action: 'cards', text: '可以參考這張卡', basis: [], cards: [CARD] } }),
    json({ followup: { action: 'refuse', text: '這個問題不在紫微能回答的範圍' } }),
  ])
  await openWithReading(page)
  await ask(page, '給我卡')
  const first = page.getByTestId('ml-followup-item').nth(0)
  await expect(first).toHaveAttribute('data-action', 'cards')
  await expect(first).toContainText('可以參考這張卡')
  await expect(first.getByTestId('ml-followup-cards')).toHaveText('知識卡：fu-card-1 追問卡')
  await expect(first.getByTestId('ml-followup-basis')).toHaveCount(0)
  await ask(page, '股票漲不漲')
  const second = page.getByTestId('ml-followup-item').nth(1)
  await expect(second).toHaveAttribute('data-action', 'refuse')
  await expect(second).toContainText('這個問題不在紫微能回答的範圍')
  await expect(second.getByTestId('ml-followup-cards')).toHaveCount(0)
})

test('recompute：頁面切到目標層與日期，自動再送一次，第二次的 facts 是新層', async ({ page }) => {
  const { fups } = await setup(page, [
    json({ followup: { action: 'recompute', text: '先幫你切到 2027 年的流年', target: { focus: 'yearly', date: '2027-03-05' } } }),
    json(answer('明年整體平穩')),
  ])
  await openWithReading(page)
  await ask(page, '那明年呢')
  await expect(page.getByTestId('ml-followup-item')).toHaveCount(2)
  await expect(page.getByTestId('ml-chart')).toHaveAttribute('data-layer', 'yearly')
  await expect(page.getByTestId('ml-query-date')).toHaveAttribute('data-value', '2027-03-05')
  expect(fups).toHaveLength(2)
  expect(fups[0].focus).toBe('natal')
  expect(fups[0].facts.horoscope).toBeUndefined()
  expect(fups[1].focus).toBe('yearly')
  expect(fups[1].question).toBe('那明年呢')
  expect(fups[1].facts.horoscope?.focus).toBe('yearly')
  expect(fups[1].facts.horoscope?.date).toBe('2027-03-05')
  // 重送時 history 已含那句說明
  expect(fups[1].history.at(-1)).toEqual({ q: '那明年呢', a: '先幫你切到 2027 年的流年' })
  await expect(page.getByTestId('ml-followup-item').nth(0)).toHaveAttribute('data-action', 'recompute')
  await expect(page.getByTestId('ml-followup-item').nth(0)).toContainText('先幫你切到 2027 年的流年')
  await expect(page.getByTestId('ml-followup-item').nth(1)).toHaveAttribute('data-action', 'answer')
})

test('recompute 第二次又回 recompute：只顯示說明，不再送', async ({ page }) => {
  const { fups } = await setup(page, [
    json({ followup: { action: 'recompute', text: '切到明年', target: { focus: 'yearly', date: '2027-03-05' } } }),
    json({ followup: { action: 'recompute', text: '再切到下個月', target: { focus: 'monthly', date: '2027-04-05' } } }),
  ])
  await openWithReading(page)
  await ask(page, '那明年呢')
  await expect(page.getByTestId('ml-followup-item')).toHaveCount(2)
  await page.waitForTimeout(800)
  expect(fups).toHaveLength(2)
  await expect(page.getByTestId('ml-followup-item').nth(1)).toHaveAttribute('data-action', 'recompute')
  await expect(page.getByTestId('ml-followup-item').nth(1)).toContainText('再切到下個月')
  await expect(page.getByTestId('ml-followup-send')).toBeDisabled() // 輸入框已清空
  await expect(page.getByTestId('ml-ai-loading')).toHaveCount(0)
})

test('追問回 selfharm 婉拒：顯示 1925，不進對話串', async ({ page }) => {
  await setup(page, [json({ refusal: { kind: 'selfharm', message: '我們很在意你。安心專線 1925，生命線 1995。' } })])
  await openWithReading(page)
  await ask(page, '不想活了')
  await expect(page.getByTestId('ml-ai-refusal')).toContainText('1925')
  await expect(page.getByTestId('ml-followup-item')).toHaveCount(0)
  await expect(page.getByTestId('ml-followup-error')).toHaveCount(0)
})

test('追問失敗（格式不對）：顯示錯誤與 1925 專線，問題保留可重送，之後成功', async ({ page }) => {
  await setup(page, [json({ followup: { action: 'answer', text: '一定會成功', basis: [], cards: [CARD] } }), json(answer('這次好了'))])
  await openWithReading(page)
  await ask(page, '會成功嗎')
  await expect(page.getByTestId('ml-followup-error')).toHaveText('AI 暫時無法回答，稍後再試')
  await expect(page.getByTestId('ml-ai-help')).toContainText('1925')
  await expect(page.getByTestId('ml-followup-item')).toHaveCount(0)
  await expect(page.getByTestId('ml-followup-input')).toHaveValue('會成功嗎')
  await page.getByTestId('ml-followup-send').click()
  await expect(page.getByTestId('ml-followup-item')).toContainText('這次好了')
  await expect(page.getByTestId('ml-followup-error')).toHaveCount(0)
  await expect(page.getByTestId('ml-ai-help')).toHaveCount(0)
})

test('送出中停用並顯示讀取中', async ({ page }) => {
  await setup(page, [async (route) => { await new Promise((r) => setTimeout(r, 600)); await json(answer('慢慢回'))(route) }])
  await openWithReading(page)
  await ask(page, '問個問題')
  await expect(page.getByTestId('ml-ai-loading')).toBeVisible()
  await expect(page.getByTestId('ml-followup-send')).toBeDisabled()
  await expect(page.getByTestId('ml-followup-item')).toContainText('慢慢回')
  await expect(page.getByTestId('ml-ai-loading')).toHaveCount(0)
})

test('重新整理後整串還在，輸入框還在且能接著問；新解讀加到同一串後面', async ({ page }) => {
  const { fups } = await setup(page, [json(answer('第一則回答')), json(answer('第二則回答'))])
  await openWithReading(page)
  await ask(page, '第一問')
  await expect(page.getByTestId('ml-followup-item')).toHaveCount(1)
  await page.reload()
  await expect(page.getByTestId('ml-chart')).toBeVisible()
  await expect(page.getByTestId('ml-followup-thread').getByTestId('ml-ai-reading')).toHaveCount(1)
  await expect(page.getByTestId('ml-followup-item')).toHaveCount(1)
  await expect(page.getByTestId('ml-followup-item')).toContainText('第一則回答')
  await ask(page, '第二問')
  await expect(page.getByTestId('ml-followup-item')).toHaveCount(2)
  expect(fups[1].history).toHaveLength(2)
  expect(fups[1].history[0].q).toBe('整體運勢')
  expect(fups[1].history[1].q).toBe('第一問')
  // 再按一次「AI 解讀這張盤」：新解讀接在後面
  await page.getByTestId('ml-ai-ziwei-btn').click()
  await expect(page.getByTestId('ml-ai-reading')).toHaveCount(2)
  await expect(page.getByTestId('ml-followup-thread').locator(':scope > *').last().getByTestId('ml-ai-reading')).toHaveCount(1)
  await page.reload()
  await expect(page.getByTestId('ml-ai-reading')).toHaveCount(2)
  await expect(page.getByTestId('ml-followup-item')).toHaveCount(2)
})

test('「清除對話」清掉整串，重新整理也不會回來', async ({ page }) => {
  await setup(page, [json(answer('回答'))])
  await openWithReading(page)
  await ask(page, '問')
  await expect(page.getByTestId('ml-followup-item')).toHaveCount(1)
  await page.getByTestId('ml-followup-clear').click()
  await expect(page.getByTestId('ml-followup-thread')).toHaveCount(0)
  await expect(page.getByTestId('ml-followup-input')).toHaveCount(0)
  await page.reload()
  await expect(page.getByTestId('ml-chart')).toBeVisible()
  // 等本機紀錄讀完再查，不然還沒讀出來就會誤判「沒有對話」
  await expect(page.locator('[data-followup-loaded="true"]')).toHaveCount(1)
  await expect(page.getByTestId('ml-followup-thread')).toHaveCount(0)
  await expect(page.getByTestId('ml-followup-input')).toHaveCount(0)
})

test('「清除這台裝置上的生辰」一起清掉這張盤的對話', async ({ page }) => {
  await setup(page, [json(answer('回答'))])
  await openWithReading(page)
  await ask(page, '問')
  await expect(page.getByTestId('ml-followup-item')).toHaveCount(1)
  await page.getByTestId('ml-clear-birth').click()
  await expect(page.getByTestId('ml-birth-form')).toBeVisible()
  await page.reload() // 網址仍帶同一組生辰
  await expect(page.getByTestId('ml-chart')).toBeVisible()
  await expect(page.locator('[data-followup-loaded="true"]')).toHaveCount(1)
  await expect(page.getByTestId('ml-followup-thread')).toHaveCount(0)
  await expect(page.getByTestId('ml-followup-input')).toHaveCount(0)
  await expect(page.getByTestId('ml-ai-ziwei-btn')).toBeVisible()
})

for (const [width, height] of [[390, 844], [820, 1180], [1440, 900]]) {
  test(`${width} 寬：有對話串時沒有橫向捲動，輸入框與送出鈕點擊區 44px 以上`, async ({ page }) => {
    await setup(page, [json(answer(`看到${star}在命宮，慢慢來`))])
    await page.setViewportSize({ width, height })
    await openWithReading(page)
    await ask(page, '那明年呢，感情那段再講細一點')
    await expect(page.getByTestId('ml-followup-item')).toHaveCount(1)
    await page.getByTestId('ml-followup-input').fill('下一個問題')
    await page.getByTestId('ml-followup-input').scrollIntoViewIfNeeded()
    for (const id of ['ml-followup-input', 'ml-followup-send', 'ml-followup-clear']) {
      const box = await page.getByTestId(id).boundingBox()
      expect(box!.height, `${width} ${id} 高`).toBeGreaterThanOrEqual(44)
      expect(box!.width, `${width} ${id} 寬`).toBeGreaterThanOrEqual(44)
    }
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(over, `${width} 橫向捲動`).toBeLessThanOrEqual(0)
    expect(await checkLayout(page), `${width} 版面`).toEqual([])
  })
}
