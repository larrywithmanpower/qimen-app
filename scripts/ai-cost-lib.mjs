// AI 成本計算與報表（純函式，不碰網路；scripts/ai-cost.mjs 負責讀 Firestore）

// 單價：美金 / 每百萬 token。來源：Anthropic 官方定價頁，查證日 2026-10-22。
// 不在表內的 model 會直接報錯，不能當 0 算。
export const PRICES = {
  'claude-sonnet-5-5': {
    input: 2,
    output: 10,
    cacheWrite: 2.5, // 快取寫入（5 分鐘）
    cacheRead: 0.1,
  },
};

export const DEFAULT_RATE = 32.5; // 美金換台幣的預設匯率（換算值，不是實際帳單）

// 一次紀錄的美金成本
export function costUsd(rec) {
  // API 回的 model 可能帶日期版本後綴，用開頭比對
  const key = Object.keys(PRICES).find((k) => rec.model === k || String(rec.model).startsWith(`${k}-`));
  const p = key && PRICES[key];
  if (!p) throw new Error(`沒有 ${rec.model} 的單價，請先到 scripts/ai-cost-lib.mjs 的 PRICES 補上`);
  const n = (v) => Number(v) || 0;
  return (
    (n(rec.input_tokens) * p.input +
      n(rec.output_tokens) * p.output +
      n(rec.cache_creation_input_tokens) * p.cacheWrite +
      n(rec.cache_read_input_tokens) * p.cacheRead) /
    1_000_000
  );
}

// 報表的「項目」：塔羅、梅花、紫微各層
export const ITEMS = [
  ['tarot', '塔羅'],
  ['meihua', '梅花'],
  ['ziwei:natal', '紫微・一生'],
  ['ziwei:decadal', '紫微・這十年'],
  ['ziwei:yearly', '紫微・今年'],
  ['ziwei:monthly', '紫微・這個月'],
  ['ziwei:daily', '紫微・今天'],
];

export function itemKey(rec) {
  if (rec.kind === 'ziwei') return `ziwei:${rec.focus || 'natal'}`;
  return rec.kind;
}

const emptyStat = () => ({ requests: 0, ok: 0, calls: 0, input: 0, output: 0, cacheWrite: 0, cacheRead: 0, usd: 0, maxUsd: 0 });

function add(stat, rec) {
  const c = costUsd(rec);
  stat.requests += 1;
  stat.ok += rec.status === 'ok' ? 1 : 0;
  stat.calls += Number(rec.attempts) || 0;
  stat.input += Number(rec.input_tokens) || 0;
  stat.output += Number(rec.output_tokens) || 0;
  stat.cacheWrite += Number(rec.cache_creation_input_tokens) || 0;
  stat.cacheRead += Number(rec.cache_read_input_tokens) || 0;
  stat.usd += c;
  stat.maxUsd = Math.max(stat.maxUsd, c);
}

// 依項目、依日期（日期＋術數）統計；rows 是 ai_calls 的紀錄
export function aggregate(rows) {
  const byItem = new Map();
  const byDay = new Map();
  const total = emptyStat();
  for (const rec of rows) {
    const k = itemKey(rec);
    add(byItem.get(k) ?? byItem.set(k, emptyStat()).get(k), rec);
    const dk = `${rec.date}|${k}`;
    add(byDay.get(dk) ?? byDay.set(dk, emptyStat()).get(dk), rec);
    add(total, rec);
  }
  return { byItem, byDay, total };
}

// ───────── 文字表格（中文字算兩格寬） ─────────
const width = (s) => [...String(s)].reduce((w, ch) => w + (ch.charCodeAt(0) > 0x2e7f ? 2 : 1), 0);
const padL = (s, w) => String(s) + ' '.repeat(Math.max(0, w - width(s)));
const padR = (s, w) => ' '.repeat(Math.max(0, w - width(s))) + String(s);

export function table(headers, rows) {
  const w = headers.map((h, i) => Math.max(width(h), ...rows.map((r) => width(r[i]))));
  const line = (cells) => cells.map((c, i) => (i === 0 ? padL(c, w[i]) : padR(c, w[i]))).join('  ');
  return [line(headers), w.map((x) => '-'.repeat(x)).join('  '), ...rows.map(line)].join('\n');
}

const usd = (v) => `$${v.toFixed(4)}`;
const twd = (v, rate) => `NT$${(v * rate).toFixed(2)}`;
const int = (v) => v.toLocaleString('en-US');

function statRow(label, s, rate) {
  const avg = s.ok ? s.usd / s.ok : 0;
  return [
    label, int(s.requests), int(s.ok), int(s.calls), int(s.input), int(s.output), int(s.cacheWrite), int(s.cacheRead),
    usd(s.usd), twd(s.usd, rate), s.ok ? usd(avg) : '-', s.ok ? twd(avg, rate) : '-', usd(s.maxUsd), twd(s.maxUsd, rate),
  ];
}
const HEAD = ['項目', '請求數', '成功數', 'Claude 呼叫次數', '輸入 token', '輸出 token', '快取寫入 token', '快取讀取 token', '總成本(美金)', '總成本(台幣)', '平均每次成功(美金)', '平均每次成功(台幣)', '單次最高(美金)', '單次最高(台幣)'];

export function renderReport({ rows, from, to, rate }) {
  const { byItem, byDay, total } = aggregate(rows);
  const out = [];
  out.push(`AI 成本報表  ${from} ～ ${to}（台灣日期）`);
  out.push(`台幣是用匯率 ${rate} 換算的參考值，不是實際帳單；美金依各 model 單價與真實 token 數計算。`);
  out.push('「請求數」是使用者按下解讀的次數；「Claude 呼叫次數」含格式不合格的重叫。平均成本 = 該項目全部成本（含失敗）÷ 成功數。', '');

  out.push('一、依項目');
  const itemRows = ITEMS.filter(([k]) => byItem.has(k)).map(([k, label]) => statRow(label, byItem.get(k), rate));
  out.push(table(HEAD, [...itemRows, statRow('總計', total, rate)]), '');

  out.push('二、每日明細（依日期、項目）');
  const labelOf = Object.fromEntries(ITEMS);
  const days = [...byDay.keys()].sort();
  const dayRows = days.map((dk) => {
    const [d, k] = dk.split('|');
    const r = statRow(`${d} ${labelOf[k] ?? k}`, byDay.get(dk), rate);
    return r;
  });
  out.push(dayRows.length ? table(HEAD.map((h, i) => (i === 0 ? '日期 項目' : h)), dayRows) : '（這段期間沒有紀錄）');
  return out.join('\n');
}
