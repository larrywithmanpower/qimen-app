import { test, expect } from './checks'
import type { Page, Route } from 'playwright/test'
import { BASE, askQuestion, checkLayout, prepare } from './checks'
import { drawThree, templateReading } from '../../src/mingli/tarot/engine'
import { castByNumbers } from '../../src/mingli/meihua/engine'

// 塔羅、梅花解讀完繼續追問，以及三個術數的「補充近況」。用 page.route 攔截代理網址
test.use({ viewport: { width: 390, height: 844 } })

const MOCK_URL = '/__mock-ai'
const SEED = 4271
const PICKS: [number, number, number] = [3, 9, 17]
const drawn = drawThree(SEED, PICKS)
const tarotTone = templateReading(drawn).tone
const mei = castByNumbers(12, 34)
const CARD = { id: 'fu-card-1', title: '追問卡', source: '追問來源' }

type Kind = 'tarot' | 'meihua'
const TONE: Record<Kind, string> = { tarot: tarotTone, meihua: mei.tone }

const reading = (kind: Kind) => ({
  verdict: '這是 AI 寫的一句話',
  tone: TONE[kind],
  paragraphs: [{ title: '現在', text: '慢慢來', basis: ['依據甲'], cards: [{ id: 'test-card', title: '測試卡', source: '測試來源' }] }],
  prediction: { claim: '三週內有消息', dueDate: '2099-01-01' },
})
const json = (body: unknown, status = 200) => async (route: Route) => {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
}
const answer = (text: string) => ({ followup: { action: 'answer', text, basis: ['追問依據'], cards: [CARD] } })

type Body = Record<string, unknown> & { mode?: string; kind: string; question: string; context?: string; history: { q: string; a: string }[] }

async function setup(page: Page, kind: Kind, followups: ((route: Route) => Promise<void>)[]) {
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
    // 吉凶照請求回，重新抽到別的牌也能通過檢查
    return json({ ...reading(kind), tone: body.tone })(route)
  })
  return { readings, fups }
}

// 打開、填問題（可帶近況），走到 AI 解讀成功
async function open(page: Page, kind: Kind, context = '') {
  await page.goto(`${BASE}#/${kind === 'tarot' ? `tarot?seed=${SEED}` : 'meihua?a=12&b=34'}`)
  if (context) {
    await page.getByTestId('ml-context-open').click()
    await page.getByTestId('ml-context-input').fill(context)
  }
  await askQuestion(page)
  if (kind === 'tarot') {
    const tap = (pos: number) => page.getByTestId('ml-fan-card').nth(pos).dispatchEvent('click')
    for (const p of PICKS) { await tap(p); await tap(p) }
  } else {
    await page.getByTestId('ml-to-reading').click()
  }
  await expect(page.getByTestId('ml-ai-reading')).toBeVisible()
}

async function ask(page: Page, q: string) {
  await page.getByTestId('ml-followup-input').fill(q)
  await page.getByTestId('ml-followup-send').click()
}

for (const kind of ['tarot', 'meihua'] as const) {
  test(`${kind}：解讀成功後可追問，請求帶 kind／history（含解讀）／吉凶，不帶 focus`, async ({ page }) => {
    const { fups } = await setup(page, kind, [json(answer('先把手上的事做完')), json(answer('第二個回答'))])
    await open(page, kind)
    // 解讀只顯示一次（串裡不重複），還沒追問時沒有「清除對話」
    await expect(page.getByTestId('ml-ai-reading')).toHaveCount(1)
    await expect(page.getByTestId('ml-followup-clear')).toHaveCount(0)
    await ask(page, '那我該怎麼做')
    const item = page.getByTestId('ml-followup-item')
    await expect(item).toHaveCount(1)
    await expect(item).toContainText('那我該怎麼做')
    await expect(item).toContainText('先把手上的事做完')
    await expect(page.getByTestId('ml-followup-basis')).toContainText('追問依據')
    await expect(page.getByTestId('ml-followup-input')).toHaveValue('')
    expect(fups[0]).toMatchObject({ kind, mode: 'followup', question: '那我該怎麼做', tone: TONE[kind] })
    expect('focus' in fups[0]).toBe(false)
    expect(fups[0].history).toHaveLength(1)
    expect(fups[0].history[0].a).toContain('這是 AI 寫的一句話')
    // 第二問的 history 帶上第一問
    await ask(page, '還有呢')
    await expect(item).toHaveCount(2)
    expect(fups[1].history.map((h) => h.q)).toEqual([expect.any(String), '那我該怎麼做'])
    // 第三問：history 依時間順序（解讀 → 第一問 → 第二問）
    await ask(page, '最後一題')
    await expect(item).toHaveCount(3)
    expect(fups[2].history.map((h) => h.q)).toEqual([expect.any(String), '那我該怎麼做', '還有呢'])
    // 清除對話：追問清掉、解讀留著、還能再問
    await page.getByTestId('ml-followup-clear').click()
    await expect(item).toHaveCount(0)
    await expect(page.getByTestId('ml-ai-reading')).toBeVisible()
    await expect(page.getByTestId('ml-followup-input')).toBeVisible()
    expect(await checkLayout(page)).toEqual([])
  })

  test(`${kind}：回答越界（沒抽到的牌／不是動爻）→ 顯示錯誤與 1925，不進對話串`, async ({ page }) => {
    const bad = kind === 'tarot'
      ? `「${['權杖王牌', '聖杯二', '寶劍十'].find((n) => !drawn.some((d) => d.card.zh === n))}」代表新機會`
      : `${[1, 2, 3, 4, 5, 6].map((n) => ['初', '二', '三', '四', '五', '上'][n - 1]).find((_, i) => i + 1 !== mei.moving)}爻是關鍵`
    await setup(page, kind, [json(answer(bad))])
    await open(page, kind)
    await ask(page, '再說細一點')
    await expect(page.getByTestId('ml-followup-error')).toHaveText('AI 暫時無法回答，稍後再試')
    await expect(page.getByTestId('ml-ai-help')).toContainText('1925')
    await expect(page.getByTestId('ml-followup-item')).toHaveCount(0)
  })

  test(`${kind}：近況有填才送、抽牌／起卦後只能看不能改；換一次就清掉追問`, async ({ page }) => {
    const { readings } = await setup(page, kind, [json(answer('回答'))])
    await open(page, kind, '  剛換工作三個月  ')
    expect(readings[0].context).toBe('剛換工作三個月')
    await expect(page.getByTestId('ml-context-input')).toHaveCount(0)
    await expect(page.getByTestId('ml-context-view')).toHaveText('你的近況：剛換工作三個月')
    await ask(page, '那我該怎麼做')
    await expect(page.getByTestId('ml-followup-item')).toHaveCount(1)
    // 重新抽／重新起卦：追問清掉
    if (kind === 'tarot') {
      await page.getByTestId('ml-again').click()
      // 新的一輪（牌序換了）不帶舊追問
      const tap = (pos: number) => page.getByTestId('ml-fan-card').nth(pos).dispatchEvent('click')
      for (const p of PICKS) { await tap(p); await tap(p) }
      await expect(page.getByTestId('ml-ai-reading')).toBeVisible()
      await expect(page.getByTestId('ml-followup-input')).toBeVisible()
      await expect(page.getByTestId('ml-followup-item')).toHaveCount(0)
      return
    } else {
      // 解讀畫面先回卦象：同一卦再看解讀，追問還在
      await page.getByTestId('ml-back-hex').click()
      await page.getByTestId('ml-to-reading').click()
      await expect(page.getByTestId('ml-followup-item')).toHaveCount(1)
      await page.getByTestId('ml-back-hex').click()
      await page.getByTestId('ml-cast').click()
    }
    await expect(page.getByTestId('ml-followup-item')).toHaveCount(0)
    await expect(page.getByTestId('ml-followup-input')).toHaveCount(0)
  })
}

test('近況沒填就不送 context；輸入框最多 300 字並顯示字數', async ({ page }) => {
  const { readings } = await setup(page, 'tarot', [json(answer('回答'))])
  await page.goto(`${BASE}#/tarot?seed=${SEED}`)
  await page.getByTestId('ml-context-open').click()
  const input = page.getByTestId('ml-context-input')
  await expect(input).toHaveAttribute('maxlength', '300')
  await input.fill('近況')
  await expect(page.locator('.ml-ctx-hint')).toContainText('2/300')
  await input.fill('')
  await askQuestion(page)
  const tap = (pos: number) => page.getByTestId('ml-fan-card').nth(pos).dispatchEvent('click')
  for (const p of PICKS) { await tap(p); await tap(p) }
  await expect(page.getByTestId('ml-ai-reading')).toBeVisible()
  expect('context' in readings[0]).toBe(false)
})

test('沒設代理網址時不顯示近況欄', async ({ page }) => {
  await prepare(page)
  await page.goto(`${BASE}#/tarot?seed=${SEED}`)
  await expect(page.getByTestId('ml-question-input')).toBeVisible()
  await expect(page.getByTestId('ml-context-open')).toHaveCount(0)
})

test('紫微：近況送進解讀與追問；改近況回到按鈕狀態', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await prepare(page)
  await page.addInitScript((url) => {
    (window as unknown as { __MINGLI_AI_URL__: string }).__MINGLI_AI_URL__ = url
  }, MOCK_URL)
  const bodies: Body[] = []
  await page.route(`**${MOCK_URL}`, async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ai":true,"maintenance":false}' })
    const body = route.request().postDataJSON() as Body
    bodies.push(body)
    return json(body.mode === 'followup' ? answer('回答') : { ...reading('tarot'), tone: '平' })(route)
  })
  await page.goto(`${BASE}#/ziwei?d=1990-07-05&t=4&g=${encodeURIComponent('男')}`)
  await expect(page.getByTestId('ml-chart')).toBeVisible()
  await page.getByTestId('ml-context-open').click()
  await page.getByTestId('ml-context-input').fill('在考慮要不要搬家')
  await page.getByTestId('ml-ai-ziwei-btn').click()
  await expect(page.getByTestId('ml-ai-reading')).toBeVisible()
  expect(bodies[0].context).toBe('在考慮要不要搬家')
  await ask(page, '那明年呢')
  await expect(page.getByTestId('ml-followup-item')).toHaveCount(1)
  expect(bodies[1]).toMatchObject({ kind: 'ziwei', mode: 'followup', context: '在考慮要不要搬家' })
  // 改近況：按鈕再出現
  await page.getByTestId('ml-context-input').fill('在考慮換工作')
  await expect(page.getByTestId('ml-ai-ziwei-btn')).toBeVisible()
})

test('對話樣式：建議問題點了直接送、問過就收起；解讀各段收合可再展開；輸入列黏在分頁列上方', async ({ page }) => {
  const { fups } = await setup(page, 'tarot', [json(answer('回答一'))])
  await open(page, 'tarot')
  const sugs = page.getByTestId('ml-followup-sug')
  await expect(sugs).toHaveText(['現在那張再講細一點', '那我該怎麼做？', '要注意什麼？'])
  // 各段一開始是展開的；捲到第一段中間時輸入列仍在畫面內、在分頁列上方
  const paras = page.locator('.ml-ai-para')
  await expect(paras).toHaveCount(1)
  await expect(paras.first()).toHaveAttribute('open', '')
  await paras.first().locator('.ml-ai-text').scrollIntoViewIfNeeded()
  // 測試解讀很短，畫面放得下；另外確認是黏底定位，長解讀時才會跟著畫面
  expect(await page.locator('.ml-followup-dock').evaluate((el) => getComputedStyle(el).position)).toBe('sticky')
  const dock = await page.locator('.ml-followup-dock').boundingBox()
  const bar = await page.locator('.ml-tabbar').boundingBox()
  expect(dock && bar && dock.y + dock.height <= bar.y && dock.y > 0).toBe(true)
  // 點建議問題：直接送出、泡泡出現，建議消失
  await sugs.nth(1).click()
  await expect(page.getByTestId('ml-followup-item')).toHaveCount(1)
  expect(fups[0].question).toBe('那我該怎麼做？')
  await expect(page.locator('.ml-chat-q').first()).toHaveText('那我該怎麼做？')
  await expect(sugs).toHaveCount(0)
  // 問過之後解讀各段收起（一句話留著），點標題可展開
  await expect(paras.first()).not.toHaveAttribute('open', '')
  await expect(page.getByTestId('ml-ai-verdict')).toBeVisible()
  await expect(paras.first().locator('.ml-ai-text')).toBeHidden()
  await paras.first().locator('summary').click()
  await expect(paras.first().locator('.ml-ai-text')).toBeVisible()
  // 清除對話：建議問題回來、各段展開
  await page.getByTestId('ml-followup-clear').click()
  await expect(sugs).toHaveCount(3)
  await expect(paras.first()).toHaveAttribute('open', '')
  expect(await checkLayout(page)).toEqual([])
})

test('建議問題送不出去（回答沒過檢查）就放回輸入框', async ({ page }) => {
  // 回答提到不是動爻的爻 → 前端判失敗
  const other = ['初', '二', '三', '四', '五', '上'].find((_, i) => i + 1 !== mei.moving)
  await setup(page, 'meihua', [json(answer(`${other}爻是關鍵`))])
  await open(page, 'meihua')
  await page.getByTestId('ml-followup-sug').first().click()
  await expect(page.getByTestId('ml-followup-error')).toBeVisible()
  await expect(page.getByTestId('ml-followup-input')).toHaveValue('動爻在說什麼？')
})
