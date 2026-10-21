import { test, expect } from './checks'
import { BASE, checkLayout, prepare } from './checks'

// 只在手機尺寸 390×844 跑
test.use({ viewport: { width: 390, height: 844 } })

const field = (page: import('playwright/test').Page) => page.getByTestId('ml-birth-date')
const panel = (page: import('playwright/test').Page) => page.getByTestId('ml-dp-panel')

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await prepare(page)
  await page.goto(`${BASE}#/ziwei`)
  await expect(page.getByTestId('ml-birth-form')).toBeVisible()
})

async function pick199075(page: import('playwright/test').Page) {
  await field(page).click()
  await page.getByTestId('ml-dp-y-1990').click()
  await page.getByTestId('ml-dp-m-7').click()
  await page.getByTestId('ml-dp-d-5').click()
}

test('空值先進年畫面，選 1990→7→5 後欄位有值並關閉面板', async ({ page }) => {
  await expect(field(page)).toHaveAttribute('data-value', '')
  await field(page).click()
  await expect(panel(page)).toBeVisible()
  await expect(page.getByTestId('ml-dp-y-1990')).toBeVisible()
  await page.getByTestId('ml-dp-y-1990').click()
  await page.getByTestId('ml-dp-m-7').click()
  await page.getByTestId('ml-dp-d-5').click()
  await expect(field(page)).toHaveAttribute('data-value', '1990-07-05')
  await expect(panel(page)).toHaveCount(0)
  await expect(field(page)).toContainText('1990 年 7 月 5 日')
})

test('有值時再打開直接是 1990 年 7 月，5 號為選中', async ({ page }) => {
  await pick199075(page)
  await field(page).click()
  await expect(page.getByTestId('ml-dp-year')).toHaveText('1990 年')
  await expect(page.getByTestId('ml-dp-month')).toHaveText('7 月')
  await expect(page.getByTestId('ml-dp-d-5')).toHaveAttribute('aria-pressed', 'true')
})

test('今天之後的日子 disabled，本月時下一頁 disabled', async ({ page }) => {
  const now = new Date()
  const y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate()
  await field(page).click()
  // 年畫面翻到今年所在頁
  for (let i = 0; i < 20 && !(await page.getByTestId(`ml-dp-y-${y}`).count()); i++) await page.getByTestId('ml-dp-next').click()
  await page.getByTestId(`ml-dp-y-${y}`).click()
  await page.getByTestId(`ml-dp-m-${m}`).click()
  await expect(page.getByTestId('ml-dp-next')).toBeDisabled()
  await expect(page.getByTestId(`ml-dp-d-${d}`)).toBeEnabled()
  const last = new Date(y, m, 0).getDate()
  if (d < last) await expect(page.getByTestId(`ml-dp-d-${d + 1}`)).toBeDisabled()
})

test('Esc 與點面板外都會關閉', async ({ page }) => {
  await field(page).click()
  await expect(panel(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(panel(page)).toHaveCount(0)
  await expect(field(page)).toBeFocused()
  await field(page).click()
  await expect(panel(page)).toBeVisible()
  await page.getByTestId('ml-birth-form').getByText('你的生辰').click()
  await expect(panel(page)).toHaveCount(0)
})

test('清除後 data-value 為空', async ({ page }) => {
  await pick199075(page)
  await field(page).click()
  await page.getByTestId('ml-dp-clear').click()
  await expect(field(page)).toHaveAttribute('data-value', '')
  await expect(panel(page)).toHaveCount(0)
})

test('年、月、日三個畫面打開時版面檢查無問題', async ({ page }) => {
  await field(page).click()
  await expect(page.getByTestId('ml-dp-y-1990')).toBeVisible()
  expect(await checkLayout(page), '年畫面').toEqual([])
  await page.getByTestId('ml-dp-y-1990').click()
  await expect(page.getByTestId('ml-dp-m-7')).toBeVisible()
  expect(await checkLayout(page), '月畫面').toEqual([])
  await page.getByTestId('ml-dp-m-7').click()
  await expect(page.getByTestId('ml-dp-d-5')).toBeVisible()
  expect(await checkLayout(page), '日畫面').toEqual([])
})

test('頁面上沒有任何 input[type=date]', async ({ page }) => {
  await expect(page.locator('input[type="date"]')).toHaveCount(0)
  await field(page).click()
  await expect(page.locator('input[type="date"]')).toHaveCount(0)
})
