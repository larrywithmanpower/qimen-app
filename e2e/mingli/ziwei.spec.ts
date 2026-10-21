import { test, expect } from './checks'
import type { Page } from 'playwright/test'
import { BASE, checkLayout, pickDate, prepare } from './checks'

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

test('運限：選流年後按 AI 解讀，請求帶 facts.horoscope（不含生日）', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __MINGLI_AI_URL__: string }).__MINGLI_AI_URL__ = '/__mock-ai'
  })
  const bodies: Record<string, unknown>[] = []
  await page.route('**/__mock-ai', async (route) => {
    bodies.push(route.request().postDataJSON())
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
  await openChart(page)
  await page.getByTestId('ml-layer-yearly').click()
  await page.getByTestId('ml-ai-ziwei-btn').click()
  await expect.poll(() => bodies.length).toBe(1)
  const facts = bodies[0].facts as { horoscope?: { date: string; yearly: unknown } }
  expect(facts.horoscope?.date).toBe(QDATE)
  expect(facts.horoscope?.yearly).toBeTruthy()
  const json = JSON.stringify(bodies[0])
  expect(json).not.toContain(fx1.solarDate)
  expect(json.length).toBeLessThan(8000)
})
