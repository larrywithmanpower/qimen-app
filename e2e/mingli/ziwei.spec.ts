import { test, expect } from './checks'
import type { Page } from 'playwright/test'
import { BASE, checkLayout, pickDate, prepare } from './checks'

import { buildChart, candidates } from '../../src/mingli/ziwei/engine'

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
