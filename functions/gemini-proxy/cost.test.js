import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { costUsd, createCostRecorder } from './cost.js';

const USAGE = { input_tokens: 1000, output_tokens: 200, cache_creation_input_tokens: 30, cache_read_input_tokens: 4 };
// 假 db：記下 ai_calls 新增與 ai_cost_daily 的 set；inc 換成可比對的標記
function fakeDb() {
  const writes = { calls: [], daily: [] };
  const db = {
    writes,
    collection: (name) => ({
      add: async (d) => { writes.calls.push(d); },
      doc: (id) => ({ set: async (d, o) => { writes.daily.push({ name, id, d, o }); } }),
    }),
  };
  return db;
}
const inc = (n) => ({ inc: n });
const rec = (over = {}) => ({ ts: 0, date: '2026-10-22', kind: 'tarot', focus: null, model: 'claude-sonnet-5-5', attempts: 1, usage: USAGE, status: 'ok', latencyMs: 5, ...over });

beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));
afterEach(() => vi.restoreAllMocks());

describe('costUsd', () => {
  it('依單價算美金', () => {
    // (1000*2 + 200*10 + 30*2.5 + 4*0.1) / 1e6
    expect(costUsd({ model: 'claude-sonnet-5-5', ...USAGE })).toBeCloseTo(0.0040754, 9);
  });
  it('未知模型丟錯，不當 0', () => {
    expect(() => costUsd({ model: 'x', ...USAGE })).toThrow();
  });
});

describe('createCostRecorder', () => {
  it('ai_cost_daily 多累加頂層 totalUsd', async () => {
    const db = fakeDb();
    await createCostRecorder(db, inc)(rec());
    const { id, d } = db.writes.daily[0];
    expect(id).toBe('2026-10-22');
    expect(d.totalUsd.inc).toBeCloseTo(0.0040754, 9);
    expect(d.tarot.requests).toEqual({ inc: 1 });
  });
  it('模型不在單價表：只記日誌、不加 totalUsd，其他照寫', async () => {
    const db = fakeDb();
    await createCostRecorder(db, inc)(rec({ model: 'unknown' }));
    expect(db.writes.daily[0].d).not.toHaveProperty('totalUsd');
    expect(db.writes.daily[0].d.tarot.requests).toEqual({ inc: 1 });
    expect(console.error).toHaveBeenCalled();
  });
});
