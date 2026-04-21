// 模擬窄螢幕 / 手機視口，重現並驗證 tooltip 邊界修復
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:5173/qimen-app/';

const VIEWPORTS = [
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-430', width: 430, height: 900 },
  { name: 'narrow-500', width: 500, height: 900 },
];

const browser = await chromium.launch({ headless: true });

for (const vp of VIEWPORTS) {
  console.log(`\n▶ Viewport ${vp.name} (${vp.width}px)`);
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    storageState: { cookies: [], origins: [{ origin: 'http://localhost:5173', localStorage: [{ name: 'hasSeenGuide', value: 'true' }] }] },
  });
  const page = await ctx.newPage();

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.locator('textarea, input[type="text"]').first().fill('窄螢幕測試');
  await page.getByRole('button').filter({ hasText: /起盤|推演|開始|問卦/ }).first().click();
  await page.waitForTimeout(400);
  await page.getByText('心動感應起卦').click();
  await page.waitForTimeout(400);
  await page.locator('button').filter({ hasText: '5' }).first().click();
  await page.waitForTimeout(2000);
  await page.waitForSelector('text=四元素詳細分級');

  // 點「門」的 ⓘ（最左邊的術語）
  const doorInfo = page.locator('button[aria-label*="什麼是 門"]').first();
  if (await doorInfo.count() > 0) {
    await doorInfo.click();
    await page.waitForTimeout(300);

    const tooltip = page.getByRole('tooltip').first();
    if (await tooltip.count() > 0) {
      const box = await tooltip.boundingBox();
      if (box) {
        const leftOK = box.x >= 0;
        const rightOK = box.x + box.width <= vp.width;
        const status = leftOK && rightOK ? '✅' : '❌';
        console.log(`${status} 門 tooltip 邊界：left=${Math.round(box.x)} right=${Math.round(box.x + box.width)} vw=${vp.width}`);
      }
    }
    await page.screenshot({ path: join(__dirname, 'screenshots', `19-${vp.name}-door.png`) });
  }

  // 點「星」的 ⓘ（也常在左側）
  await page.mouse.click(vp.width / 2, 10); // 關閉 tooltip
  await page.waitForTimeout(200);
  const starInfo = page.locator('button[aria-label*="什麼是 星"]').first();
  if (await starInfo.count() > 0) {
    await starInfo.click();
    await page.waitForTimeout(300);
    const tooltip = page.getByRole('tooltip').first();
    if (await tooltip.count() > 0) {
      const box = await tooltip.boundingBox();
      if (box) {
        const leftOK = box.x >= 0;
        const rightOK = box.x + box.width <= vp.width;
        const status = leftOK && rightOK ? '✅' : '❌';
        console.log(`${status} 星 tooltip 邊界：left=${Math.round(box.x)} right=${Math.round(box.x + box.width)} vw=${vp.width}`);
      }
    }
  }

  // 點「用事宮」的 ⓘ（在卡左上）
  await page.mouse.click(vp.width / 2, 10);
  await page.waitForTimeout(200);
  const mainInfo = page.locator('button[aria-label*="用事宮"]').first();
  if (await mainInfo.count() > 0) {
    await mainInfo.click();
    await page.waitForTimeout(300);
    const tooltip = page.getByRole('tooltip').first();
    if (await tooltip.count() > 0) {
      const box = await tooltip.boundingBox();
      if (box) {
        const leftOK = box.x >= 0;
        const rightOK = box.x + box.width <= vp.width;
        const status = leftOK && rightOK ? '✅' : '❌';
        console.log(`${status} 用事宮 tooltip 邊界：left=${Math.round(box.x)} right=${Math.round(box.x + box.width)} vw=${vp.width}`);
      }
    }
  }

  // 點「大吉/吉/大凶」的 ⓘ（在卡右側）
  await page.mouse.click(vp.width / 2, 10);
  await page.waitForTimeout(200);
  const verdictInfos = page.locator('button[aria-label*="什麼是"]');
  const count = await verdictInfos.count();
  for (let i = 0; i < count; i++) {
    const label = await verdictInfos.nth(i).getAttribute('aria-label');
    if (/大吉|大凶|小凶|\s凶|\s吉|小吉|平/.test(label || '')) {
      await verdictInfos.nth(i).click();
      await page.waitForTimeout(300);
      const tooltip = page.getByRole('tooltip').first();
      if (await tooltip.count() > 0) {
        const box = await tooltip.boundingBox();
        if (box) {
          const leftOK = box.x >= 0;
          const rightOK = box.x + box.width <= vp.width;
          const status = leftOK && rightOK ? '✅' : '❌';
          console.log(`${status} 判定徽章 tooltip 邊界：left=${Math.round(box.x)} right=${Math.round(box.x + box.width)} vw=${vp.width} (${label})`);
        }
      }
      break;
    }
  }

  await ctx.close();
}

await browser.close();
console.log('\n截圖：tests/screenshots/19-*');
