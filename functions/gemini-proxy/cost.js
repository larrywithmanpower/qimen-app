// AI 成本紀錄：每次「使用者請求」寫一筆 ai_calls，並累計到 ai_cost_daily/{台灣日期}
// 只記數字與狀態，不存 question、facts 或任何使用者內容
import { FieldValue, Firestore } from '@google-cloud/firestore';

const TOKEN_KEYS = ['input_tokens', 'output_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens'];

// 單價（美金 / 百萬 token）。函式資料夾單獨部署，不能 import scripts/，
// 所以這裡自己放一份；scripts/ai-cost-parity.test.mjs 會確認與 scripts/ai-cost-lib.mjs 完全相同
export const PRICES = {
  'claude-sonnet-5-5': {
    input: 2,
    output: 10,
    cacheWrite: 2.5, // 快取寫入（5 分鐘）
    cacheRead: 0.1,
  },
};

// 一次紀錄的美金成本；模型不在表內會丟錯（呼叫端決定怎麼處理，不能當 0）
export function costUsd(rec) {
  const key = Object.keys(PRICES).find((k) => rec.model === k || String(rec.model).startsWith(`${k}-`));
  const p = key && PRICES[key];
  if (!p) throw new Error(`沒有 ${rec.model} 的單價`);
  const n = (v) => Number(v) || 0;
  return (
    (n(rec.input_tokens) * p.input +
      n(rec.output_tokens) * p.output +
      n(rec.cache_creation_input_tokens) * p.cacheWrite +
      n(rec.cache_read_input_tokens) * p.cacheRead) /
    1_000_000
  );
}

// 把各次呼叫的 usage 加總
export function sumUsage(list) {
  const total = Object.fromEntries(TOKEN_KEYS.map((k) => [k, 0]));
  for (const u of list) for (const k of TOKEN_KEYS) total[k] += Number(u?.[k]) || 0;
  return total;
}

// db、inc（FieldValue.increment）由外面注入，測試時換成假的
// rec: { ts(ms), date, kind, focus, model, attempts, usage(加總後), status, latencyMs }
export function createCostRecorder(db, inc) {
  return async function record(rec) {
    const { ts, date, kind, focus, model, attempts, usage, status, latencyMs } = rec;
    await db.collection('ai_calls').add({
      ts: new Date(ts),
      date,
      kind,
      focus: focus ?? null,
      model,
      attempts,
      ...usage,
      status,
      latencyMs,
    });
    const daily = {
      [kind]: {
        requests: inc(1),
        calls: inc(attempts),
        ok: inc(status === 'ok' ? 1 : 0),
        ...Object.fromEntries(TOKEN_KEYS.map((k) => [k, inc(usage[k])])),
      },
    };
    // 算不出美金（模型不在單價表）就只記日誌、不加 totalUsd，不影響使用者
    try {
      daily.totalUsd = inc(costUsd({ model, ...usage }));
    } catch (error) {
      console.error('cost usd unknown', { model, message: error?.message });
    }
    await db.collection('ai_cost_daily').doc(date).set(daily, { merge: true });
  };
}

let recorder;
export const recordFirestore = (rec) =>
  (recorder ??= createCostRecorder(new Firestore(), FieldValue.increment))(rec);
