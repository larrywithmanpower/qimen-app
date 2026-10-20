// 設計稿與實作並排對照：左設計稿、右實作截圖，存到 qa-reports/mingli-v2/compare/
// 先跑 SHOTS=1 的四尺寸截圖，再跑：node tests/compare-design.mjs
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';

const DESIGN = '/Users/user/jarvis/docs/drafts/mingli-app/design-canvas';
const SHOTS = 'qa-reports/mingli-v2';
const OUT = `${SHOTS}/compare`;

// 實作頁 × 尺寸 → 設計稿畫板（平板橫放 1180 沒有設計稿，跟電腦版比）
const MAP = [
  ['home', '390x844', 'PMain'], ['home', '820x1180', 'TMain'], ['home', '1180x820', 'WMain'], ['home', '1440x960', 'WMain'],
  ['tarot-draw', '390x844', 'PTarot'],
  ['tarot-read', '390x844', 'PTarotRead'], ['tarot-read', '820x1180', 'TTarot'], ['tarot-read', '1180x820', 'WTarot'], ['tarot-read', '1440x960', 'WTarot'],
  ['meihua-cast', '390x844', 'PMeihua'], ['meihua-cast', '820x1180', 'TMeihua'],
  ['meihua-read', '390x844', 'PMeihuaRead'], ['meihua-read', '1180x820', 'WMeihua'], ['meihua-read', '1440x960', 'WMeihua'],
  ['ziwei-chart', '390x844', 'PZiwei'], ['ziwei-chart', '820x1180', 'TZiwei'], ['ziwei-chart', '1180x820', 'WZiwei'], ['ziwei-chart', '1440x960', 'WZiwei'],
];

const canvas = JSON.parse(readFileSync(`${DESIGN}/canvas.json`, 'utf8'));
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const designPng = {};
for (const [, , board] of MAP) {
  if (designPng[board]) continue;
  const b = canvas.boards[`${board}.dc.html`];
  const p = await browser.newPage({ viewport: { width: b.w, height: b.h } });
  await p.goto(`file://${DESIGN}/${board}.dc.html`);
  await p.waitForTimeout(1200);
  designPng[board] = (await p.screenshot()).toString('base64');
  await p.close();
}
let n = 0;
for (const [page, size, board] of MAP) {
  const impl = `${SHOTS}/${page}/${size}.png`;
  if (!existsSync(impl)) { console.log(`缺實作截圖：${impl}`); continue; }
  const implB64 = readFileSync(impl).toString('base64');
  const p = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await p.setContent(`<body style="margin:0;background:#222;color:#eee;font:14px sans-serif">
    <div style="display:flex;gap:16px;padding:12px;align-items:flex-start">
      <figure style="margin:0;flex:1"><figcaption>設計稿 ${board}</figcaption><img style="width:100%" src="data:image/png;base64,${designPng[board]}"></figure>
      <figure style="margin:0;flex:1"><figcaption>實作 ${page} ${size}</figcaption><img style="width:100%" src="data:image/png;base64,${implB64}"></figure>
    </div></body>`);
  await p.waitForTimeout(200);
  await p.screenshot({ path: `${OUT}/${page}-${size}.png`, fullPage: true });
  await p.close();
  n++;
}
await browser.close();
console.log(`並排對照 ${n} 張，存在 ${OUT}/`);
