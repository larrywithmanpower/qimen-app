// 放大解析卡近照
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:5173/qimen-app/';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 1200 },
  storageState: { cookies: [], origins: [{ origin: 'http://localhost:5173', localStorage: [{ name: 'hasSeenGuide', value: 'true' }] }] },
});
const page = await ctx.newPage();

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.locator('textarea, input[type="text"]').first().fill('卡片近照測試');
await page.getByRole('button').filter({ hasText: /起盤|推演|開始|問卦/ }).first().click();
await page.waitForTimeout(400);
await page.getByText('心動感應起卦').click();
await page.waitForTimeout(400);
await page.locator('button').filter({ hasText: '3' }).first().click();
await page.waitForTimeout(2000);
await page.waitForSelector('text=四元素詳細分級');

// 找有 用事宮 的卡
const card = page.locator('.rounded-3xl').filter({ hasText: '用事宮' }).first();
await card.screenshot({ path: join(__dirname, 'screenshots', '17-card-clean.png') });
console.log('✅ 乾淨版解析卡近照：tests/screenshots/17-card-clean.png');

// 點一下 星 的 ⓘ 看 tooltip
const starInfo = page.locator('button[aria-label*="什麼是 星"]').first();
if (await starInfo.count() > 0) {
  await starInfo.click();
  await page.waitForTimeout(300);
  await card.screenshot({ path: join(__dirname, 'screenshots', '18-card-with-tooltip.png') });
  console.log('✅ 含 tooltip 的解析卡：tests/screenshots/18-card-with-tooltip.png');
}

await browser.close();
