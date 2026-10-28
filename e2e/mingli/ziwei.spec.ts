import { test, expect } from './checks'
import type { Page } from 'playwright/test'
import { BASE, DEFAULT_QUESTION, askQuestion, checkLayout, pickDate, prepare } from './checks'

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildChart, candidates, horoscope, timeIndexOf } from '../../src/mingli/ziwei/engine'

// 只在手機尺寸 390×844 跑
test.use({ viewport: { width: 390, height: 844 } })

const DATE = '1990-07-05'
const TIME_INDEX = 4 // 辰時

async function openForm(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await prepare(page)
  await page.goto(`${BASE}#/ziwei`)
  await expect(page.getByTestId('ml-birth-form')).toBeVisible()
}

async function fill(page: Page, time: string) {
  await pickDate(page, DATE)
  await page.getByTestId(time).click()
  await page.getByTestId('ml-gender-男').click()
}

test('填 1990-07-05 辰時男：十二宮主星與命宮等於 buildChart', async ({ page }) => {
  await openForm(page)
  await fill(page, `ml-time-${TIME_INDEX}`)
  await page.getByTestId('ml-make-chart').click()
  await expect(page.getByTestId('ml-chart')).toBeVisible()

  const facts = buildChart({ solarDate: DATE, timeIndex: TIME_INDEX, gender: '男' })
  await expect(page.getByTestId('ml-palace')).toHaveCount(12)
  const got = await page.getByTestId('ml-palace').evaluateAll((els) =>
    Object.fromEntries(els.map((e) => [e.getAttribute('data-branch'), e.getAttribute('data-stars')])),
  )
  const want = Object.fromEntries(facts.palaces.map((p) => [p.branch, p.majorStars.map((s) => s.name).join(',')]))
  expect(got).toEqual(want)
  const soul = page.locator('[data-testid="ml-palace"][data-soul="true"]')
  await expect(soul).toHaveCount(1)
  await expect(soul).toHaveAttribute('data-branch', facts.soulBranch)
  await expect(page.getByTestId('ml-soul')).toContainText(`命主 ${facts.soul}・身主 ${facts.body}`)
})

test('不知道時辰：13 張候選卡，點一張進盤再回清單', async ({ page }) => {
  await openForm(page)
  await fill(page, 'ml-time-unknown')
  await page.getByTestId('ml-make-chart').click()
  await expect(page.getByTestId('ml-candidate')).toHaveCount(13)

  const cands = candidates(DATE, '男')
  const soulOf = (i: number) => {
    const p = cands[i].palaces.find((x) => x.isSoul)!
    return p.majorStars.length ? p.majorStars.map((s) => s.name).join('、') : '空宮'
  }
  await expect(page.getByTestId('ml-candidate').nth(7)).toContainText(`命宮 ${soulOf(7)}`)
  expect(await checkLayout(page)).toEqual([])

  await page.getByTestId('ml-candidate').nth(7).click()
  await expect(page.getByTestId('ml-chart')).toBeVisible()
  const soul = page.locator('[data-testid="ml-palace"][data-soul="true"]')
  await expect(soul).toHaveAttribute('data-branch', cands[7].soulBranch)

  await page.getByTestId('ml-back-candidates').click()
  await expect(page.getByTestId('ml-candidate')).toHaveCount(13)
})

test('點一宮說明卡更新；輸入頁、命盤版面檢查沒有問題', async ({ page }) => {
  await openForm(page)
  await fill(page, `ml-time-${TIME_INDEX}`)
  expect(await checkLayout(page)).toEqual([])
  await page.getByTestId('ml-make-chart').click()
  await expect(page.getByTestId('ml-chart')).toBeVisible()

  const facts = buildChart({ solarDate: DATE, timeIndex: TIME_INDEX, gender: '男' })
  const detail = page.getByTestId('ml-palace-detail')
  await expect(detail).toHaveAttribute('data-branch', facts.soulBranch)
  await expect(detail).toContainText('命宮')
  await expect(detail).toContainText('範例說明，正式版由 AI 依星曜規則卡撰寫')

  const other = facts.palaces.find((p) => p.branch === '午')!
  await page.locator('[data-testid="ml-palace"][data-branch="午"]').click()
  await expect(detail).toHaveAttribute('data-branch', '午')
  await expect(detail).toContainText(other.name)
  await expect(page.getByTestId('ml-basis')).toContainText(`依據：${other.name}`)

  await page.waitForTimeout(1200)
  expect(await checkLayout(page)).toEqual([])
})

// ───────── 運限：分層命宮、點格完整清單、三方四正、AI 帶運限 ─────────
// 答案取自 Windada 對答案檔（不可改）：案例 1 在 2025-08-10 的流年／流月（斗君）／流日（斗君）命宮
const ORACLE_DIR = join(process.cwd(), 'src/mingli/ziwei/__tests__')
const wd = JSON.parse(readFileSync(join(ORACLE_DIR, 'ziwei.windada.json'), 'utf8')) as {
  horoscope: Record<string, Record<'yearly' | 'monthlyDou' | 'dailyDou', { palaces: { gz: string; bg: string }[] }>>
}
const fx1 = (JSON.parse(readFileSync(join(ORACLE_DIR, 'ziwei.fixtures.json'), 'utf8')) as { id: number; solarDate: string; time: string; gender: '男' | '女' }[]).find((f) => f.id === 1)!
const fx1Time = timeIndexOf(Number(fx1.time.split(':')[0]))
const QDATE = '2025-08-10'
const siteSoul = (c: { palaces: { gz: string; bg: string }[] }) => c.palaces.filter((p) => p.bg === '#FFCC66').map((p) => p.gz[1])

async function openChart(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await prepare(page)
  await page.goto(`${BASE}#/ziwei?d=${fx1.solarDate}&t=${fx1Time}&g=${fx1.gender}`)
  await expect(page.getByTestId('ml-chart')).toBeVisible()
  await pickDate(page, QDATE, 'ml-query-date')
}

test('運限：切換流年／流月／流日，該層命宮格等於對答案檔', async ({ page }) => {
  await openChart(page)
  const site = wd.horoscope[`1@${QDATE}`]
  const want = { yearly: siteSoul(site.yearly), monthly: siteSoul(site.monthlyDou), daily: siteSoul(site.dailyDou) }
  const app = horoscope({ solarDate: fx1.solarDate, timeIndex: fx1Time, gender: fx1.gender }, QDATE)
  for (const k of ['yearly', 'monthly', 'daily'] as const) {
    await page.getByTestId(`ml-layer-${k}`).click()
    const soul = page.locator('[data-testid="ml-palace"][data-layer-soul="true"]')
    await expect(soul).toHaveCount(1)
    await expect(soul).toHaveAttribute('data-branch', want[k][0])
    expect(app[k].soulBranch).toBe(want[k][0])
    await expect(page.getByTestId('ml-layer-info')).toHaveAttribute('data-soul', want[k][0])
    await expect(page.getByTestId('ml-pa-over')).toHaveCount(12)
  }
  // 回到本命：不再有分層標示
  await page.getByTestId('ml-layer-natal').click()
  await expect(page.locator('[data-layer-soul="true"]')).toHaveCount(0)
  await expect(page.getByTestId('ml-layer-info')).toHaveCount(0)
})

test('運限：點格子看完整清單（含小限歲數）與三方四正高亮', async ({ page }) => {
  await openChart(page)
  await page.getByTestId('ml-layer-yearly').click()
  const facts = buildChart({ solarDate: fx1.solarDate, timeIndex: fx1Time, gender: fx1.gender })
  const p = facts.palaces.find((x) => x.branch === '午')!
  await page.locator('[data-testid="ml-palace"][data-branch="午"]').click()
  const full = page.getByTestId('ml-palace-full')
  await expect(full).toBeVisible()
  await expect(full).toContainText('小限歲數')
  await expect(full).toContainText(p.ages.join('、'))
  await expect(full).toContainText('三方四正')
  await expect(full).toContainText('流年歲前')
  // 午宮的三方四正：對宮子、三合寅與戌
  const around = await page.locator('[data-testid="ml-palace"][data-surround="true"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-branch')).sort())
  expect(around).toEqual(['寅', '戌', '子'].sort())
})

test('運限：選流年後版面正常，390 寬沒有橫向捲動', async ({ page }) => {
  await openChart(page)
  await page.getByTestId('ml-layer-yearly').click()
  await page.locator('[data-testid="ml-palace"][data-branch="午"]').click()
  await page.waitForTimeout(1200)
  expect(await checkLayout(page)).toEqual([])
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(over).toBeLessThanOrEqual(0)
})

test('運限：按鈕是白話名稱，說明文字跟著分層變，點不同宮講該宮的疊宮名稱', async ({ page }) => {
  await openChart(page)
  const label = page.getByTestId('ml-layerbar')
  await expect(label).toContainText('想看哪一天的運勢')
  // 查詢日 2025-08-10 不是今天：按鈕用「那一年」這類說法，括號內是原名
  const names: [string, string, string][] = [['natal', '一生', '本命'], ['decadal', '那十年', '大限'], ['yearly', '那一年', '流年'], ['monthly', '那個月', '流月'], ['daily', '那一天', '流日']]
  for (const [k, word, orig] of names) {
    const btn = page.getByTestId(`ml-layer-${k}`)
    await expect(btn).toContainText(word)
    await expect(btn).toContainText(`（${orig}）`)
  }
  await expect(page.getByTestId('ml-layer-age')).toHaveCount(0)

  const texts: string[] = []
  const hints: string[] = []
  const app = horoscope({ solarDate: fx1.solarDate, timeIndex: fx1Time, gender: fx1.gender }, QDATE)
  for (const k of ['natal', 'decadal', 'yearly', 'monthly', 'daily'] as const) {
    await page.getByTestId(`ml-layer-${k}`).click()
    texts.push((await page.getByTestId('ml-palace-detail').textContent()) ?? '')
    hints.push((await page.getByTestId('ml-layer-hint').textContent()) ?? '')
    if (k !== 'natal') {
      // 說明裡的重心（命宮）宮位 = engine 的值
      await expect(page.getByTestId('ml-palace-detail')).toContainText(`（${app[k].soulBranch}宮）`)
    }
  }
  expect(new Set(texts).size).toBe(5)
  expect(new Set(hints).size).toBe(5)

  // 選今年後點兩個不同的宮：疊宮名稱各自出現在說明裡
  await page.getByTestId('ml-layer-yearly').click()
  for (const b of ['子', '午']) {
    await page.locator(`[data-testid="ml-palace"][data-branch="${b}"]`).click()
    await expect(page.getByTestId('ml-palace-detail')).toContainText(`「${app.yearly.palaceNames[b]}」`)
  }
})

test('運限：選流年後按 AI 解讀，請求 focus 與 facts 只帶流年（不含生日）', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __MINGLI_AI_URL__: string }).__MINGLI_AI_URL__ = '/__mock-ai'
  })
  const bodies: Record<string, unknown>[] = []
  await page.route('**/__mock-ai', async (route) => {
    // App 啟動時會 GET 狀態端點（同一個網址），不算解讀請求
    if (route.request().method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ai":true,"maintenance":false}' })
    bodies.push(route.request().postDataJSON())
    // 200 但內容不合格：前端退回，不會在 console 留錯誤
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
  await openChart(page)
  await page.getByTestId('ml-layer-yearly').click()
  await page.getByTestId('ml-ai-ziwei-btn').click()
  await expect.poll(() => bodies.length).toBe(1)
  expect(bodies[0].focus).toBe('yearly')
  const facts = bodies[0].facts as { horoscope?: Record<string, unknown> & { date: string; focus: string } }
  expect(facts.horoscope?.date).toBe(QDATE)
  expect(facts.horoscope?.focus).toBe('yearly')
  expect(facts.horoscope?.yearly).toBeTruthy()
  expect(facts.horoscope?.decadal).toBeTruthy() // 大限當背景
  for (const k of ['monthly', 'daily', 'age']) expect(facts.horoscope).not.toHaveProperty(k)
  const json = JSON.stringify(bodies[0])
  expect(json).not.toContain(fx1.solarDate)
  expect(json.length).toBeLessThan(8000)

  // 換到「這個月」再按：focus 跟著變，facts 只剩流月（加大限）
  await page.getByTestId('ml-layer-monthly').click()
  await page.getByTestId('ml-ai-ziwei-btn').click()
  await expect.poll(() => bodies.length).toBe(2)
  expect(bodies[1].focus).toBe('monthly')
  const f2 = (bodies[1].facts as { horoscope: Record<string, unknown> }).horoscope
  expect(f2.monthly).toBeTruthy()
  expect(f2).not.toHaveProperty('yearly')
  expect(f2).not.toHaveProperty('daily')
})

test.describe('電腦版版面', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test('1440 寬：左欄標題與右欄第一張卡片頂端差距小於 40px，沒有橫向捲動', async ({ page }) => {
    await openChart(page)
    await page.getByTestId('ml-layer-yearly').click()
    const title = await page.locator('.ml-z-title').boundingBox()
    const card = await page.getByTestId('ml-palace-detail').boundingBox()
    expect(title).not.toBeNull()
    expect(card).not.toBeNull()
    expect(Math.abs(title!.y - card!.y)).toBeLessThan(40)
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(over).toBeLessThanOrEqual(0)
  })
})

// ───────── 想問的事（選填）：只影響 AI，看得到、可改、可清空 ─────────
async function mockAi(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __MINGLI_AI_URL__: string }).__MINGLI_AI_URL__ = '/__mock-ai'
  })
  const bodies: Record<string, unknown>[] = []
  await page.route('**/__mock-ai', async (route) => {
    // App 啟動時會 GET 狀態端點（同一個網址），不算解讀請求
    if (route.request().method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ai":true,"maintenance":false}' })
    bodies.push(route.request().postDataJSON())
    // 200 但內容不合格：前端退回，不會在 console 留錯誤
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
  return bodies
}
const ZIWEI_HASH = `#/ziwei?d=${DATE}&t=${TIME_INDEX}&g=${encodeURIComponent('男')}`

test('紫微問題欄：帶入塔羅問過的問題，清除後送 AI 的 question 是空字串，再輸入就送新的', async ({ page }) => {
  const bodies = await mockAi(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await prepare(page)
  await page.goto(`${BASE}#/tarot`)
  await askQuestion(page)
  await page.evaluate((h) => { location.hash = h }, ZIWEI_HASH)
  await expect(page.getByTestId('ml-chart')).toBeVisible()

  const input = page.getByTestId('ml-ziwei-question')
  await expect(input).toHaveValue(DEFAULT_QUESTION)
  await page.getByTestId('ml-ziwei-question-clear').click()
  await expect(input).toHaveValue('')
  await expect(page.getByTestId('ml-ziwei-question-clear')).toHaveCount(0)
  await page.getByTestId('ml-ai-ziwei-btn').click()
  await expect.poll(() => bodies.length).toBe(1)
  expect(bodies[0].question).toBe('')

  await input.fill('今年適合換工作嗎')
  await page.getByTestId('ml-ai-ziwei-btn').click()
  await expect.poll(() => bodies.length).toBe(2)
  expect(bodies[1].question).toBe('今年適合換工作嗎')
  expect(JSON.stringify(bodies[1])).not.toContain(DEFAULT_QUESTION)
})

test('紫微問題欄：改了問題，舊解讀留在對話串並標出當時的問題、可再按解讀；切走再回來內容一致', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __MINGLI_AI_URL__: string }).__MINGLI_AI_URL__ = '/__mock-ai'
  })
  await page.route('**/__mock-ai', async (route) => {
    const body = { verdict: '一句話', tone: '平', paragraphs: [{ title: '現在', text: '慢慢來', basis: ['依據'], cards: [{ id: 'test-card', title: '測試卡', source: '測試來源' }] }], prediction: { claim: '三週內有消息', dueDate: '2099-01-01' } }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await prepare(page)
  await page.goto(`${BASE}${ZIWEI_HASH}`)
  await expect(page.getByTestId('ml-chart')).toBeVisible()
  const input = page.getByTestId('ml-ziwei-question')
  await input.fill('第一個問題')
  await page.getByTestId('ml-ai-ziwei-btn').click()
  await expect(page.getByTestId('ml-ai-reading')).toBeVisible()
  await expect(page.getByTestId('ml-followup-reading-q')).toHaveText('問：第一個問題')
  await input.fill('第二個問題')
  // 對話串不收起來：舊解讀還在、標著原本的問題；按鈕出現可問新的
  await expect(page.getByTestId('ml-ai-reading')).toHaveCount(1)
  await expect(page.getByTestId('ml-followup-reading-q')).toHaveText('問：第一個問題')
  await expect(page.getByTestId('ml-ai-ziwei-btn')).toBeVisible()

  await page.evaluate(() => { location.hash = '#/meihua' })
  await expect(page.getByTestId('ml-chart')).toHaveCount(0)
  await page.evaluate((h) => { location.hash = h }, ZIWEI_HASH)
  await expect(page.getByTestId('ml-ziwei-question')).toHaveValue('第二個問題')
})

test('紫微問題欄：390／820／1180／1440 版面檢查通過、沒有橫向捲動、清除鈕點擊區 44px 以上', async ({ page }) => {
  await mockAi(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await prepare(page)
  await page.goto(`${BASE}${ZIWEI_HASH}`)
  await expect(page.getByTestId('ml-chart')).toBeVisible()
  await page.getByTestId('ml-ziwei-question').fill('今年適合換工作嗎')
  for (const [width, height] of [[390, 844], [820, 1180], [1180, 820], [1440, 900]]) {
    await page.setViewportSize({ width, height })
    await page.waitForTimeout(400)
    await page.getByTestId('ml-ziwei-question').scrollIntoViewIfNeeded()
    const box = await page.getByTestId('ml-ziwei-question-clear').boundingBox()
    expect(box!.width, `${width} 清除鈕寬`).toBeGreaterThanOrEqual(44)
    expect(box!.height, `${width} 清除鈕高`).toBeGreaterThanOrEqual(44)
    expect(await checkLayout(page), `${width} 版面`).toEqual([])
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(over, `${width} 橫向捲動`).toBeLessThanOrEqual(0)
  }
})
