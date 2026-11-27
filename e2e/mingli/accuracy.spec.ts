import type { Page } from 'playwright/test'
import { BASE, SIZES, checkLayout, expect, prepare, test } from './checks'

// 準度：AI 預測到期後首頁提醒、準度頁回填中／沒中／說不準、命中率滿 10 筆才顯示
test.use({ viewport: { width: 390, height: 844 } })

// 台灣 2026-11-27 中午
const NOW = Date.UTC(2026, 10, 27, 4, 0, 0)

let n = 0
const rec = (over: Record<string, unknown> & { due?: string; claim?: string } = {}) => {
  const { due = '2026-11-27', claim = '一個月內有面試通知', ...rest } = over
  return {
    id: `meihua-${NOW}-${n++}`, kind: 'meihua', at: NOW - 30 * 86400_000, question: '要不要換工作？', title: '雷地豫', level: '吉', tone: '吉',
    facts: {}, verdict: '可以動', followups: [],
    reading: { verdict: '可以動', tone: '吉', paragraphs: [{ title: '答案', text: '可以', basis: ['依據'], cards: [] }], prediction: { claim, dueDate: due } },
    ...rest,
  }
}
const answered = (result: 'hit' | 'miss' | 'unsure', over: Record<string, unknown> = {}) => rec({ ...over, outcome: { result, at: NOW - 1000 } })

const readStored = (page: Page) => page.evaluate(() => new Promise<Record<string, unknown>[]>((done, fail) => {
  const req = indexedDB.open('keyval-store')
  req.onerror = () => fail(req.error)
  req.onsuccess = () => {
    const db = req.result
    const get = db.transaction('keyval').objectStore('keyval').get('ml-records')
    get.onsuccess = () => { db.close(); done(Array.isArray(get.result) ? get.result : []) }
    get.onerror = () => { db.close(); fail(get.error) }
  }
}))

// 先開首頁（首頁會讀紀錄，資料庫就建好了），再把假紀錄寫進裝置，最後重新整理
async function seed(page: Page, list: unknown[], path = '#/') {
  await page.goto(`${BASE}#/`)
  await expect(page.getByTestId('ml-home')).toBeVisible()
  await page.evaluate((v) => new Promise<void>((done, fail) => {
    const req = indexedDB.open('keyval-store')
    req.onerror = () => fail(req.error)
    req.onsuccess = () => {
      const db = req.result
      const tx = db.transaction('keyval', 'readwrite')
      tx.objectStore('keyval').put(v, 'ml-records')
      tx.oncomplete = () => { db.close(); done() }
      tx.onerror = () => { db.close(); fail(tx.error) }
    }
  }), list)
  await page.goto(`${BASE}${path}`)
  await page.reload()
}

test.beforeEach(async ({ page }) => {
  n = 0
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await prepare(page)
  await page.clock.setFixedTime(NOW)
})

test('沒有紀錄：準度頁說明怎麼開始，首頁不出提醒', async ({ page }) => {
  await page.goto(`${BASE}#/accuracy`)
  await expect(page.getByTestId('ml-acc-empty')).toBeVisible()
  await expect(page.getByTestId('ml-acc-empty')).toContainText('範例解讀')
  await page.goto(`${BASE}#/`)
  await expect(page.getByTestId('ml-home')).toBeVisible()
  await expect(page.getByTestId('ml-home-due')).toHaveCount(0)
})

test('到期當天首頁提醒；沒到期、範例解讀、已對過的都不算', async ({ page }) => {
  await seed(page, [
    rec({ due: '2026-11-27' }),
    rec({ due: '2026-11-20' }),
    rec({ due: '2026-11-28' }),
    rec({ reading: null }),
    answered('hit', { due: '2026-11-01' }),
  ])
  await expect(page.getByTestId('ml-home-due')).toHaveText('有 2 個預測到期了，回來對答案')
  await page.getByTestId('ml-home-due').click()
  await expect(page).toHaveURL(/#\/accuracy$/)
  await expect(page.getByTestId('ml-acc-due')).toHaveCount(2)
  await expect(page.getByTestId('ml-acc-pending')).toHaveCount(1)
  await expect(page.getByTestId('ml-acc-answered')).toHaveCount(1)
})

test('回填後紀錄更新：重新整理還在、提醒少一個、紀錄頁也看得到', async ({ page }) => {
  const a = rec({ due: '2026-11-27', claim: '月底前收到回覆' })
  const b = rec({ due: '2026-11-25' })
  await seed(page, [a, b], '#/accuracy')
  // 先到期的在前：b 在第一個
  await expect(page.getByTestId('ml-acc-due').first()).toHaveAttribute('data-id', b.id)
  await page.locator(`[data-id="${a.id}"]`).getByTestId('ml-acc-hit').click()
  await expect(page.getByTestId('ml-acc-due')).toHaveCount(1)
  await expect(page.getByTestId('ml-acc-answered')).toHaveCount(1)
  await expect(page.getByTestId('ml-acc-answered')).toHaveAttribute('data-result', 'hit')
  const stored = await readStored(page)
  expect(stored.find((r) => r.id === a.id)?.outcome).toMatchObject({ result: 'hit' })
  expect(stored.find((r) => r.id === b.id)?.outcome).toBeUndefined()
  await page.locator(`[data-id="${b.id}"]`).getByTestId('ml-acc-miss').click()
  await expect(page.getByTestId('ml-acc-answered')).toHaveCount(2)
  expect((await readStored(page)).find((r) => r.id === b.id)?.outcome).toMatchObject({ result: 'miss' })
  await page.reload()
  await expect(page.getByTestId('ml-acc-answered')).toHaveCount(2)
  await page.goto(`${BASE}#/`)
  await expect(page.getByTestId('ml-home')).toBeVisible()
  await expect(page.getByTestId('ml-home-due')).toHaveCount(0)
  await page.goto(`${BASE}#/records`)
  await expect(page.getByTestId('ml-rec-prediction')).toHaveCount(2)
  await page.getByTestId('ml-rec').first().locator('.ml-rec-sum').click()
  await expect(page.getByTestId('ml-rec').first().getByTestId('ml-rec-prediction')).toBeVisible()
})

test('命中率：中＋沒中不到 10 筆不給百分比；滿 10 筆跟手算一致，說不準不算', async ({ page }) => {
  // 梅花 6 中 3 沒中 2 說不準（9 筆，不給）；塔羅問感情 7 中 3 沒中（10 筆，70%）
  const list = [
    ...Array.from({ length: 6 }, () => answered('hit')),
    ...Array.from({ length: 3 }, () => answered('miss')),
    ...Array.from({ length: 2 }, () => answered('unsure')),
    ...Array.from({ length: 7 }, () => answered('hit', { kind: 'tarot', question: '他還喜歡我嗎？' })),
    ...Array.from({ length: 3 }, () => answered('miss', { kind: 'tarot', question: '他還喜歡我嗎？' })),
  ]
  await seed(page, list, '#/accuracy')
  // 全部：13 中 6 沒中 → 68%
  await expect(page.getByTestId('ml-acc-total')).toContainText('68%')
  await expect(page.getByTestId('ml-acc-total')).toContainText('中 13・沒中 6・說不準 2')
  const kindRow = (name: string) => page.getByTestId('ml-acc-bykind').locator(`[data-name="${name}"]`)
  await expect(kindRow('梅花')).toHaveAttribute('data-rate', '')
  await expect(kindRow('梅花')).toContainText('還差 1 筆')
  await expect(kindRow('塔羅')).toHaveAttribute('data-rate', '70')
  await expect(kindRow('合併')).toContainText('還沒有')
  const topicRow = (name: string) => page.getByTestId('ml-acc-bytopic').locator(`[data-name="${name}"]`)
  await expect(topicRow('感情')).toHaveAttribute('data-rate', '70')
  await expect(topicRow('工作')).toContainText('還差 1 筆')
})

for (const size of SIZES) {
  test(`版面：${size.name} ${size.width} 寬沒有橫向捲動、字沒被切`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height })
    await seed(page, [
      rec({ due: '2026-11-27', question: '我做的 app 上架之後，第一個月的下載量會不會超過一千？這題問得比較長看看會不會換行', claim: '上架後四週內下載量超過一千次' }),
      rec({ due: '2026-12-30' }),
      ...Array.from({ length: 10 }, () => answered('hit')),
      answered('miss', { kind: 'combo', question: '最近財運' }),
    ])
    expect(await checkLayout(page)).toEqual([])
    await page.goto(`${BASE}#/accuracy`)
    await expect(page.getByTestId('ml-acc-stats')).toBeVisible()
    // 「對過的」預設收合；展開到內容最多的狀態再檢查（版面檢查分不出收合的內容）
    await page.getByTestId('ml-acc-done').locator('summary').click()
    await expect(page.getByTestId('ml-acc-answered').first()).toBeVisible()
    expect(await checkLayout(page)).toEqual([])
  })
}
