// 奇門 App 冒煙測試 — 驗證七層分級、用事宮徽章、AI prompt 結構
// 執行：node tests/smoke.mjs
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SHOTS = join(__dirname, 'screenshots');
const BASE = 'http://localhost:5173/qimen-app/';

const check = (label, cond, detail = '') => {
  const mark = cond ? '✅' : '❌';
  console.log(`${mark} ${label}${detail ? ` — ${detail}` : ''}`);
  return cond;
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    // 跳過 onboarding (localStorage 需在頁面載入時設定)
    storageState: { cookies: [], origins: [{ origin: 'http://localhost:5173', localStorage: [{ name: 'hasSeenGuide', value: 'true' }] }] },
  });
  const page = await ctx.newPage();

  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') pageErrors.push(m.text()); });

  let pass = 0, fail = 0;
  const t = (label, cond, detail) => (check(label, cond, detail) ? pass++ : fail++);

  try {
    console.log('\n🧪 Stage 1 — 載入首頁');
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
    await page.screenshot({ path: join(SHOTS, '01-landing.png') });

    // QuestionInput 應出現
    const questionInput = await page.locator('textarea, input[type="text"]').first();
    t('首頁載入 QuestionInput', await questionInput.count() > 0);

    console.log('\n🧪 Stage 2 — 輸入問題 & 觸發起盤');
    await questionInput.fill('本次事業拓展是否順遂？');
    const startBtn = page.getByRole('button').filter({ hasText: /起盤|推演|開始|問卦/ }).first();
    await startBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(SHOTS, '02-method-selector.png') });

    // MethodSelector 應出現四張卡
    const methodHeading = page.getByText('選擇起卦方式');
    t('MethodSelector 顯示（選擇起卦方式）', await methodHeading.count() > 0);
    const methodCards = await page.getByText(/心動感應|時間直出|手機號|出生日/).count();
    t('四種起卦法皆顯示', methodCards >= 4, `命中 ${methodCards} 個關鍵字`);

    console.log('\n🧪 Stage 2.5 — 選「心動感應」→ NumberPicker');
    await page.getByText('心動感應起卦').click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(SHOTS, '02b-number-picker.png') });

    const numberButtons = page.locator('button').filter({ hasText: /^[1-9]$/ });
    const numCount = await numberButtons.count();
    t('NumberPicker 顯示 1-9 鈕', numCount >= 9, `找到 ${numCount} 顆`);

    console.log('\n🧪 Stage 3 — 選 7（兌宮），等儀式動畫完成');
    await numberButtons.filter({ hasText: '7' }).first().click();
    await page.waitForTimeout(1800); // ritual 1200ms + buffer
    await page.screenshot({ path: join(SHOTS, '03-revealed.png') });

    console.log('\n🧪 Stage 4 — 九宮盤面驗證');

    // 4.1 九宮應該揭封（非 blur）
    const maskedCells = await page.locator('.blur-lg').count();
    t('盤面已揭封（mask 已移除）', maskedCells === 0, `殘留遮罩 ${maskedCells}`);

    // 4.2 用事宮徽章存在
    const mainBadge = page.getByText('★ 用事宮');
    t('用事宮 ★ 徽章出現', await mainBadge.count() > 0);

    // 4.3 七層分級色階 — 盤面上應同時有 text-red-* 與 text-green-* 多種
    const redColors = await page.evaluate(() => {
      const set = new Set();
      document.querySelectorAll('*').forEach(el => {
        const color = getComputedStyle(el).color;
        // rgba 紅系：R 值 > 200 且 G、B 偏低
        const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (m) {
          const [, r, g, b] = m.map(Number);
          if (r > 200 && g < 130 && b < 130) set.add(`${r},${g},${b}`);
        }
      });
      return [...set];
    });
    const greenColors = await page.evaluate(() => {
      const set = new Set();
      document.querySelectorAll('*').forEach(el => {
        const color = getComputedStyle(el).color;
        const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (m) {
          const [, r, g, b] = m.map(Number);
          if (g > 150 && r < 130 && b < 180) set.add(`${r},${g},${b}`);
        }
      });
      return [...set];
    });
    t('紅吉色階（text-red-*）存在', redColors.length >= 1, `共 ${redColors.length} 種：${redColors.join(' | ')}`);
    t('綠凶色階（text-green-*）存在', greenColors.length >= 1, `共 ${greenColors.length} 種：${greenColors.join(' | ')}`);

    // 4.4 --color-accent-rgb 已定義（之前的隱藏 bug）
    const accentRgb = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-accent-rgb').trim());
    t('--color-accent-rgb 已定義', accentRgb !== '', `值：${accentRgb}`);

    console.log('\n🧪 Stage 5 — 解析卡驗證');

    // 等解析區塊
    await page.waitForTimeout(500);
    const analysisCard = page.locator('text=/吉凶分析|Analysis Report/').first();
    t('吉凶分析區塊存在', await analysisCard.count() > 0);

    // 5.1 Details 應包含七層分級語言（大吉/小吉/中性/小凶/凶/大凶 其中幾個）
    const bodyText = await page.locator('body').innerText();
    const tierMatches = ['大吉', '吉', '小吉', '中性', '小凶', '凶', '大凶'].filter(t => bodyText.includes(t));
    t('解析卡含七層分級語言', tierMatches.length >= 3, `命中 ${tierMatches.length}：${tierMatches.join(', ')}`);

    // 5.2 宮位得分行（TermHelp 包裹後可能有換行，用 [\s\S] 容錯）
    const scoreLineMatch = bodyText.match(/宮位得分[\s\S]{0,80}?[→>][\s\S]{0,10}/);
    const hasScoreLine = !!scoreLineMatch;
    t('解析卡包含「宮位得分 → 判定」', hasScoreLine, scoreLineMatch ? `實際：「${scoreLineMatch[0].replace(/\s+/g, ' ')}」` : '未找到');

    // 5.3 用事宮加權標示
    const hasWeighted = /用事宮.*2/.test(bodyText);
    t('用事宮 2× 權重顯示', hasWeighted);

    // 5.4 Detail bullet 有分級圖示（🔴 或 🟢 或 ⚪）
    const hasTierIcon = /🔴|🟢|⚪/.test(bodyText);
    t('元素 bullet 含分級圖示（🔴/🟢/⚪）', hasTierIcon);

    console.log('\n🧪 Stage 6 — 主題切換（驗證 --color-accent-rgb 全主題生效）');

    const themeBtn = page.getByRole('button', { name: /主題|theme/i }).first();
    if (await themeBtn.count() > 0) {
      await themeBtn.click();
      await page.waitForTimeout(300);
      const lightAccent = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-accent-rgb').trim());
      await page.screenshot({ path: join(SHOTS, '04-theme-light.png') });
      t('light 主題 --color-accent-rgb 生效', lightAccent !== '', `值：${lightAccent}`);

      await themeBtn.click();
      await page.waitForTimeout(300);
      const emeraldAccent = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-accent-rgb').trim());
      await page.screenshot({ path: join(SHOTS, '05-theme-emerald.png') });
      t('emerald 主題 --color-accent-rgb 生效', emeraldAccent !== '', `值：${emeraldAccent}`);
    } else {
      console.log('⚠️  主題切換鈕未找到，跳過主題測試');
    }

    console.log('\n🧪 Stage 7 — 無 Runtime Error');
    t('頁面無 runtime error', pageErrors.length === 0, pageErrors.length ? `\n     ${pageErrors.join('\n     ')}` : '');

  } catch (err) {
    console.error('\n❌ 測試流程中斷：', err.message);
    await page.screenshot({ path: join(SHOTS, 'error.png') }).catch(() => {});
    fail++;
  } finally {
    await browser.close();
  }

  console.log(`\n======= 測試完成：${pass} 通過 / ${fail} 失敗 =======`);
  console.log(`截圖輸出：${SHOTS}`);
  process.exit(fail > 0 ? 1 : 0);
})();
