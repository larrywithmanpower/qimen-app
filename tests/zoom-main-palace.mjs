// 拍攝用事宮近照以驗證 ★ 用事宮 徽章排版
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:5173/qimen-app/';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  storageState: { cookies: [], origins: [{ origin: 'http://localhost:5173', localStorage: [{ name: 'hasSeenGuide', value: 'true' }] }] },
});
const page = await ctx.newPage();

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.locator('textarea, input[type="text"]').first().fill('測試用事宮排版');
await page.getByRole('button').filter({ hasText: /起盤|推演|開始|問卦/ }).first().click();
await page.waitForTimeout(400);
await page.locator('button').filter({ hasText: '7' }).first().click();
await page.waitForTimeout(1800);

// 找 ★ 用事宮 徽章所屬的宮位 button
const mainBadge = page.getByText('★ 用事宮');
await mainBadge.waitFor({ state: 'visible' });
const cell = mainBadge.locator('xpath=ancestor::button[1]');
await cell.screenshot({ path: join(__dirname, 'screenshots', '06-main-palace-zoom.png') });

// 同時拍一張更大範圍：九宮盤
await page.locator('.grid-cols-3').first().screenshot({ path: join(__dirname, 'screenshots', '07-full-grid.png') });

console.log('✅ 用事宮近照已存：tests/screenshots/06-main-palace-zoom.png');
console.log('✅ 九宮全景已存：tests/screenshots/07-full-grid.png');

await browser.close();
