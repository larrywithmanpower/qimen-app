// 驗證新增的 3 個起卦方法流程（時間/手機號/出生日）
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SHOTS = join(__dirname, 'screenshots');
const BASE = 'http://localhost:5173/qimen-app/';

async function setupPage(browser) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    storageState: { cookies: [], origins: [{ origin: 'http://localhost:5173', localStorage: [{ name: 'hasSeenGuide', value: 'true' }] }] },
  });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.locator('textarea, input[type="text"]').first().fill('多方法起卦驗證');
  await page.getByRole('button').filter({ hasText: /起盤|推演|開始|問卦/ }).first().click();
  await page.waitForTimeout(400);
  return page;
}

const browser = await chromium.launch({ headless: true });

// Flow 1: 時間直出
console.log('\n▶ 時間直出起卦');
{
  const page = await setupPage(browser);
  await page.getByText('時間直出起卦').click();
  await page.waitForTimeout(1800);
  const revealed = await page.locator('text=正在為您解析').count() > 0;
  console.log(revealed ? '✅ 時間直出 → 直接揭盤（跳過輸入）' : '❌ 時間直出未成功揭盤');
  await page.screenshot({ path: join(SHOTS, '08-time-method.png'), fullPage: false });
  await page.context().close();
}

// Flow 2: 手機號
console.log('\n▶ 手機號起卦');
{
  const page = await setupPage(browser);
  await page.getByText('手機號起卦').click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(SHOTS, '09-phone-input.png'), fullPage: false });

  const input = page.locator('input[type="tel"]');
  const inputVisible = await input.count() > 0;
  console.log(inputVisible ? '✅ 手機號輸入框顯示' : '❌ 手機號輸入框未顯示');

  await input.fill('0912345678');
  await page.waitForTimeout(300);
  const preview = await page.getByText(/取末位 8/).count() > 0;
  console.log(preview ? '✅ 末位預覽正確（8 → 艮八）' : '❌ 末位預覽缺失');
  await page.screenshot({ path: join(SHOTS, '10-phone-with-preview.png'), fullPage: false });

  await page.getByRole('button', { name: /起卦推演/ }).click();
  await page.waitForTimeout(1800);
  const revealed = await page.locator('text=正在為您解析').count() > 0;
  console.log(revealed ? '✅ 手機號 → 成功揭盤' : '❌ 手機號揭盤失敗');
  await page.screenshot({ path: join(SHOTS, '11-phone-revealed.png'), fullPage: false });
  await page.context().close();
}

// Flow 3: 出生日
console.log('\n▶ 出生日起卦');
{
  const page = await setupPage(browser);
  await page.getByText('出生日起卦').click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(SHOTS, '12-birth-input.png'), fullPage: false });

  const input = page.locator('input[type="date"]');
  const inputVisible = await input.count() > 0;
  console.log(inputVisible ? '✅ 出生日輸入框顯示' : '❌ 出生日輸入框未顯示');

  await input.fill('1985-03-14');
  await page.waitForTimeout(300);
  const preview = await page.getByText(/日 14/).count() > 0;
  console.log(preview ? '✅ 日期預覽正確（14 % 9 = 5 → 中五）' : '❌ 日期預覽缺失');

  await page.getByRole('button', { name: /起卦推演/ }).click();
  await page.waitForTimeout(1800);
  const revealed = await page.locator('text=正在為您解析').count() > 0;
  console.log(revealed ? '✅ 出生日 → 成功揭盤' : '❌ 出生日揭盤失敗');
  await page.screenshot({ path: join(SHOTS, '13-birth-revealed.png'), fullPage: false });
  await page.context().close();
}

// Flow 4: 返回流程
console.log('\n▶ 返回按鈕');
{
  const page = await setupPage(browser);
  await page.getByText('手機號起卦').click();
  await page.waitForTimeout(300);
  // 鎖定 PhoneInput 內的返回鈕（非 header 的返回）
  await page.locator('#qimen-main-report').getByRole('button', { name: '返回' }).click();
  await page.waitForTimeout(300);
  const back = await page.getByText('選擇起卦方式').count() > 0;
  console.log(back ? '✅ 返回鈕回到 MethodSelector' : '❌ 返回鈕失效');
  await page.context().close();
}

await browser.close();
console.log('\n截圖輸出：tests/screenshots/08-13*.png');
