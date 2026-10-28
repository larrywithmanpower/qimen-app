// AI 成本紀錄：每次「使用者請求」寫一筆 ai_calls，並累計到 ai_cost_daily/{台灣日期}
// 只記數字與狀態，不存 question、facts 或任何使用者內容
import { FieldValue, Firestore } from '@google-cloud/firestore';

let db;

const TOKEN_KEYS = ['input_tokens', 'output_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens'];

// 把各次呼叫的 usage 加總
export function sumUsage(list) {
  const total = Object.fromEntries(TOKEN_KEYS.map((k) => [k, 0]));
  for (const u of list) for (const k of TOKEN_KEYS) total[k] += Number(u?.[k]) || 0;
  return total;
}

// rec: { ts(ms), date, kind, focus, model, attempts, usage(加總後), status, latencyMs }
export async function recordFirestore(rec) {
  db ??= new Firestore();
  const { ts, date, kind, focus, mode, model, attempts, usage, status, latencyMs } = rec;
  await db.collection('ai_calls').add({
    ts: new Date(ts),
    date,
    kind,
    focus: focus ?? null,
    ...(mode ? { mode } : {}),
    model,
    attempts,
    ...usage,
    status,
    latencyMs,
  });
  const inc = FieldValue.increment;
  await db.collection('ai_cost_daily').doc(date).set({
    [kind]: {
      requests: inc(1),
      calls: inc(attempts),
      ok: inc(status === 'ok' ? 1 : 0),
      ...Object.fromEntries(TOKEN_KEYS.map((k) => [k, inc(usage[k])])),
    },
  }, { merge: true });
}
