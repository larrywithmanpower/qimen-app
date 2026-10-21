import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHandler, taiwanDate } from './handler.js';

const ORIGIN = 'https://mingli-yuxuan.web.app';
const SECRET_Q = '我老闆的秘密問題XYZ';

const goodReading = (tone = '吉') => ({
  verdict: '順著做',
  tone,
  paragraphs: [{ title: '現在', text: '還不錯', basis: ['第 1 張 愚者正位'] }],
  prediction: { claim: '三週內有消息', dueDate: '2026-12-01' },
});

const body = (over = {}) => ({ kind: 'tarot', question: SECRET_Q, facts: { cards: ['愚者'] }, tone: '吉', ...over });

function fakeRes() {
  const r = { code: 0, json: null, headers: {} };
  r.status = (c) => { r.code = c; return r; };
  r.json = (j) => { r.body = j; return r; };
  r.send = (s) => { r.body = s; return r; };
  r.set = (k, v) => { r.headers[k] = v; return r; };
  return r;
}
const fakeReq = (opts = {}) => ({
  method: opts.method ?? 'POST',
  body: 'data' in opts ? opts.data : body(),
  // 明確傳 origin: undefined 代表沒帶 Origin
  get: (h) => (h === 'Origin' ? ('origin' in opts ? opts.origin : ORIGIN) : undefined),
});

function setup({ env = {}, claudeImpl, consume } = {}) {
  const claude = vi.fn(claudeImpl ?? (async () => goodReading()));
  const usage = { consume: vi.fn(consume ?? (async () => true)) };
  const handler = createHandler({
    claude,
    usage,
    env: { ALLOWED_ORIGINS: `${ORIGIN},http://localhost:5180`, AI_ENABLED: 'true', ...env },
    now: () => Date.UTC(2026, 9, 21, 20, 0, 0), // UTC 20:00 = 台灣隔天 04:00
  });
  const call = async (req) => { const res = fakeRes(); await handler(req, res); return res; };
  return { claude, usage, call };
}

let logs;
beforeEach(() => {
  logs = [];
  for (const m of ['log', 'warn', 'error']) vi.spyOn(console, m).mockImplementation((...a) => { logs.push(JSON.stringify(a)); });
});
afterEach(() => vi.restoreAllMocks());

describe('Origin 檢查', () => {
  it('沒帶 Origin → 403，且不呼叫 Claude', async () => {
    const { claude, call } = setup();
    const res = await call(fakeReq({ origin: undefined }));
    expect(res.code).toBe(403);
    expect(claude).not.toHaveBeenCalled();
  });
  it('Origin 不在名單 → 403（含 OPTIONS）', async () => {
    const { call } = setup();
    expect((await call(fakeReq({ origin: 'https://evil.example' }))).code).toBe(403);
    expect((await call(fakeReq({ origin: 'https://evil.example', method: 'OPTIONS' }))).code).toBe(403);
  });
  it('ALLOWED_ORIGINS 沒設 → 全拒', async () => {
    const { call } = setup({ env: { ALLOWED_ORIGINS: '' } });
    expect((await call(fakeReq())).code).toBe(403);
  });
  it('白名單 OPTIONS → 204 並帶 CORS 標頭', async () => {
    const { call } = setup();
    const res = await call(fakeReq({ method: 'OPTIONS' }));
    expect(res.code).toBe(204);
    expect(res.headers['Access-Control-Allow-Origin']).toBe(ORIGIN);
  });
});

describe('緊急開關與每日上限', () => {
  it('AI_ENABLED 不是 true → 503', async () => {
    for (const v of [undefined, 'false', '1']) {
      const { claude, call } = setup({ env: { AI_ENABLED: v } });
      const res = await call(fakeReq());
      expect(res.code).toBe(503);
      expect(res.body).toEqual({ error: 'AI 暫停服務' });
      expect(claude).not.toHaveBeenCalled();
    }
  });
  it('用量滿了 → 429，不呼叫 Claude', async () => {
    const { claude, call } = setup({ consume: async () => false });
    const res = await call(fakeReq());
    expect(res.code).toBe(429);
    expect(res.body).toEqual({ error: '今日 AI 解讀次數已滿' });
    expect(claude).not.toHaveBeenCalled();
  });
  it('用台灣日期與預設上限 200 計數；DAILY_LIMIT 可覆寫', async () => {
    const a = setup();
    await a.call(fakeReq());
    expect(a.usage.consume).toHaveBeenCalledWith('2026-10-22', 200);
    const b = setup({ env: { DAILY_LIMIT: '5' } });
    await b.call(fakeReq());
    expect(b.usage.consume).toHaveBeenCalledWith('2026-10-22', 5);
  });
  it('壞請求不消耗額度', async () => {
    const { usage, call } = setup();
    await call(fakeReq({ data: body({ kind: 'x' }) }));
    expect(usage.consume).not.toHaveBeenCalled();
  });
  it('taiwanDate 跨日換算', () => {
    expect(taiwanDate(Date.UTC(2026, 0, 1, 15, 59, 59))).toBe('2026-01-01');
    expect(taiwanDate(Date.UTC(2026, 0, 1, 16, 0, 0))).toBe('2026-01-02');
  });
});

describe('400 壞請求', () => {
  const cases = {
    'kind 不對': body({ kind: 'qimen' }),
    'tone 不對': body({ tone: '大吉' }),
    '塔羅沒問題': body({ question: '  ' }),
    '問題超過200字': body({ question: '问'.repeat(201) }),
    'facts 不是物件': body({ facts: 'abc' }),
    'facts 超過8000字': body({ facts: { x: 'a'.repeat(8000) } }),
    '整包不是物件': null,
  };
  for (const [name, data] of Object.entries(cases)) {
    it(name, async () => {
      const { claude, call } = setup();
      expect((await call(fakeReq({ data }))).code).toBe(400);
      expect(claude).not.toHaveBeenCalled();
    });
  }
  it('紫微問題可空', async () => {
    const { call } = setup();
    expect((await call(fakeReq({ data: body({ kind: 'ziwei', question: '' }) }))).code).toBe(200);
  });
  it('GET → 405', async () => {
    const { call } = setup();
    expect((await call(fakeReq({ method: 'GET' }))).code).toBe(405);
  });
});

describe('正常與格式檢查', () => {
  it('正常回傳結構化結果，prompt 含盤面但 system 不含使用者內容', async () => {
    const { claude, call } = setup();
    const res = await call(fakeReq());
    expect(res.code).toBe(200);
    expect(res.body).toEqual(goodReading());
    const [system, user] = claude.mock.calls[0];
    expect(user).toContain('愚者');
    expect(user).toContain('<tone>吉</tone>');
    expect(system).not.toContain(SECRET_Q);
  });
  it('第一次格式不過 → 重叫一次後成功', async () => {
    let n = 0;
    const { claude, call } = setup({ claudeImpl: async () => (n++ === 0 ? { verdict: '' } : goodReading()) });
    const res = await call(fakeReq());
    expect(res.code).toBe(200);
    expect(claude).toHaveBeenCalledTimes(2);
  });
  it('兩次都不過 → 502', async () => {
    const { claude, call } = setup({ claudeImpl: async () => goodReading('凶') });
    const res = await call(fakeReq()); // 請求 tone 吉，回傳凶
    expect(res.code).toBe(502);
    expect(claude).toHaveBeenCalledTimes(2);
  });
  it('逐項格式缺陷都擋下', async () => {
    const bads = [
      { ...goodReading(), paragraphs: [] },
      { ...goodReading(), paragraphs: [{ title: 'a', text: 'b', basis: [] }] },
      { ...goodReading(), paragraphs: [{ title: 'a', text: 'b', basis: [''] }] },
      { ...goodReading(), prediction: { claim: 'x', dueDate: '2026/12/01' } },
      { ...goodReading(), prediction: { claim: 'x', dueDate: '2026-02-31' } },
      { ...goodReading(), prediction: { claim: '', dueDate: '2026-12-01' } },
      { ...goodReading(), tone: '平' },
      undefined,
    ];
    for (const bad of bads) {
      const { call } = setup({ claudeImpl: async () => bad });
      expect((await call(fakeReq())).code).toBe(502);
    }
  });
  it('Claude 丟錯 → 502 不重叫', async () => {
    const { claude, call } = setup({ claudeImpl: async () => { throw new Error('boom'); } });
    expect((await call(fakeReq())).code).toBe(502);
    expect(claude).toHaveBeenCalledTimes(1);
  });
});

describe('隱私', () => {
  it('各種情況的日誌都不含 question 與 facts', async () => {
    const paths = [
      setup(),
      setup({ claudeImpl: async () => goodReading('凶') }),
      setup({ claudeImpl: async () => { throw new Error(`含 ${SECRET_Q} 的錯誤訊息`); } }),
      setup({ consume: async () => false }),
    ];
    for (const p of paths) await p.call(fakeReq());
    const all = logs.join('\n');
    expect(all).not.toContain(SECRET_Q);
    expect(all).not.toContain('愚者');
  });
});
