import { test, expect } from 'playwright/test';
import { runFullAnalysis, MOCK_AI_RESPONSE, APP_BASE } from './helpers';

const SITUATIONS = [
  { key: '感情' as const, question: '我最近的感情發展如何？', badge: '感情' },
  { key: '事業' as const, question: '我目前的事業方向是否正確？', badge: '事業' },
  { key: '投資' as const, question: '這次投資時機是否合適？', badge: '投資' },
] as const;

for (const { key, question, badge } of SITUATIONS) {
  test(`${key}情境：完整起盤流程`, async ({ page }) => {
    await runFullAnalysis(page, key, question);

    // 驗證情境 badge 顯示
    await expect(page.getByText(badge).first()).toBeVisible();

    // 驗證 AI 分析結果顯示
    await expect(page.getByText(MOCK_AI_RESPONSE.slice(0, 15))).toBeVisible();

    // 驗證「吉凶分析」標題出現（排盤核心功能正常）
    await expect(page.getByText('吉凶分析')).toBeVisible();
  });
}

test('問題輸入為空時無法起盤', async ({ page }) => {
  const { skipOnboarding, mockGemini } = await import('./helpers');
  await skipOnboarding(page);
  await mockGemini(page);
  await page.goto(APP_BASE);

  await page.getByRole('button', { name: /感情/ }).first().click();

  // 空問題時「開始排盤」應 disabled
  const submitBtn = page.getByRole('button', { name: /開始排盤/ });
  await expect(submitBtn).toBeDisabled();
});

test('可返回重選情境', async ({ page }) => {
  const { skipOnboarding, mockGemini } = await import('./helpers');
  await skipOnboarding(page);
  await mockGemini(page);
  await page.goto(APP_BASE);

  await page.getByRole('button', { name: /感情/ }).first().click();
  // 點重選情境
  await page.getByRole('button', { name: /重選情境/ }).click();
  // 應回到情境選擇頁
  await expect(page.getByRole('button', { name: /感情/ }).first()).toBeVisible();
});
