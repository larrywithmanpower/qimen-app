import { test, expect } from 'playwright/test';
import { runFullAnalysis, MOCK_AI_RESPONSE, APP_BASE, skipOnboarding, mockGemini } from './helpers';

test('離線模式：快取存在時可瀏覽歷史不崩潰', async ({ page, context }) => {
  // 1. 先完成一次完整分析（會儲存 localStorage 歷史）
  await runFullAnalysis(page, '感情', '我的感情狀況如何？');

  // 確認 AI 結果已顯示
  await expect(page.getByText(MOCK_AI_RESPONSE.slice(0, 15))).toBeVisible();

  // 2. 切換為離線模式
  await context.setOffline(true);

  // 3. 點擊歷史按鈕（右上角）
  await page.getByTitle('歷史紀錄').click();

  // 4. Drawer 應正常開啟，顯示歷史紀錄標題
  await expect(page.getByRole('heading', { name: '歷史紀錄' })).toBeVisible();

  // 確認歷史條目存在（在 drawer 容器內找，避免 strict mode violation）
  const historyEntry = page.getByText('我的感情狀況如何？', { exact: true });
  await expect(historyEntry.first()).toBeVisible();

  // 5. 點擊歷史條目應能還原，不崩潰
  await historyEntry.first().click();

  // 6. 還原後應顯示預存的 AI 結果（predefinedResult，不發網路請求）
  await expect(page.getByText(MOCK_AI_RESPONSE.slice(0, 15))).toBeVisible({ timeout: 5000 });
});

test('離線模式：切斷網路後頁面已載入內容不消失', async ({ page, context }) => {
  await skipOnboarding(page);
  await mockGemini(page);
  await page.goto(APP_BASE);

  // 確認首頁正常載入
  await expect(page.getByText('奇門遁甲').first()).toBeVisible();

  // 切換離線
  await context.setOffline(true);

  // 已載入的頁面內容仍應可見（不依賴網路，DOM 仍存在）
  await expect(page.getByText('奇門遁甲').first()).toBeVisible();

  // 情境選擇卡仍可互動（純前端邏輯，不需網路）
  await expect(page.getByRole('button', { name: /感情/ }).first()).toBeVisible();
  await page.getByRole('button', { name: /感情/ }).first().click();
  await expect(page.locator('textarea')).toBeVisible();
});
