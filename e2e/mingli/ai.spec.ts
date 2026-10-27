import { test, expect } from 'playwright/test'
import type { Page, Route } from 'playwright/test'
import { BASE, askQuestion, prepare } from './checks'

import { drawThree, templateReading } from '../../src/mingli/tarot/engine'
import { castByNumbers } from '../../src/mingli/meihua/engine'
import { buildChart } from '../../src/mingli/ziwei/engine'

// AI 解讀畫面測試。
// 代理網址的注入方式：頁面載入前在 window 設 __MINGLI_AI_URL__（只在 vite dev 模式生效，正式版會被拿掉），
// 這裡設成同源相對網址 /__mock-ai，再用 page.route 攔截回假 JSON（同源所以不用處理 CORS）。
// 不設這個變數、也沒有 VITE_GEMINI_PROXY_URL 時前端完全不會呼叫，所以其他 spec 不受影響。
// 這個檔案不用 checks.ts 的 console 守門：回 500 時 Chrome 本來就會在 console 記一筆網路錯誤。
test.use({ viewport: { width: 390, height: 844 } })

const MOCK_URL = '/__mock-ai'

// ───────── 三種術數：怎麼走到解讀、什麼是合法的假回應 ─────────
const SEED = 4271
const PICKS: [number, number, number] = [3, 9, 17]
const drawn = drawThree(SEED, PICKS)
const tarotTone = templateReading(drawn).tone
const mei = castByNumbers(12, 34)
const chart = buildChart({ solarDate: '1990-07-05', timeIndex: 4, gender: '男' })
const chartStar = chart.palaces.flatMap((p) => p.majorStars)[0].name

type Kind = 'tarot' | 'meihua' | 'ziwei'

const SPECS: Record<Kind, {
  tone: string
  goodText: string
  // 盤上沒有的名稱（越界）
  outOfBoundsText: string
  open: (page: Page) => Promise<void>
  templateTestId: string
  template: RegExp | null
}> = {
  tarot: {
    tone: tarotTone,
    goodText: `第一張是${drawn[0].card.zh}，整體往前走`,
    outOfBoundsText: `會遇到${['權杖王牌', '聖杯二', '寶劍十'].find((n) => !drawn.some((d) => d.card.zh === n))}`,
    open: async (page) => {
      await page.goto(`${BASE}#/tarot?seed=${SEED}`)
      await askQuestion(page)
      const tap = (pos: number) => page.getByTestId('ml-fan-card').nth(pos).dispatchEvent('click')
      for (const p of PICKS) { await tap(p); await tap(p) }
    },
    templateTestId: 'ml-reading',
    template: /範例解讀/,
  },
  meihua: {
    tone: mei.tone,
    goodText: `本卦是${mei.name}，變卦是${mei.changed.name}`,
    outOfBoundsText: `像${['乾為天', '坤為地', '水火既濟'].find((n) => ![mei.name, mei.mutual.name, mei.changed.name].includes(n))}`,
    open: async (page) => {
      await page.goto(`${BASE}#/meihua?a=12&b=34`)
      await askQuestion(page)
      await page.getByTestId('ml-to-reading').click()
    },
    templateTestId: 'ml-reading',
    template: /範例解讀/,
  },
  ziwei: {
    tone: '平',
    goodText: `命盤上有${chartStar}`,
    // 真實命盤十四主星與輔星全都會出現，沒有「盤上沒有的星」可用；紫微越界檢查由 vitest 的 ai.test.ts 負責
    outOfBoundsText: '',
    open: async (page) => {
      await page.goto(`${BASE}#/ziwei?d=1990-07-05&t=4&g=男`)
      await expect(page.getByTestId('ml-chart')).toBeVisible()
      // 紫微打開不會自動呼叫，要按按鈕
      await page.getByTestId('ml-ai-ziwei-btn').click()
    },
    templateTestId: '',
    template: null,
  },
}

const CARD = { id: 'test-card-1', title: '測試卡', source: '測試來源' }

const reading = (kind: Kind, over: Record<string, unknown> = {}) => ({
  verdict: '這是 AI 寫的一句話',
  tone: SPECS[kind].tone,
  paragraphs: [
    { title: '現在', text: SPECS[kind].goodText, basis: ['依據甲'], cards: [CARD] },
    { title: '接下來', text: '慢慢來', basis: ['依據乙', '依據丙'], cards: [CARD, { id: 'test-card-2', title: '另一張', source: '來源二' }] },
  ],
  prediction: { claim: '三週內有消息', dueDate: '2099-01-01' },
  ...over,
})

// 設好代理網址與攔截；回傳會收到的請求內容
async function setup(page: Page, handle: (route: Route) => Promise<void>) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await prepare(page)
  await page.addInitScript((url) => {
    (window as unknown as { __MINGLI_AI_URL__: string }).__MINGLI_AI_URL__ = url
  }, MOCK_URL)
  const bodies: Record<string, unknown>[] = []
  await page.route(`**${MOCK_URL}`, async (route) => {
    // App 啟動時會 GET 狀態端點（同一個網址），不算解讀請求
    if (route.request().method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ai":true,"maintenance":false}' })
    bodies.push(route.request().postDataJSON())
    await handle(route)
  })
  return bodies
}

const ok = (body: unknown, delayMs = 0) => async (route: Route) => {
  if (delayMs) await new Promise((r) => setTimeout(r, delayMs))
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
}

for (const kind of ['tarot', 'meihua', 'ziwei'] as const) {
  const spec = SPECS[kind]

  test(`${kind}：AI 成功 → 顯示 ml-ai-reading（一句話＋各段＋依據），不顯示範本`, async ({ page }) => {
    const bodies = await setup(page, ok(reading(kind), 400))
    await spec.open(page)
    // 解讀中的讀取狀態先出現（紫微：按鈕停用）
    await expect(page.getByTestId('ml-ai-loading')).toBeVisible()
    if (kind === 'ziwei') await expect(page.getByTestId('ml-ai-ziwei-btn')).toBeDisabled()
    const ai = page.getByTestId('ml-ai-reading')
    await expect(ai).toBeVisible()
    await expect(page.getByTestId('ml-ai-loading')).toHaveCount(0)
    await expect(page.getByTestId('ml-ai-verdict')).toHaveText(/這是 AI 寫的一句話/)
    await expect(ai).toContainText(spec.goodText)
    await expect(page.getByTestId('ml-ai-basis')).toHaveCount(2)
    await expect(page.getByTestId('ml-ai-basis').first()).toContainText('依據甲')
    await expect(page.getByTestId('ml-ai-cards')).toHaveCount(2)
    await expect(page.getByTestId('ml-ai-cards').first()).toHaveText('知識卡：test-card-1 測試卡')
    await expect(page.getByTestId('ml-ai-cards').nth(1)).toHaveText('知識卡：test-card-1 測試卡；test-card-2 另一張')
    // 塔羅、梅花：範本整塊不見；紫微：按鈕消失，宮位說明仍是範本
    if (kind === 'ziwei') await expect(page.getByTestId('ml-ai-ziwei-btn')).toHaveCount(0)
    if (kind !== 'ziwei') {
      await expect(page.getByTestId('ml-reading')).toHaveCount(0)
      await expect(page.getByText('範例解讀')).toHaveCount(0)
    }
    // 請求是結構化的，只送一次
    expect(bodies).toHaveLength(1)
    // 紫微多帶 focus（沒選運限層時是 natal）
    expect(Object.keys(bodies[0]).sort()).toEqual(kind === 'ziwei' ? ['facts', 'focus', 'kind', 'question', 'tone'] : ['facts', 'kind', 'question', 'tone'])
    if (kind === 'ziwei') expect(bodies[0].focus).toBe('natal')
    expect(bodies[0].kind).toBe(kind)
    expect(bodies[0].tone).toBe(spec.tone)
    if (kind === 'ziwei') {
      // 生日原文不外送
      const json = JSON.stringify(bodies[0])
      expect(json).not.toContain('1990')
      expect(json).not.toContain(chart.lunarDate)
    }
  })

  const failures: [string, (route: Route) => Promise<void>][] = [
    ['後端 500', async (route) => { await route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"x"}' }) }],
    ['回壞 JSON', async (route) => { await route.fulfill({ status: 200, contentType: 'application/json', body: 'not json' }) }],
    ['tone 不一致', ok(reading(kind, { tone: SPECS[kind].tone === '凶' ? '吉' : '凶' }))],
    ['basis 是空的', ok(reading(kind, { paragraphs: [{ title: 'a', text: 'b', basis: [], cards: [CARD] }] }))],
    ['cards 是空的', ok(reading(kind, { paragraphs: [{ title: 'a', text: 'b', basis: ['x'], cards: [] }] }))],
    ['連線被中斷', async (route) => { await route.abort('failed') }],
  ]
  if (spec.outOfBoundsText) {
    failures.push(['提到盤上沒有的名稱', ok(reading(kind, { paragraphs: [{ title: 'a', text: spec.outOfBoundsText, basis: ['x'], cards: [CARD] }] }))])
  }
  for (const [name, handle] of failures) {
    test(`${kind}：${name} → ${kind === 'ziwei' ? '顯示錯誤訊息並可再按' : '退回範本並維持「範例」那行'}`, async ({ page }) => {
      await setup(page, handle)
      await spec.open(page)
      if (kind === 'ziwei') {
        await expect(page.getByTestId('ml-ai-error')).toHaveText('AI 暫時無法解讀，稍後再試')
        await expect(page.getByTestId('ml-ai-reading')).toHaveCount(0)
        await expect(page.getByTestId('ml-ai-loading')).toHaveCount(0)
        await expect(page.getByTestId('ml-ai-ziwei-btn')).toBeEnabled()
        return
      }
      const tpl = page.getByTestId(spec.templateTestId)
      await expect(tpl).toBeVisible()
      await expect(tpl).toContainText(spec.template!)
      await expect(page.getByTestId('ml-ai-reading')).toHaveCount(0)
      await expect(page.getByTestId('ml-ai-loading')).toHaveCount(0)
    })
  }
}

for (const kind of ['tarot', 'meihua', 'ziwei'] as const) {
  test(`${kind}：後端婉拒（selfharm）→ 顯示 ml-ai-refusal 與 1925／1995，不退回範本、不出現「範例解讀」`, async ({ page }) => {
    const message = '我們很在意你現在的狀態。台灣安心專線 1925（24 小時），也可以撥生命線 1995。'
    await setup(page, ok({ refusal: { kind: 'selfharm', message } }))
    await SPECS[kind].open(page)
    const box = page.getByTestId('ml-ai-refusal')
    await expect(box).toBeVisible()
    await expect(box).toContainText('1925')
    await expect(box).toContainText('1995')
    await expect(page.getByTestId('ml-ai-reading')).toHaveCount(0)
    await expect(page.getByTestId('ml-ai-loading')).toHaveCount(0)
    await expect(page.getByText('範例解讀')).toHaveCount(0)
    if (kind !== 'ziwei') await expect(page.getByTestId('ml-reading')).toHaveCount(0)
    if (kind === 'ziwei') await expect(page.getByTestId('ml-ai-error')).toHaveCount(0)
  })

  test(`${kind}：解讀帶 notice → 最上面顯示提醒 ml-ai-notice，解讀照常顯示`, async ({ page }) => {
    await setup(page, ok(reading(kind, { notice: ['medical'] })))
    await SPECS[kind].open(page)
    await expect(page.getByTestId('ml-ai-reading')).toBeVisible()
    await expect(page.getByTestId('ml-ai-notice')).toContainText('這題涉及健康')
    await expect(page.getByTestId('ml-ai-notice')).toContainText('醫師')
  })
}

test('沒有 notice 的解讀不顯示提醒', async ({ page }) => {
  await setup(page, ok(reading('tarot')))
  await SPECS.tarot.open(page)
  await expect(page.getByTestId('ml-ai-reading')).toBeVisible()
  await expect(page.getByTestId('ml-ai-notice')).toHaveCount(0)
})

test('紫微：沒按之前不送請求；按了才送；失敗後可再按，第二次成功', async ({ page }) => {
  let n = 0
  const bodies = await setup(page, async (route) => {
    n++
    if (n === 1) await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' })
    else await ok(reading('ziwei'))(route)
  })
  await page.goto(`${BASE}#/ziwei?d=1990-07-05&t=4&g=男`)
  await expect(page.getByTestId('ml-chart')).toBeVisible()
  await expect(page.getByTestId('ml-ai-ziwei-btn')).toBeVisible()
  await page.waitForTimeout(800)
  expect(bodies).toHaveLength(0)
  await page.getByTestId('ml-ai-ziwei-btn').click()
  await expect(page.getByTestId('ml-ai-error')).toBeVisible()
  await page.getByTestId('ml-ai-ziwei-btn').click()
  await expect(page.getByTestId('ml-ai-reading')).toBeVisible()
  await expect(page.getByTestId('ml-ai-error')).toHaveCount(0)
  expect(bodies).toHaveLength(2)
})

test('紫微：換一張盤（候選盤）回到按鈕狀態', async ({ page }) => {
  await setup(page, ok(reading('ziwei')))
  await page.goto(`${BASE}#/ziwei?d=1990-07-05&t=unknown&g=男`)
  await page.getByTestId('ml-candidate').nth(2).click()
  await page.getByTestId('ml-ai-ziwei-btn').click()
  await expect(page.getByTestId('ml-ai-reading')).toBeVisible()
  await page.getByTestId('ml-back-candidates').click()
  await page.getByTestId('ml-candidate').nth(5).click()
  await expect(page.getByTestId('ml-ai-ziwei-btn')).toBeVisible()
  await expect(page.getByTestId('ml-ai-reading')).toHaveCount(0)
})

test('紫微：沒設代理網址時不顯示按鈕', async ({ page }) => {
  await prepare(page)
  await page.goto(`${BASE}#/ziwei?d=1990-07-05&t=4&g=男`)
  await expect(page.getByTestId('ml-chart')).toBeVisible()
  await expect(page.getByTestId('ml-ai-ziwei-btn')).toHaveCount(0)
})
