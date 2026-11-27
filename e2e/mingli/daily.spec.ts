import type { Page } from 'playwright/test'
import { BASE, SIZES, checkLayout, expect, prepare, test } from './checks'
import { CARDS } from '../../src/mingli/tarot/cards'

// 今日一牌：同一台裝置同一天同一張、台灣 00:00 換牌、打開不呼叫 AI、按了才呼叫且同一天不重扣
test.use({ viewport: { width: 390, height: 844 } })

const MOCK_URL = '/__mock-ai'
// 台灣 2026-11-27 00:00 ＝ UTC 2026-11-26 16:00
const MIDNIGHT = Date.UTC(2026, 10, 26, 16, 0, 0)

// 設好假的 AI 代理並記下解讀請求（啟動時的狀態查詢 GET 不算）
async function withMockAi(page: Page, reading: (body: { facts: { cards: { name: string; orientation: string }[] } }) => unknown) {
  await page.addInitScript((url) => {
    (window as unknown as { __MINGLI_AI_URL__: string }).__MINGLI_AI_URL__ = url
  }, MOCK_URL)
  const bodies: Record<string, unknown>[] = []
  await page.route(`**${MOCK_URL}`, async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ai":true,"maintenance":false}' })
    const body = route.request().postDataJSON()
    bodies.push(body)
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(reading(body)) })
  })
  return bodies
}

const goodReading = (body: { facts: { cards: { name: string; orientation: string }[] } }) => {
  const c = body.facts.cards[0]
  return {
    verdict: '今天適合把話說清楚',
    tone: '平',
    paragraphs: [{ title: '今天這張牌', text: `「${c.name}」${c.orientation}提醒你慢慢來`, basis: [`${c.name}${c.orientation}`], cards: [{ id: 'T00正', title: '測試卡', source: '測試' }] }],
    prediction: { claim: '一個月內有好消息', dueDate: '2099-01-01' },
  }
}

const cardOf = async (page: Page) => (await page.getByTestId('ml-daily').getAttribute('data-card')) ?? ''

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await prepare(page)
})

test('首頁、塔羅頁都點得進今日一牌；牌名、提醒、牌義都有', async ({ page }) => {
  await page.goto(`${BASE}#/`)
  await page.getByTestId('ml-door-daily').click()
  await expect(page).toHaveURL(/#\/daily$/)
  const id = await cardOf(page)
  expect(id).toMatch(/^T\d{2}[正逆]$/)
  const card = CARDS[Number(id.slice(1, 3))]
  const orientation = id.endsWith('逆') ? '逆位' : '正位'
  await expect(page.getByTestId('ml-daily-name')).toHaveText(`${card.zh}・${orientation}`)
  await expect(page.getByTestId('ml-daily-line')).toHaveText(orientation === '逆位' ? card.reversed : card.upright)
  await expect(page.getByTestId('ml-daily-meaning')).not.toBeEmpty()
  await expect(page.getByTestId('ml-daily-card')).toHaveClass(/ml-flipped/)
  // 塔羅頁的入口
  await page.goto(`${BASE}#/tarot`)
  await page.getByTestId('ml-tarot-daily').click()
  await expect(page.getByTestId('ml-daily')).toHaveAttribute('data-card', id)
})

test('同一天重新整理、重開都是同一張；打開頁面不送任何 AI 請求', async ({ page }) => {
  const bodies = await withMockAi(page, goodReading)
  await page.clock.setFixedTime(MIDNIGHT + 3600_000)
  await page.goto(`${BASE}#/daily`)
  const first = await cardOf(page)
  for (let i = 0; i < 3; i++) {
    await page.reload()
    await expect(page.getByTestId('ml-daily')).toHaveAttribute('data-card', first)
  }
  // 同一天晚一點也一樣
  await page.clock.setFixedTime(MIDNIGHT + 23 * 3600_000)
  await page.reload()
  await expect(page.getByTestId('ml-daily')).toHaveAttribute('data-card', first)
  await expect(page.getByTestId('ml-daily-ai')).toBeVisible()
  expect(bodies).toHaveLength(0)
})

test('台灣 00:00 換日：日期跟著換，30 天裡不會天天同一張', async ({ page }) => {
  await page.clock.setFixedTime(MIDNIGHT - 1000)
  await page.goto(`${BASE}#/daily`)
  await expect(page.getByTestId('ml-daily')).toContainText('11/26')
  await page.clock.setFixedTime(MIDNIGHT)
  await page.reload()
  await expect(page.getByTestId('ml-daily')).toContainText('11/27')
  const seen = new Set<string>()
  for (let d = 0; d < 30; d++) {
    await page.clock.setFixedTime(MIDNIGHT + d * 86400_000 + 60_000)
    await page.reload()
    seen.add(await cardOf(page))
  }
  expect(seen.size).toBeGreaterThan(15)
})

test('AI 詳細解讀：按了才送一次，同一天重新整理直接顯示、不再扣次數', async ({ page }) => {
  const bodies = await withMockAi(page, goodReading)
  await page.clock.setFixedTime(MIDNIGHT + 3600_000)
  await page.goto(`${BASE}#/daily`)
  await expect(page.getByTestId('ml-daily-note')).toContainText('會用掉一次 AI 次數')
  await page.getByTestId('ml-daily-ai').click()
  await expect(page.getByTestId('ml-ai-reading')).toBeVisible()
  await expect(page.getByTestId('ml-ai-verdict')).toContainText('今天適合把話說清楚')
  expect(bodies).toHaveLength(1)
  // 送出去的是一張牌、固定問題、標明今日一牌，跟畫面上的牌一致
  const id = await cardOf(page)
  const sent = bodies[0] as { kind: string; question: string; facts: { spread: string; cards: { name: string; orientation: string }[] } }
  expect(sent.kind).toBe('tarot')
  expect(sent.question).toBe('今天要注意什麼？')
  expect(sent.facts.spread).toBe('今日一牌')
  expect(sent.facts.cards).toHaveLength(1)
  expect(sent.facts.cards[0].name).toBe(CARDS[Number(id.slice(1, 3))].zh)
  await expect(page.getByTestId('ml-daily-ai')).toHaveCount(0)
  await page.reload()
  await expect(page.getByTestId('ml-ai-reading')).toBeVisible()
  await expect(page.getByTestId('ml-daily-ai')).toHaveCount(0)
  expect(bodies).toHaveLength(1)
  // 隔天存好的解讀不算數，又回到按鈕
  await page.clock.setFixedTime(MIDNIGHT + 86400_000 + 3600_000)
  await page.reload()
  await expect(page.getByTestId('ml-ai-reading')).toHaveCount(0)
  await expect(page.getByTestId('ml-daily-ai')).toBeVisible()
  expect(bodies).toHaveLength(1)
})

test.describe('AI 失敗', () => {
  test.use({ consoleAllow: [/status of 500/] })
  test('失敗顯示原因與求助專線，按鈕還在、再按會重送', async ({ page }) => {
    let fail = true
    const bodies = await withMockAi(page, () => ({}))
    await page.unroute(`**${MOCK_URL}`)
    await page.route(`**${MOCK_URL}`, async (route) => {
      if (route.request().method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ai":true,"maintenance":false}' })
      const body = route.request().postDataJSON()
      bodies.push(body)
      if (fail) return route.fulfill({ status: 500, body: 'x' })
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(goodReading(body)) })
    })
    await page.goto(`${BASE}#/daily`)
    await page.getByTestId('ml-daily-ai').click()
    await expect(page.getByTestId('ml-daily-fail')).toBeVisible()
    await expect(page.getByTestId('ml-ai-help')).toBeVisible()
    fail = false
    await page.getByTestId('ml-daily-ai').click()
    await expect(page.getByTestId('ml-ai-reading')).toBeVisible()
    expect(bodies).toHaveLength(2)
  })
})

test('沒接 AI 的環境不顯示 AI 按鈕，也不提 AI 次數', async ({ page }) => {
  await page.goto(`${BASE}#/daily`)
  await expect(page.getByTestId('ml-daily-name')).toBeVisible()
  await expect(page.getByTestId('ml-daily-ai')).toHaveCount(0)
  await expect(page.getByTestId('ml-daily-note')).toHaveText('台灣時間每天 00:00 換新牌')
})

for (const size of SIZES) {
  test(`版面：${size.name} ${size.width} 寬沒有橫向捲動、字沒被切`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height })
    await withMockAi(page, goodReading)
    await page.goto(`${BASE}#/daily`)
    await expect(page.getByTestId('ml-daily-meaning')).not.toBeEmpty()
    expect(await checkLayout(page)).toEqual([])
    await page.getByTestId('ml-daily-ai').click()
    await expect(page.getByTestId('ml-ai-reading')).toBeVisible()
    expect(await checkLayout(page)).toEqual([])
  })
}
