// 驗證白話總結 + 術語 tooltip
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SHOTS = join(__dirname, 'screenshots');
const BASE = 'http://localhost:5173/qimen-app/';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  storageState: { cookies: [], origins: [{ origin: 'http://localhost:5173', localStorage: [{ name: 'hasSeenGuide', value: 'true' }] }] },
});
const page = await ctx.newPage();

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.locator('textarea, input[type="text"]').first().fill('驗證白話總結與術語 tooltip');
await page.getByRole('button').filter({ hasText: /起盤|推演|開始|問卦/ }).first().click();
await page.waitForTimeout(400);
await page.getByText('心動感應起卦').click();
await page.waitForTimeout(400);
await page.locator('button').filter({ hasText: '5' }).first().click();
await page.waitForTimeout(1800);

// 等解析卡出現
await page.waitForSelector('text=四元素詳細分級', { timeout: 5000 });

const bodyText = await page.locator('body').innerText();

const checks = [
  { label: '白話總結存在（你的用事宮/此宮象意）', pass: /你的用事宮顯示|此宮象意顯示/.test(bodyText) },
  { label: '建議行動標籤（主動出擊/謹慎行事/保守應對/暫緩等待/暫停避凶）', pass: /主動出擊|謹慎行事|保守應對|暫緩等待|暫停避凶/.test(bodyText) },
  { label: '「四元素詳細分級」分段標題', pass: /四元素詳細分級/.test(bodyText) },
  { label: '用事宮徽章存在', pass: /用事宮/.test(bodyText) },
];
for (const { label, pass } of checks) console.log(`${pass ? '✅' : '❌'} ${label}`);

// 截圖解析卡
await page.screenshot({ path: join(SHOTS, '14-analysis-card-white.png'), fullPage: true });

// 點一下 ⓘ 看 tooltip 是否能展開
const firstInfo = page.locator('button[aria-label*="什麼是"]').first();
if (await firstInfo.count() > 0) {
  await firstInfo.click();
  await page.waitForTimeout(300);
  const tooltipVisible = await page.getByRole('tooltip').count() > 0;
  console.log(tooltipVisible ? '✅ 點 ⓘ 展開 tooltip（術語白話）' : '❌ tooltip 未出現');
  await page.screenshot({ path: join(SHOTS, '15-tooltip-opened.png'), fullPage: false });
}

await browser.close();
console.log('\n截圖輸出：tests/screenshots/14-15*.png');
