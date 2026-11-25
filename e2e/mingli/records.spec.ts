import type { Page, Route } from 'playwright/test'
import { BASE, SIZES, askQuestion, checkLayout, expect, prepare, test } from './checks'
import { drawThree, templateReading } from '../../src/mingli/tarot/engine'
import { castByNumbers } from '../../src/mingli/meihua/engine'

// 階段 G：占卜紀錄（只存這台裝置）＋梅花塔羅合併解讀
test.use({ viewport: { width: 390, height: 844 } })

const Q = '要不要換工作？'
const SEED = 4271
const PICKS: [number, number, number] = [3, 9, 17]
const drawn = drawThree(SEED, PICKS)
const tarotTone = templateReading(drawn).tone
const mei = castByNumbers(12, 34, { at: new Date('2024-03-15T10:00') })
const MOCK_URL = '/__mock-ai'
const CARD = { id: 'test-card-1', title: '測試卡', source: '測試來源' }

// 先換到空白頁再進來＝整頁重新載入：記憶體裡上一題的問題清掉，IndexedDB 的紀錄留著
// 有 AI 解讀時先等合併按鈕出現（紀錄寫好才會出現），避免紀錄還沒寫完就換頁
const fresh = async (page: Page) => {
  if (page.url().startsWith('http') && await page.locator('[data-record]').count()) await expect(page.locator('[data-record]')).not.toHaveAttribute('data-record', '')
  await page.goto('about:blank')
}
const openMeihua = async (page: Page, q = Q) => {
  await fresh(page)
  await page.goto(`${BASE}#/meihua?a=12&b=34&t=2024-03-15T10:00`)
  await askQuestion(page, q)
  await page.getByTestId('ml-to-reading').click()
}
const openTarot = async (page: Page, q = Q) => {
  await fresh(page)
  await page.goto(`${BASE}#/tarot?seed=${SEED}`)
  await askQuestion(page, q)
  const tap = (pos: number) => page.getByTestId('ml-fan-card').nth(pos).dispatchEvent('click')
  for (const p of PICKS) { await tap(p); await tap(p) }
}

// 依請求的 kind 回一份過得了前端檢查的假解讀
const fakeReading = (kind: string) => {
  const tone = kind === 'tarot' ? tarotTone : mei.tone
  const text = kind === 'tarot' ? `「${drawn[0].card.zh}」${drawn[0].reversed ? '逆位' : '正位'}` : kind === 'meihua' ? `本卦${mei.name}` : `梅花本卦${mei.name}，跟塔羅「${drawn[0].card.zh}」同向`
  return {
    verdict: `${kind} 的一句話`,
    tone,
    paragraphs: [{ title: '答案', text, basis: kind === 'combo' ? ['梅花：本卦', '塔羅：第一張'] : ['依據甲'], cards: [CARD] }],
    prediction: { claim: '一個月內有消息', dueDate: '2099-01-01' },
  }
}

async function withAi(page: Page, handle?: (route: Route, body: Record<string, unknown>) => Promise<void>) {
  await page.addInitScript((url) => {
    (window as unknown as { __MINGLI_AI_URL__: string }).__MINGLI_AI_URL__ = url
  }, MOCK_URL)
  const bodies: Record<string, unknown>[] = []
  await page.route(`**${MOCK_URL}`, async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ai":true,"maintenance":false}' })
    const body = route.request().postDataJSON() as Record<string, unknown>
    bodies.push(body)
    if (handle) return handle(route, body)
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fakeReading(String(body.kind))) })
  })
  return bodies
}

// 直接讀 IndexedDB 裡的紀錄（idb-keyval 預設的 keyval-store）
const readStoredRecords = (page: Page) => page.evaluate(() => new Promise<unknown[]>((done) => {
  const req = indexedDB.open('keyval-store')
  req.onsuccess = () => {
    // 從沒存過任何東西時連存放區都還沒建，就是零筆
    if (!req.result.objectStoreNames.contains('keyval')) return done([])
    const get = req.result.transaction('keyval').objectStore('keyval').get('ml-records')
    get.onsuccess = () => done(Array.isArray(get.result) ? get.result : [])
  }
}))

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await prepare(page)
})

test('沒接 AI：看完梅花與塔羅自動存進紀錄，重新整理、關分頁再開都還在', async ({ page, context }) => {
  // 紀錄不可以送到任何網址：記下所有帶問題文字的請求
  const leaks: string[] = []
  page.on('request', (r) => { if ((r.url() + (r.postData() ?? '')).includes('換工作')) leaks.push(r.url()) })
  await openMeihua(page)
  await expect(page.getByTestId('ml-reading')).toBeVisible()
  await openTarot(page)
  await expect(page.getByTestId('ml-reading')).toBeVisible()
  // 沒接 AI 就不顯示合併按鈕
  await expect(page.getByTestId('ml-combo-open')).toHaveCount(0)

  await page.goto(`${BASE}#/records`)
  const recs = page.getByTestId('ml-rec')
  await expect(recs).toHaveCount(2)
  await expect(recs.nth(0)).toHaveAttribute('data-kind', 'tarot')
  await expect(recs.nth(1)).toHaveAttribute('data-kind', 'meihua')
  await expect(recs.nth(1)).toContainText(`${mei.name} → ${mei.changed.name}`)
  await expect(recs.nth(1).getByTestId('ml-rec-verdict')).not.toBeEmpty()

  await page.reload()
  await expect(page.getByTestId('ml-rec')).toHaveCount(2)
  await page.close()
  const again = await context.newPage()
  await again.goto(`${BASE}#/records`)
  await expect(again.getByTestId('ml-rec')).toHaveCount(2)
  expect(leaks).toEqual([])
})

test('單筆刪除要按兩次確定；全部刪除後顯示空白提示，重新整理也不會回來', async ({ page }) => {
  await openMeihua(page)
  await expect(page.getByTestId('ml-reading')).toBeVisible()
  await openTarot(page)
  await expect(page.getByTestId('ml-reading')).toBeVisible()
  await page.goto(`${BASE}#/records`)
  const first = page.getByTestId('ml-rec').first()
  await first.locator('.ml-rec-sum').click()
  await first.getByTestId('ml-rec-del').click()
  await expect(page.getByTestId('ml-rec')).toHaveCount(2)
  await first.getByTestId('ml-rec-del-yes').click()
  await expect(page.getByTestId('ml-rec')).toHaveCount(1)
  await page.reload()
  await expect(page.getByTestId('ml-rec')).toHaveCount(1)

  await page.getByTestId('ml-rec-clear').click()
  await page.getByTestId('ml-rec-clear-yes').click()
  await expect(page.getByTestId('ml-rec-empty')).toBeVisible()
  await page.reload()
  await expect(page.getByTestId('ml-rec-empty')).toBeVisible()
})

test('同一題算過梅花與塔羅 → 合併解讀：同一題排最前、送兩邊盤面、吉凶照梅花；合併過的重開不再扣額度', async ({ page }) => {
  const bodies = await withAi(page)
  await openTarot(page, '他還喜歡我嗎')
  await expect(page.getByTestId('ml-ai-reading')).toBeVisible()
  await openMeihua(page)
  await expect(page.getByTestId('ml-ai-reading')).toBeVisible()
  await openTarot(page, ' 要不要換工作 ')
  await expect(page.getByTestId('ml-ai-reading')).toBeVisible()

  await page.getByTestId('ml-combo-open').click()
  const items = page.getByTestId('ml-combo-item')
  await expect(items).toHaveCount(1) // 只列梅花（塔羅那兩筆不列）
  await expect(items.first()).toHaveAttribute('data-same', 'true')
  await expect(items.first().getByTestId('ml-combo-same')).toHaveText('同一題')
  await items.first().click()

  await expect(page.getByTestId('ml-combo-page')).toBeVisible()
  await expect(page.getByTestId('ml-ai-reading')).toContainText('combo 的一句話')
  await expect(page.getByTestId('ml-combo-src-m')).toContainText(mei.name)
  await expect(page.getByTestId('ml-combo-diff')).toHaveCount(0)
  const combo = bodies.filter((b) => b.kind === 'combo')
  expect(combo).toHaveLength(1)
  expect(combo[0].tone).toBe(mei.tone)
  expect(combo[0].question).toBe(Q)
  const facts = combo[0].facts as { meihua: { main: { name: string } }; tarot: { cards: { name: string }[] } }
  expect(facts.meihua.main.name).toBe(mei.name)
  expect(facts.tarot.cards.map((c) => c.name)).toEqual(drawn.map((d) => d.card.zh))

  // 重新整理：直接顯示存好的合併解讀，不再送
  await page.reload()
  await expect(page.getByTestId('ml-ai-reading')).toContainText('combo 的一句話')
  expect(bodies.filter((b) => b.kind === 'combo')).toHaveLength(1)

  await expect(page.getByTestId('ml-combo-page')).not.toHaveAttribute('data-record', '')
  await page.goto(`${BASE}#/records`)
  await expect(page.getByTestId('ml-rec').first()).toHaveAttribute('data-kind', 'combo')
  await expect(page.getByTestId('ml-rec')).toHaveCount(4)
})

test('題目不同也能合併，畫面與送出的近況都會註明塔羅那次問的題目', async ({ page }) => {
  const bodies = await withAi(page)
  await openMeihua(page)
  await expect(page.getByTestId('ml-ai-reading')).toBeVisible()
  await openTarot(page, '新工作會比較好嗎')
  await expect(page.getByTestId('ml-ai-reading')).toBeVisible()
  await page.getByTestId('ml-combo-open').click()
  await expect(page.getByTestId('ml-combo-item').first()).toHaveAttribute('data-same', 'false')
  await page.getByTestId('ml-combo-item').first().click()
  await expect(page.getByTestId('ml-combo-diff')).toContainText('新工作會比較好嗎')
  await expect(page.getByTestId('ml-ai-reading')).toBeVisible()
  expect(bodies.find((b) => b.kind === 'combo')?.context).toContain('塔羅那次問的是「新工作會比較好嗎」')
})

test('7 天內沒有另一邊紀錄：提示先去算，按下去帶著同一個問題到塔羅頁', async ({ page }) => {
  await withAi(page)
  await openMeihua(page)
  await expect(page.getByTestId('ml-ai-reading')).toBeVisible()
  await page.getByTestId('ml-combo-open').click()
  await expect(page.getByTestId('ml-combo-empty')).toContainText('最近 7 天沒有塔羅紀錄')
  await page.getByTestId('ml-combo-go').click()
  await expect(page.getByTestId('ml-tarot')).toBeVisible()
  await expect(page.getByText(Q)).toBeVisible()
})

test.describe('合併解讀失敗', () => {
  test.use({ consoleAllow: [/Failed to load resource/] })
  test('AI 失敗：說明暫時沒辦法、附求助專線，不顯示範本；額度用完講清楚', async ({ page }) => {
    let comboStatus = 502
    await withAi(page, async (route, body) => {
      if (body.kind === 'combo') return route.fulfill({ status: comboStatus, body: '{}' })
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fakeReading(String(body.kind))) })
    })
    await openMeihua(page)
    await expect(page.getByTestId('ml-ai-reading')).toBeVisible()
    await openTarot(page)
    await expect(page.getByTestId('ml-ai-reading')).toBeVisible()
    await page.getByTestId('ml-combo-open').click()
    await page.getByTestId('ml-combo-item').first().click()
    await expect(page.getByTestId('ml-combo-fail')).toBeVisible()
    await expect(page.getByTestId('ml-ai-help')).toBeVisible()
    await expect(page.getByTestId('ml-ai-reading')).toHaveCount(0)
    comboStatus = 429
    await page.reload()
    await expect(page.getByTestId('ml-ai-limit')).toBeVisible()
  })
})

test('找不到紀錄的合併網址：說明紀錄只存在算的那台裝置', async ({ page }) => {
  await page.goto(`${BASE}#/combo?m=meihua-x&t=tarot-y`)
  await expect(page.getByTestId('ml-combo-missing')).toContainText('只存在算的那台裝置')
})

for (const size of SIZES) {
  test(`${size.name}：紀錄頁（展開）與合併解讀頁版面不跑版`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height })
    await withAi(page)
    await openMeihua(page)
    await expect(page.getByTestId('ml-ai-reading')).toBeVisible()
    await openTarot(page)
    await expect(page.getByTestId('ml-ai-reading')).toBeVisible()
    await page.getByTestId('ml-combo-open').click()
    expect(await checkLayout(page)).toEqual([])
    await page.getByTestId('ml-combo-item').first().click()
    await expect(page.getByTestId('ml-ai-reading')).toBeVisible()
    expect(await checkLayout(page)).toEqual([])
    await expect(page.getByTestId('ml-combo-page')).not.toHaveAttribute('data-record', '')
    await page.goto(`${BASE}#/records`)
    // 紀錄是非同步讀出來的，先等三筆都出現再全部展開
    await expect(page.getByTestId('ml-rec')).toHaveCount(3)
    // 只點紀錄本身的標題列（.ml-rec summary 會連解讀各段的標題一起點到、把段落收起來）
    for (const s of await page.locator('.ml-rec-sum').all()) await s.click()
    await expect(page.locator('.ml-rec-box[open]')).toHaveCount(3)
    expect(await checkLayout(page)).toEqual([])
  })
}

test('後端婉拒（例如問壽命）不存紀錄，紀錄頁不會出現那題的範本解讀', async ({ page }) => {
  await withAi(page, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ refusal: { kind: 'death', message: '這類問題我們不解讀' } }) })
  })
  await openMeihua(page, '我還能活多久')
  await expect(page.getByTestId('ml-ai-refusal')).toBeVisible()
  await expect(page.getByTestId('ml-combo-open')).toHaveCount(0)
  // 直接讀這台裝置存的紀錄（不換頁，避免換頁打斷寫入而看不出來），等 1 秒都沒有才算過
  await page.waitForTimeout(1000)
  expect(await readStoredRecords(page)).toEqual([])
})

test('合併過之後把來源塔羅刪掉，合併解讀照樣打得開', async ({ page }) => {
  await withAi(page)
  await openMeihua(page)
  await expect(page.getByTestId('ml-ai-reading')).toBeVisible()
  await openTarot(page)
  await expect(page.getByTestId('ml-ai-reading')).toBeVisible()
  await page.getByTestId('ml-combo-open').click()
  await page.getByTestId('ml-combo-item').first().click()
  await expect(page.getByTestId('ml-combo-page')).not.toHaveAttribute('data-record', '')
  await page.goto(`${BASE}#/records`)
  await expect(page.getByTestId('ml-rec')).toHaveCount(3)
  const tarot = page.locator('[data-testid="ml-rec"][data-kind="tarot"]')
  await tarot.locator('.ml-rec-sum').click()
  await tarot.getByTestId('ml-rec-del').click()
  await tarot.getByTestId('ml-rec-del-yes').click()
  await expect(page.getByTestId('ml-rec')).toHaveCount(2)
  // 刪掉一筆後，其他紀錄不會被意外展開
  await expect(page.locator('.ml-rec-box[open]')).toHaveCount(0)
  const combo = page.locator('[data-testid="ml-rec"][data-kind="combo"]')
  await combo.locator('.ml-rec-sum').click()
  await combo.getByTestId('ml-rec-open-combo').click()
  await expect(page.getByTestId('ml-combo-page')).toBeVisible()
  await expect(page.getByTestId('ml-ai-reading')).toContainText('combo 的一句話')
  await expect(page.getByTestId('ml-combo-src-t')).toContainText(drawn[0].card.zh)
  await expect(page.getByTestId('ml-combo-missing')).toHaveCount(0)
})

test('結果頁的紀錄被清掉後按合併：說明找不到紀錄，不是按了沒反應', async ({ page }) => {
  await withAi(page)
  await openMeihua(page)
  await expect(page.getByTestId('ml-combo-open')).toBeVisible()
  // 模擬另一個分頁把紀錄清掉
  await page.evaluate(() => new Promise<void>((done) => {
    const req = indexedDB.open('keyval-store')
    req.onsuccess = () => {
      const tx = req.result.transaction('keyval', 'readwrite')
      tx.objectStore('keyval').delete('ml-records')
      tx.oncomplete = () => done()
    }
  }))
  await page.getByTestId('ml-combo-open').click()
  await expect(page.getByTestId('ml-combo-lost')).toContainText('找不到這筆紀錄')
})

test('梅花按「返回卦象」再看解讀，同一卦還是一筆紀錄；塔羅重新抽是新的一筆', async ({ page }) => {
  await withAi(page)
  await openMeihua(page)
  await expect(page.getByTestId('ml-combo-open')).toBeVisible()
  await page.getByTestId('ml-back-hex').click()
  await page.getByTestId('ml-to-reading').click()
  await expect(page.getByTestId('ml-combo-open')).toBeVisible()
  await page.waitForTimeout(500)
  expect(await readStoredRecords(page)).toHaveLength(1)

  await openTarot(page)
  await expect(page.getByTestId('ml-combo-open')).toBeVisible()
  await page.getByTestId('ml-again').click()
  const tap = (pos: number) => page.getByTestId('ml-fan-card').nth(pos).dispatchEvent('click')
  for (const p of PICKS) { await tap(p); await tap(p) }
  await expect(page.getByTestId('ml-combo-open')).toBeVisible()
  await page.waitForTimeout(500)
  expect(await readStoredRecords(page)).toHaveLength(3)
})

test('題目不同的合併，刪掉塔羅後重開：兩邊標題與「塔羅那次問的是」都還在', async ({ page }) => {
  await withAi(page)
  await openMeihua(page)
  await expect(page.getByTestId('ml-ai-reading')).toBeVisible()
  await openTarot(page, '新工作會比較好嗎')
  await expect(page.getByTestId('ml-ai-reading')).toBeVisible()
  await page.getByTestId('ml-combo-open').click()
  await page.getByTestId('ml-combo-item').first().click()
  await expect(page.getByTestId('ml-combo-page')).not.toHaveAttribute('data-record', '')
  const url = page.url()
  await page.goto(`${BASE}#/records`)
  const tarot = page.locator('[data-testid="ml-rec"][data-kind="tarot"]')
  await tarot.locator('.ml-rec-sum').click()
  await tarot.getByTestId('ml-rec-del').click()
  await tarot.getByTestId('ml-rec-del-yes').click()
  await expect(page.getByTestId('ml-rec')).toHaveCount(2)
  await page.goto(url)
  await expect(page.getByTestId('ml-combo-diff')).toContainText('新工作會比較好嗎')
  await expect(page.getByTestId('ml-combo-src-m')).toContainText(mei.name)
  await expect(page.getByTestId('ml-combo-src-t')).toContainText(drawn[0].card.zh)
})
