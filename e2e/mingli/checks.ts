import { test as base, expect } from 'playwright/test';
import type { Page } from 'playwright/test';

// 所有命理畫面測試共用：頁面 console 出現 error 或 pageerror 就判失敗
export const test = base.extend<{ consoleGuard: void }>({
  consoleGuard: [async ({ page }, use) => {
    const errors: string[] = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
    await use();
    expect(errors, '頁面 console 不可有 error').toEqual([]);
  }, { auto: true }],
});
export { expect };

// 命理 App 畫面共用檢查：橫向捲動、文字重疊／裁切、點擊區大小、安全區域

export const BASE = '/qimen-app/';

export const SIZES = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'tablet-land', width: 1180, height: 820 },
  { name: 'desktop', width: 1440, height: 960 },
] as const;

/** 測試用安全區域高度（模擬 iPhone 底部橫條） */
export const SAFE_BOTTOM = 34;

/** 頁面載入前注入：關掉入場動畫等待、模擬安全區域 */
export async function prepare(page: Page) {
  // 文件剛建立時 documentElement 還不存在，等 DOM 就緒再設
  await page.addInitScript((safe) => {
    const set = () => document.documentElement.style.setProperty('--ml-safe-bottom', `${safe}px`);
    if (document.documentElement) set();
    else document.addEventListener('DOMContentLoaded', set, { once: true });
  }, SAFE_BOTTOM);
}

export type LayoutIssue = { kind: string; detail: string };

/**
 * 在頁面內跑版面檢查。裝飾層（aria-hidden）不檢查。
 * - 橫向捲動：document scrollWidth ≤ clientWidth
 * - 文字重疊：可見文字元素外框兩兩不相交（父子關係除外）
 * - 文字裁切：文字元素在視窗左右範圍內；有 overflow 的容器 scrollWidth ≤ clientWidth
 * - 點擊區：button、a、input、[role=button] ≥ 44×44
 * - 安全區域：fixed／sticky 貼底的可點元素下緣 ≤ 視窗高 − 安全區域
 */
export async function checkLayout(page: Page): Promise<LayoutIssue[]> {
  return page.evaluate((safe) => {
    const issues: { kind: string; detail: string }[] = [];
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const label = (el: Element) => {
      const t = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24);
      const cls = typeof el.className === 'string' ? el.className.split(' ')[0] : '';
      return `<${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}>${t}`;
    };
    const decorative = (el: Element) => !!el.closest('[aria-hidden="true"]');
    const visible = (el: Element) => {
      const s = getComputedStyle(el);
      if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };

    if (document.documentElement.scrollWidth > vw) {
      issues.push({ kind: '橫向捲動', detail: `scrollWidth ${document.documentElement.scrollWidth} > ${vw}` });
    }

    const pinned = (el: Element) => {
      for (let n: Element | null = el; n && n !== document.body; n = n.parentElement) {
        const p = getComputedStyle(n).position;
        if (p === 'fixed' || p === 'sticky') return true;
      }
      return false;
    };

    // 內容文字：直接含文字節點的元素
    const texts: { el: Element; r: DOMRect; pin: boolean }[] = [];
    document.querySelectorAll('body *').forEach(el => {
      if (decorative(el) || !visible(el)) return;
      if (el.closest('svg')) return; // 牌面與卦象圖形內的字由圖形自己排
      const own = [...el.childNodes].some(n => n.nodeType === 3 && (n.textContent || '').trim());
      if (!own) return;
      // 用 Range 量文字本身的外框，避免把 block 元素的空白寬度算進去
      const range = document.createRange();
      range.selectNodeContents(el);
      const rects = [...range.getClientRects()].filter(r => r.width > 0 && r.height > 0);
      if (!rects.length) return;
      const r = new DOMRect(
        Math.min(...rects.map(x => x.left)), Math.min(...rects.map(x => x.top)),
        Math.max(...rects.map(x => x.right)) - Math.min(...rects.map(x => x.left)),
        Math.max(...rects.map(x => x.bottom)) - Math.min(...rects.map(x => x.top)),
      );
      texts.push({ el, r, pin: pinned(el) });
      if (r.left < -1 || r.right > vw + 1) issues.push({ kind: '文字超出畫面', detail: label(el) });
    });
    for (let i = 0; i < texts.length; i++) {
      for (let j = i + 1; j < texts.length; j++) {
        const a = texts[i], b = texts[j];
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        // 固定列底下本來就會有內容捲過，不算重疊；捲到底的遮擋另外檢查
        if (a.pin !== b.pin) continue;
        const ix = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
        const iy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
        if (ix > 2 && iy > 2) issues.push({ kind: '文字重疊', detail: `${label(a.el)} ↔ ${label(b.el)}` });
      }
    }

    // 容器裁切：設了 overflow hidden 且內容比框寬
    document.querySelectorAll('body *').forEach(el => {
      if (decorative(el) || !visible(el) || el.closest('svg')) return;
      const s = getComputedStyle(el);
      if (s.overflowX !== 'hidden' && s.overflow !== 'hidden') return;
      if (!(el.textContent || '').trim()) return;
      if (el.scrollWidth > el.clientWidth + 1 && s.textOverflow !== 'ellipsis') {
        issues.push({ kind: '文字被裁', detail: `${label(el)} ${el.scrollWidth}>${el.clientWidth}` });
      }
    });

    // 點擊區
    document.querySelectorAll('button, a[href], input, select, textarea, [role="button"], [role="tab"]').forEach(el => {
      if (decorative(el) || !visible(el)) return;
      const r = el.getBoundingClientRect();
      if (r.width < 44 - 0.5 || r.height < 44 - 0.5) {
        issues.push({ kind: '點擊區太小', detail: `${label(el)} ${Math.round(r.width)}×${Math.round(r.height)}` });
      }
      // 貼底元素不可被安全區域蓋住
      let n: Element | null = el;
      while (n && n !== document.body) {
        const pos = getComputedStyle(n).position;
        if (pos === 'fixed' || pos === 'sticky') {
          if (r.bottom > vh - safe + 0.5 && r.top < vh) {
            issues.push({ kind: '被安全區域蓋住', detail: `${label(el)} bottom ${Math.round(r.bottom)} > ${vh - safe}` });
          }
          break;
        }
        n = n.parentElement;
      }
    });
    // 捲到底：最後一段內容的下緣要在底部固定列上方
    const bars = [...document.querySelectorAll('body *')].filter(el => {
      if (decorative(el) || !visible(el) || getComputedStyle(el).position !== 'fixed') return false;
      const r = el.getBoundingClientRect();
      return r.bottom >= vh - 1 && r.width >= vw * 0.5 && r.height < vh / 3;
    });
    if (bars.length) {
      const barTop = Math.min(...bars.map(b => b.getBoundingClientRect().top));
      const y0 = window.scrollY;
      window.scrollTo(0, document.documentElement.scrollHeight);
      const flowBottom = Math.max(0, ...texts.filter(t => !t.pin).map(t => {
        const range = document.createRange();
        range.selectNodeContents(t.el);
        return Math.max(...[...range.getClientRects()].map(x => x.bottom));
      }));
      window.scrollTo(0, y0);
      if (flowBottom > barTop + 1) issues.push({ kind: '捲到底仍被底部列蓋住', detail: `內容下緣 ${Math.round(flowBottom)} > 底部列上緣 ${Math.round(barTop)}` });
    }
    return issues;
  }, SAFE_BOTTOM);
}
