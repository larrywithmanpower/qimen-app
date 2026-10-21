import { test, expect } from './checks'
import type { Page } from 'playwright/test'
import { BASE, pickDate, prepare } from './checks'

// 只在手機尺寸 390×844 跑
test.use({ viewport: { width: 390, height: 844 } })

const DATE_FORMS = ['1990-07-05', '1990/7/5', '1990/07/05', '19900705', '1990-7-5', '1990年7月5日']

// 讀 idb-keyval 預設資料庫裡的 ml-birth
const readBirth = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<unknown>((done) => {
        const open = indexedDB.open('keyval-store')
        open.onerror = () => done(null)
        open.onsuccess = () => {
          const db = open.result
          if (!db.objectStoreNames.contains('keyval')) return done(null)
          const get = db.transaction('keyval').objectStore('keyval').get('ml-birth')
          get.onsuccess = () => done(get.result ?? null)
          get.onerror = () => done(null)
        }
      }),
  )

async function fillAndMake(page: Page) {
  await pickDate(page, '1990-07-05')
  await page.getByTestId('ml-time-4').click()
  await page.getByTestId('ml-gender-男').click()
  await page.getByTestId('ml-make-chart').click()
  await expect(page.getByTestId('ml-chart')).toBeVisible()
}

test('生辰只存本機：沒有請求帶生日，重整還在，清除後消失', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const seen: string[] = []
  page.on('request', (r) => seen.push(`${r.url()}\n${r.postData() ?? ''}`))
  await prepare(page)
  await page.goto(`${BASE}#/ziwei`)
  await expect(page.getByTestId('ml-birth-form')).toBeVisible()
  await expect(page.getByTestId('ml-privacy-line')).toContainText('生辰只存在這台裝置，不會上傳')
  await fillAndMake(page)
  const stars = () => page.getByTestId('ml-palace').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-branch')}:${e.getAttribute('data-stars')}`))
  const before = await stars()

  // 儲存在 IndexedDB
  expect(await readBirth(page)).toEqual({ solarDate: '1990-07-05', timeIndex: 4, gender: '男' })
  const local = await page.evaluate(() => JSON.stringify({ ...localStorage }))
  expect(local).not.toContain('1990')
  expect(local).not.toContain('ml-birth')

  // 重新整理後直接是同一張命盤
  await page.reload()
  await expect(page.getByTestId('ml-chart')).toBeVisible()
  expect(await stars()).toEqual(before)

  // 清除後 IndexedDB 沒有、畫面回輸入
  await page.getByTestId('ml-clear-birth').click()
  await expect(page.getByTestId('ml-birth-form')).toBeVisible()
  expect(await readBirth(page)).toBeNull()
  await page.reload()
  await expect(page.getByTestId('ml-birth-form')).toBeVisible()

  const hits = seen.filter((s) => DATE_FORMS.some((f) => s.includes(f)))
  expect(hits).toHaveLength(0)
})

test('網址帶參數看盤時不寫入儲存', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await prepare(page)
  await page.goto(`${BASE}#/ziwei?d=1990-07-05&t=4&g=男`)
  await expect(page.getByTestId('ml-chart')).toBeVisible()
  expect(await readBirth(page)).toBeNull()
})
