import { test, expect } from './checks'
import type { Page } from 'playwright/test'
import { BASE, askQuestion, checkLayout, prepare } from './checks'

// 塔羅、梅花頁的問題：可修改、沒問題不能開始、抽牌／起卦後不能改（手機 390 寬）
test.use({ viewport: { width: 390, height: 844 } })

const NEED = '先寫下你想問的事'
const tap = (page: Page, pos: number) => page.getByTestId('ml-fan-card').nth(pos).dispatchEvent('click')
const noHScroll = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)

async function openTarot(page: Page, hash = '#/tarot') {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await prepare(page)
  await page.goto(BASE + hash)
  await expect(page.getByTestId('ml-tarot')).toBeVisible()
}
async function openMeihua(page: Page, hash = '#/meihua') {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await prepare(page)
  await page.goto(BASE + hash)
  await expect(page.getByTestId('ml-meihua')).toBeVisible()
}

test('塔羅：直接開網址是輸入框＋提示，牌扇不能點；輸入後可抽', async ({ page }) => {
  await openTarot(page)
  const input = page.getByTestId('ml-question-input')
  await expect(input).toBeVisible()
  await expect(input).toHaveAttribute('placeholder', /這週提的企劃會不會過/)
  await expect(input).toHaveAttribute('maxlength', '200')
  await expect(page.getByTestId('ml-question-need')).toHaveText(NEED)
  await expect(page.getByTestId('ml-fan-card').first()).toBeDisabled()
  await expect(page.getByTestId('ml-shuffle')).toBeDisabled()
  await tap(page, 3)
  await tap(page, 3)
  await expect(page.getByTestId('ml-slot').first()).toHaveAttribute('data-card', '')
  // 空白不能確定
  await expect(page.getByTestId('ml-question-ok')).toBeDisabled()
  await noHScroll(page)
  expect(await checkLayout(page)).toEqual([])

  await askQuestion(page, '我該不該換工作？')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('我該不該換工作？')
  await expect(page.getByTestId('ml-fan-card').first()).toBeEnabled()
  await tap(page, 3)
  await tap(page, 3)
  await expect(page.getByTestId('ml-slot').first()).not.toHaveAttribute('data-card', '')
})

test('塔羅：抽牌前改問題 → 牌序改變；取消與 Esc 還原；抽牌後按鈕消失，重新抽後又出現', async ({ page }) => {
  await openTarot(page)
  await askQuestion(page, '第一個問題')
  const seed = () => page.getByTestId('ml-seed').textContent()
  const seed1 = await seed()

  // 取消還原
  await page.getByTestId('ml-edit-question').click()
  await page.getByTestId('ml-question-input').fill('不會被存的字')
  await page.getByTestId('ml-question-cancel').click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('第一個問題')
  expect(await seed()).toBe(seed1)
  // Esc 還原
  await page.getByTestId('ml-edit-question').click()
  await page.getByTestId('ml-question-input').fill('也不會被存')
  await page.getByTestId('ml-question-input').press('Escape')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('第一個問題')

  // 改了問題 → 用新問題重新洗牌
  await page.getByTestId('ml-edit-question').click()
  await page.getByTestId('ml-question-input').fill('第二個完全不同的問題')
  await page.getByTestId('ml-question-ok').click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('第二個完全不同的問題')
  await expect.poll(seed).not.toBe(seed1)

  // 抽第一張牌後不能改
  await tap(page, 3)
  await expect(page.getByTestId('ml-edit-question')).toBeVisible() // 只是浮起，還沒抽
  await tap(page, 3)
  await expect(page.getByTestId('ml-edit-question')).toHaveCount(0)
  await tap(page, 9); await tap(page, 9)
  await tap(page, 17); await tap(page, 17)
  await expect(page.getByTestId('ml-reading')).toBeVisible()
  await expect(page.getByTestId('ml-edit-question')).toHaveCount(0)

  // 重新抽 → 又能改
  await page.getByTestId('ml-again').click()
  await expect(page.getByTestId('ml-edit-question')).toBeVisible()
  await noHScroll(page)
})

test('塔羅：網址指定牌序時，第一次填問題不換牌序', async ({ page }) => {
  await openTarot(page, '#/tarot?seed=4271')
  await askQuestion(page)
  await expect(page.getByTestId('ml-seed')).toHaveText('牌序 No. 04271')
})

test('梅花：直接開網址是輸入框＋提示，起卦鈕停用；輸入後可起卦，起卦後不能改', async ({ page }) => {
  await openMeihua(page)
  await expect(page.getByTestId('ml-question-input')).toBeVisible()
  await expect(page.getByTestId('ml-question-need')).toHaveText(NEED)
  await expect(page.getByTestId('ml-cast')).toBeDisabled()
  await expect(page.getByTestId('ml-cast-need')).toHaveText(NEED)
  await noHScroll(page)

  await askQuestion(page, '這段感情會有結果嗎？')
  await expect(page.getByTestId('ml-cast')).toBeEnabled()
  await expect(page.getByTestId('ml-cast-need')).toHaveCount(0)
  // 起卦前可改、可取消
  await page.getByTestId('ml-edit-question').click()
  await page.getByTestId('ml-question-input').fill('改過的問題')
  await page.getByTestId('ml-question-ok').click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('改過的問題')
  await page.getByTestId('ml-edit-question').click()
  await page.getByTestId('ml-question-cancel').click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('改過的問題')

  await page.getByTestId('ml-cast').click()
  await expect(page.getByTestId('ml-edit-question')).toHaveCount(0)
  await noHScroll(page)
})

test('梅花：起卦 → 重新起卦回到起卦前 → 改問題 → 用新問題起卦', async ({ page }) => {
  await openMeihua(page)
  await askQuestion(page, '舊問題')
  await page.getByTestId('ml-cast').click()
  await expect(page.getByTestId('ml-edit-question')).toHaveCount(0)
  await expect(page.getByTestId('ml-yao').first()).toBeVisible()

  // 重新起卦：卦象、解讀按鈕都清掉，回到起卦前
  await page.getByTestId('ml-cast').click()
  await expect(page.getByTestId('ml-yao')).toHaveCount(0)
  await expect(page.getByTestId('ml-gua-row')).toHaveCount(0)
  await expect(page.getByTestId('ml-cast-info')).toHaveCount(0)
  await expect(page.getByTestId('ml-to-reading')).toHaveCount(0)
  await expect(page.getByTestId('ml-edit-question')).toBeVisible()
  await noHScroll(page)

  await page.getByTestId('ml-edit-question').click()
  await page.getByTestId('ml-question-input').fill('新問題')
  await page.getByTestId('ml-question-ok').click()
  await page.getByTestId('ml-cast').click()
  await expect(page.getByTestId('ml-to-reading')).toBeVisible()
  await page.getByTestId('ml-to-reading').click()
  await expect(page.getByTestId('ml-reading')).toBeVisible()
  await expect(page.locator('.ml-read-q')).toHaveText('新問題')
  await noHScroll(page)
})

test('梅花：網址帶 a、b 只在進頁面時自動起卦一次，重新起卦後不會再自動起', async ({ page }) => {
  await openMeihua(page, '#/meihua?a=16&b=5')
  await askQuestion(page, '要不要搬家？')
  await expect(page.getByTestId('ml-cast-info')).toHaveText('報數 16、5')
  await page.getByTestId('ml-cast').click() // 重新起卦
  await expect(page.getByTestId('ml-yao')).toHaveCount(0)
  // 改問題也不會自動起卦
  await page.getByTestId('ml-edit-question').click()
  await page.getByTestId('ml-question-input').fill('別的問題')
  await page.getByTestId('ml-question-ok').click()
  await page.waitForTimeout(600)
  await expect(page.getByTestId('ml-yao')).toHaveCount(0)
  await page.getByTestId('ml-cast').click()
  await expect(page.getByTestId('ml-cast-info')).toHaveText('報數 16、5')
})

test('梅花：網址帶 a、b 但沒問題 → 先不起卦，填完問題才起卦', async ({ page }) => {
  await openMeihua(page, '#/meihua?a=16&b=5')
  await expect(page.getByTestId('ml-yao')).toHaveCount(0)
  await askQuestion(page, '要不要搬家？')
  await expect(page.getByTestId('ml-cast-info')).toHaveText('報數 16、5')
})
