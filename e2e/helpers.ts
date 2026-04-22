import type { Page } from 'playwright/test';

export const APP_BASE = '/qimen-app/';

// 長度 > 50 chars，符合 GeminiResponseSchema z.string().min(50) 驗證
export const MOCK_AI_RESPONSE =
  '此宮位整體能量偏吉，建議謹慎行事，把握當下時機，適合主動出擊，可獲良緣。此為奇門遁甲測試分析回應，僅供自動化測試使用。';

export async function mockGemini(page: Page) {
  await page.route('**/api/gemini-mock', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ text: MOCK_AI_RESPONSE }),
    });
  });
}

/** 跳過 Onboarding：在頁面載入前注入 localStorage */
export async function skipOnboarding(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('hasSeenGuide', '1');
  });
}

/**
 * 執行完整起盤流程：選情境 → 輸入問題 → 時間直出 → 點宮位 → 詢問 AI
 * 回傳前等待 AI 結果文字出現。
 */
export async function runFullAnalysis(
  page: Page,
  situation: '感情' | '事業' | '投資',
  question: string,
) {
  await skipOnboarding(page);
  await mockGemini(page);
  await page.goto(APP_BASE);

  // 選情境
  await page.getByRole('button', { name: new RegExp(situation) }).first().click();

  // 輸入問題
  await page.locator('textarea').fill(question);
  await page.getByRole('button', { name: /開始排盤/ }).click();

  // 選起卦方法：時間直出（最簡單，不需額外輸入）
  await page.getByRole('button', { name: /時間直出/ }).click();

  // 等 RitualLoading（~1200ms）結束，宮位格出現
  await page.locator('[data-testid="palace-cell"]').first().waitFor({
    state: 'visible',
    timeout: 6000,
  });

  // 點擊第一個宮位
  await page.locator('[data-testid="palace-cell"]').first().click();

  // 點擊詢問 AI 按鈕
  await page.getByRole('button', { name: /詢問大師/ }).first().click();

  // 等待 mock AI 結果出現
  await page.getByText(MOCK_AI_RESPONSE.slice(0, 15)).waitFor({ timeout: 10_000 });
}
