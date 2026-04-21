// 專門驗證：右側徽章 tooltip 不超框 + 用事宮徽章配色
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:5173/qimen-app/';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 900, height: 900 },  // 更接近手機/窄桌面，更容易觸發邊界問題
  storageState: { cookies: [], origins: [{ origin: 'http://localhost:5173', localStorage: [{ name: 'hasSeenGuide', value: 'true' }] }] },
});
const page = await ctx.newPage();

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.locator('textarea, input[type="text"]').first().fill('tooltip 邊界測試');
await page.getByRole('button').filter({ hasText: /起盤|推演|開始|問卦/ }).first().click();
await page.waitForTimeout(400);
await page.getByText('心動感應起卦').click();
await page.waitForTimeout(400);
await page.locator('button').filter({ hasText: '7' }).first().click();
await page.waitForTimeout(2000);
await page.waitForSelector('text=四元素詳細分級');

// 點右側的判定徽章 tooltip
const verdictBadge = page.locator('button[aria-label*="什麼是"]').filter({ hasText: '' }).nth(1); // 跳過 用事宮ⓘ
// 更穩：直接找靠近 result 徽章的那個 ⓘ
await page.evaluate(() => {
  // 找判定徽章（小凶/大凶/吉）旁邊的 ⓘ
  const badges = document.querySelectorAll('[class*="rounded-full"][class*="font-black"]');
  for (const b of badges) {
    const text = b.textContent?.trim();
    if (['大吉', '吉', '平', '小凶', '凶', '大凶'].includes(text)) {
      const info = b.parentElement?.querySelector('button[aria-label*="什麼是"]');
      if (info) info.click();
      break;
    }
  }
});
await page.waitForTimeout(400);

// 截圖整張卡含 tooltip
const card = page.locator('.rounded-3xl').filter({ hasText: '用事宮' }).first();
await card.screenshot({ path: join(__dirname, 'screenshots', '16-verdict-tooltip.png') });

// 檢查 tooltip 是否在視窗內（不超出右側）
const tooltipBox = await page.getByRole('tooltip').boundingBox();
const viewport = page.viewportSize();
if (tooltipBox && viewport) {
  const rightEdge = tooltipBox.x + tooltipBox.width;
  const within = rightEdge <= viewport.width;
  console.log(`${within ? '✅' : '❌'} tooltip 在視窗內：right=${Math.round(rightEdge)} vw=${viewport.width}`);
}

await browser.close();
console.log('截圖：tests/screenshots/16-verdict-tooltip.png');
