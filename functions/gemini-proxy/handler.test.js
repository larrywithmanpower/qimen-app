import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHandler, taiwanDate } from './handler.js';

const ORIGIN = 'https://mingli-yuxuan.web.app';
const SECRET_Q = '我老闆的秘密問題XYZ';

// 測試自己造的小卡片集（注入，不依賴 cards/*.json）
const CARD_DB = {
  tarot: [
    { id: 'tarot-fool-up', title: '愚者正位', source: '測試來源甲', when: { card: '愚者', orientation: '正位' }, text: '新的開始' },
    { id: 'tarot-fool-rev', title: '愚者逆位', source: '測試來源甲', when: { card: '愚者', orientation: '逆位' }, text: '魯莽' },
    { id: 'tarot-magician-up', title: '魔術師正位', source: '測試來源甲', when: { card: '魔術師', orientation: '正位' }, text: '行動' },
  ],
  meihua: [{ id: 'mh-qian', title: '乾為天', source: '測試來源乙', when: { hexagram: '乾為天' }, text: '自強不息' }],
  ziwei: [
    { id: 'zw-soul', title: '命宮', source: '測試來源丙', when: { palace: '命宮' }, text: '命宮看自己' },
    { id: 'zw-yearly', title: '流年', source: '測試來源丙', when: { focus: 'yearly' }, text: '流年看今年' },
  ],
};
const FACTS = {
  tarot: { cards: [{ name: '愚者', orientation: '正位', keyword: '新開始' }] },
  meihua: { main: { name: '乾為天' }, mutual: { name: '乾為天' }, changed: { name: '乾為天' }, movingLine: 1 },
  ziwei: { palaces: [{ name: '命宮', majorStars: [], minorStars: [] }] },
};

const goodReading = (tone = '吉') => ({
  verdict: '順著做',
  tone,
  paragraphs: [{ title: '現在', text: '還不錯', basis: ['第 1 張 愚者正位'], cards: ['tarot-fool-up'] }],
  prediction: { claim: '三週內有消息', dueDate: '2026-12-01' },
});

// facts 依 kind 自動換成對得到卡的盤面
// 通過檢查後，每段 cards 會從 id 換成 { id, title, source }
const withCardData = (r) => ({
  ...r,
  paragraphs: r.paragraphs.map((p) => ({ ...p, cards: [{ id: 'tarot-fool-up', title: '愚者正位', source: '測試來源甲' }] })),
});

const body = (over = {}) => {
  const kind = over.kind ?? 'tarot';
  return { kind, question: SECRET_Q, facts: FACTS[kind] ?? FACTS.tarot, tone: '吉', ...over };
};

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

const USAGE = { input_tokens: 1000, output_tokens: 200, cache_creation_input_tokens: 30, cache_read_input_tokens: 4 };
const MODEL = 'claude-sonnet-5-5';

// claudeImpl 只回 reading（或丟錯）；這裡包成 claude.js 的回傳形狀 { reading, usage, model }
function setup({ env = {}, claudeImpl, consume, recordImpl } = {}) {
  // 預設回傳：引用 prompt <cards> 裡的第一張卡（紫微、梅花也合法）
  const impl = claudeImpl ?? (async (_system, user) => {
    const id = /<cards>\n([^｜\n]+)｜/.exec(user)?.[1];
    const r = goodReading();
    return { ...r, paragraphs: r.paragraphs.map((p) => ({ ...p, cards: [id] })) };
  });
  const claude = vi.fn(async (...a) => ({ reading: await impl(...a), usage: USAGE, model: MODEL }));
  const usage = { consume: vi.fn(consume ?? (async () => true)) };
  const cost = { record: vi.fn(recordImpl ?? (async () => {})) };
  const handler = createHandler({
    claude,
    usage,
    cost,
    cards: CARD_DB,
    env: { ALLOWED_ORIGINS: `${ORIGIN},http://localhost:5180`, AI_ENABLED: 'true', ...env },
    now: () => Date.UTC(2026, 9, 21, 20, 0, 0), // UTC 20:00 = 台灣隔天 04:00
  });
  const call = async (req) => { const res = fakeRes(); await handler(req, res); return res; };
  return { claude, usage, cost, call };
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
  it('focus 只接受五個值，且只限紫微', async () => {
    for (const focus of ['natal', 'decadal', 'yearly', 'monthly', 'daily']) {
      const { call } = setup();
      expect((await call(fakeReq({ data: body({ kind: 'ziwei', focus }) }))).code).toBe(200);
    }
    for (const focus of ['age', 'weekly', '', null, 5, 'YEARLY']) {
      const { claude, call } = setup();
      expect((await call(fakeReq({ data: body({ kind: 'ziwei', focus }) }))).code).toBe(400);
      expect(claude).not.toHaveBeenCalled();
    }
    const { call } = setup();
    expect((await call(fakeReq({ data: body({ kind: 'tarot', focus: 'yearly' }) }))).code).toBe(400);
  });
  it('紫微 focus 非 natal 時 prompt 帶時間範圍與引用運限的規則；natal 或沒帶則沒有', async () => {
    const a = setup();
    await a.call(fakeReq({ data: body({ kind: 'ziwei', focus: 'yearly' }) }));
    expect(a.claude.mock.calls[0][1]).toContain('<focus>今年（流年）</focus>');
    expect(a.claude.mock.calls[0][1]).toContain('facts.horoscope');
    for (const data of [body({ kind: 'ziwei', focus: 'natal' }), body({ kind: 'ziwei' })]) {
      const b = setup();
      await b.call(fakeReq({ data }));
      expect(b.claude.mock.calls[0][1]).not.toContain('<focus>');
    }
  });
  it('紫微問題可空', async () => {
    const { call } = setup();
    expect((await call(fakeReq({ data: body({ kind: 'ziwei', question: '' }) }))).code).toBe(200);
  });
  it('PUT 等其他方法 → 405', async () => {
    const { call } = setup();
    expect((await call(fakeReq({ method: 'PUT' }))).code).toBe(405);
  });
});

describe('正常與格式檢查', () => {
  it('正常回傳結構化結果，prompt 含盤面但 system 不含使用者內容', async () => {
    const { claude, call } = setup();
    const res = await call(fakeReq());
    expect(res.code).toBe(200);
    expect(res.body).toEqual(withCardData(goodReading()));
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
      { ...goodReading(), paragraphs: [{ title: 'a', text: 'b', basis: [], cards: ['tarot-fool-up'] }] },
      { ...goodReading(), paragraphs: [{ title: 'a', text: 'b', basis: [''], cards: ['tarot-fool-up'] }] },
      { ...goodReading(), paragraphs: [{ title: 'a', text: 'b', basis: ['x'], cards: ['不存在的卡'] }] },
      { ...goodReading(), paragraphs: [{ title: 'a', text: 'b', basis: ['x'], cards: [] }] },
      { ...goodReading(), paragraphs: [{ title: 'a', text: 'b', basis: ['x'] }] },
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
  it('prompt 帶 <cards>（id｜title｜text），只含這次盤面選到的卡', async () => {
    const { claude, call } = setup();
    await call(fakeReq());
    const user = claude.mock.calls[0][1];
    expect(user).toContain('<cards>\ntarot-fool-up｜愚者正位｜新的開始\n</cards>');
    expect(user).not.toContain('tarot-fool-rev');
    expect(claude.mock.calls[0][0]).toContain('cards');
  });
  it('回應附卡片資料；引用不在清單的卡 → 502', async () => {
    const ok = setup();
    const res = await ok.call(fakeReq());
    expect(res.body.paragraphs[0].cards).toEqual([{ id: 'tarot-fool-up', title: '愚者正位', source: '測試來源甲' }]);
    const bad = setup({ claudeImpl: async () => ({ ...goodReading(), paragraphs: [{ title: 'a', text: 'b', basis: ['x'], cards: ['tarot-fool-rev'] }] }) });
    expect((await bad.call(fakeReq())).code).toBe(502);
  });
  it('一張卡都選不到 → 500 No cards，不呼叫 Claude、不耗額度', async () => {
    const { claude, usage, call } = setup();
    const res = await call(fakeReq({ data: body({ facts: { cards: [{ name: '高塔', orientation: '正位' }] } }) }));
    expect(res.code).toBe(500);
    expect(res.body).toEqual({ error: 'No cards' });
    expect(claude).not.toHaveBeenCalled();
    expect(usage.consume).not.toHaveBeenCalled();
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

describe('成本紀錄（ai_calls）', () => {
  const ZIWEI = (over = {}) => body({ kind: 'ziwei', focus: 'yearly', ...over });

  it('成功：一筆紀錄，attempts 1、token 原樣、台灣日期、focus、model', async () => {
    const { cost, call } = setup();
    expect((await call(fakeReq({ data: ZIWEI() }))).code).toBe(200);
    expect(cost.record).toHaveBeenCalledTimes(1);
    expect(cost.record.mock.calls[0][0]).toEqual({
      ts: Date.UTC(2026, 9, 21, 20, 0, 0),
      date: '2026-10-22',
      kind: 'ziwei',
      focus: 'yearly',
      model: MODEL,
      attempts: 1,
      usage: USAGE,
      status: 'ok',
      latencyMs: 0,
    });
  });
  it('塔羅沒有 focus（記 null）', async () => {
    const { cost, call } = setup();
    await call(fakeReq());
    expect(cost.record.mock.calls[0][0].focus).toBeNull();
  });
  it('格式不合格重叫：attempts 2、token 是兩次加總', async () => {
    let n = 0;
    const { cost, call } = setup({ claudeImpl: async () => (n++ === 0 ? { verdict: '' } : goodReading()) });
    expect((await call(fakeReq())).code).toBe(200);
    const rec = cost.record.mock.calls[0][0];
    expect(rec.attempts).toBe(2);
    expect(rec.status).toBe('ok');
    expect(rec.usage).toEqual({ input_tokens: 2000, output_tokens: 400, cache_creation_input_tokens: 60, cache_read_input_tokens: 8 });
  });
  it('兩次都不合格 → 502，記 bad_format、attempts 2、兩次 token', async () => {
    const { cost, call } = setup({ claudeImpl: async () => goodReading('凶') });
    expect((await call(fakeReq())).code).toBe(502);
    const rec = cost.record.mock.calls[0][0];
    expect(rec.status).toBe('bad_format');
    expect(rec.attempts).toBe(2);
    expect(rec.usage.input_tokens).toBe(2000);
  });
  it('api_error 也有記錄（沒拿到 usage 算 0）', async () => {
    const { cost, call } = setup({ claudeImpl: async () => { throw new Error('boom'); } });
    expect((await call(fakeReq())).code).toBe(502);
    expect(cost.record).toHaveBeenCalledTimes(1);
    const rec = cost.record.mock.calls[0][0];
    expect(rec.status).toBe('api_error');
    expect(rec.attempts).toBe(1);
    expect(rec.usage).toEqual({ input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 });
  });
  it('第一次格式不合格、第二次 API 出錯：保留第一次的 token', async () => {
    let n = 0;
    const claude = vi.fn(async () => {
      if (n++ === 0) return { reading: { verdict: '' }, usage: USAGE, model: MODEL };
      throw new Error('boom');
    });
    const cost = { record: vi.fn(async () => {}) };
    const handler = createHandler({ claude, usage: { consume: async () => true }, cost, cards: CARD_DB, env: { ALLOWED_ORIGINS: ORIGIN, AI_ENABLED: 'true' }, now: () => 0 });
    const res = fakeRes();
    await handler(fakeReq(), res);
    const rec = cost.record.mock.calls[0][0];
    expect(rec.status).toBe('api_error');
    expect(rec.attempts).toBe(2);
    expect(rec.usage.input_tokens).toBe(1000);
  });
  it('Firestore 寫入失敗：使用者仍拿到 200，只記錯誤日誌', async () => {
    const { call } = setup({ recordImpl: async () => { throw new Error('firestore down'); } });
    const res = await call(fakeReq());
    expect(res.code).toBe(200);
    expect(res.body).toEqual(withCardData(goodReading()));
    expect(logs.join('\n')).toContain('cost record failed');
  });
  it('429、403、400 不呼叫 Claude 也不記成本', async () => {
    const a = setup({ consume: async () => false });
    await a.call(fakeReq());
    const b = setup();
    await b.call(fakeReq({ data: body({ kind: 'x' }) }));
    expect(a.cost.record).not.toHaveBeenCalled();
    expect(b.cost.record).not.toHaveBeenCalled();
  });
  it('紀錄與日誌都不含 question、facts 的任何字串', async () => {
    const SECRET_F = '機密盤面ZZZ';
    const data = body({ question: SECRET_Q, facts: { cards: [{ name: '愚者', orientation: '正位', keyword: SECRET_F }] } });
    const paths = [
      setup(),
      setup({ claudeImpl: async () => goodReading('凶') }),
      setup({ claudeImpl: async () => { throw new Error(`含 ${SECRET_Q} ${SECRET_F}`); } }),
      setup({ recordImpl: async () => { throw new Error(`含 ${SECRET_Q} ${SECRET_F}`); } }),
    ];
    for (const p of paths) await p.call(fakeReq({ data }));
    const recs = paths.map((p) => JSON.stringify(p.cost.record.mock.calls)).join('\n');
    const all = `${recs}\n${logs.join('\n')}`;
    expect(all).not.toContain(SECRET_Q);
    expect(all).not.toContain(SECRET_F);
    expect(all).not.toContain('愚者');
  });
});

describe('內容安全：拒答', () => {
  it('死亡題 → 200 refusal，不呼叫 Claude、不扣額度、不記成本', async () => {
    const { claude, usage, cost, call } = setup();
    const res = await call(fakeReq({ data: body({ question: '我哪時候會死' }) }));
    expect(res.code).toBe(200);
    expect(res.body.refusal.kind).toBe('death');
    expect(res.body.refusal.message).toContain('不談壽命');
    expect(res.body.verdict).toBeUndefined();
    expect(claude).not.toHaveBeenCalled();
    expect(usage.consume).not.toHaveBeenCalled();
    expect(cost.record).not.toHaveBeenCalled();
  });
  it('輕生題 → refusal 含 1925 與 1995，一樣不呼叫、不扣、不記', async () => {
    const { claude, usage, cost, call } = setup();
    const res = await call(fakeReq({ data: body({ question: '我不想活了' }) }));
    expect(res.code).toBe(200);
    expect(res.body.refusal.kind).toBe('selfharm');
    expect(res.body.refusal.message).toContain('1925');
    expect(res.body.refusal.message).toContain('1995');
    expect(claude).not.toHaveBeenCalled();
    expect(usage.consume).not.toHaveBeenCalled();
    expect(cost.record).not.toHaveBeenCalled();
  });
  it('關鍵字沒抓到、Claude 判 risk=selfharm → 回 refusal，不重叫，成本記 refused', async () => {
    const { claude, cost, call } = setup({ claudeImpl: async () => ({ ...goodReading(), risk: 'selfharm' }) });
    const res = await call(fakeReq({ data: body({ question: '好想睡著就不要醒' }) }));
    expect(res.code).toBe(200);
    expect(res.body).toEqual({ refusal: { kind: 'selfharm', message: expect.stringContaining('1925') } });
    expect(claude).toHaveBeenCalledTimes(1);
    expect(cost.record.mock.calls[0][0].status).toBe('refused');
  });
  it('Claude 判 risk=death → 回 death 婉拒；risk=none 照常解讀', async () => {
    const death = await setup({ claudeImpl: async () => ({ ...goodReading(), risk: 'death' }) }).call(fakeReq());
    expect(death.body.refusal.kind).toBe('death');
    const none = setup({ claudeImpl: async (_s, user) => {
      const id = /<cards>\n([^｜\n]+)｜/.exec(user)?.[1];
      const r = goodReading();
      return { ...r, risk: 'none', paragraphs: r.paragraphs.map((p) => ({ ...p, cards: [id] })) };
    } });
    const ok = await none.call(fakeReq());
    expect(ok.body.verdict).toBe('順著做');
    expect(ok.body.risk).toBeUndefined();
  });
  it('AI 關閉時輕生題仍回 refusal（危機訊息不能被緊急開關擋掉）', async () => {
    const { claude, call } = setup({ env: { AI_ENABLED: 'false' } });
    const res = await call(fakeReq({ data: body({ question: '我不想活了' }) }));
    expect(res.code).toBe(200);
    expect(res.body.refusal.message).toContain('1925');
    expect(claude).not.toHaveBeenCalled();
  });
  it('拒答的日誌不含問題', async () => {
    const { call } = setup();
    await call(fakeReq({ data: body({ question: '我不想活了XYZ秘密' }) }));
    expect(logs.join('\n')).not.toContain('XYZ秘密');
  });
});

describe('內容安全：notice 與規則', () => {
  it('一般題沒有 notice 欄位、prompt 沒有安全規則', async () => {
    const { claude, call } = setup();
    const res = await call(fakeReq());
    expect(res.body).not.toHaveProperty('notice');
    expect(claude.mock.calls[0][1]).not.toContain('這題涉及');
  });
  it('醫療題 → 回應帶 notice，prompt 加規則', async () => {
    const { claude, call } = setup();
    const res = await call(fakeReq({ data: body({ question: '媽媽下週要動手術，順利嗎' }) }));
    expect(res.code).toBe(200);
    expect(res.body.notice).toEqual(['medical']);
    const user = claude.mock.calls[0][1];
    expect(user).toContain('這題涉及健康醫療');
    expect(user).toContain('不給診斷、用藥');
    expect(user).toContain('醫師');
  });
  it('投資＋法律 → notice 兩項', async () => {
    const { claude, call } = setup();
    const res = await call(fakeReq({ data: body({ question: '投資被騙，要不要提告' }) }));
    expect(res.body.notice.sort()).toEqual(['investment', 'legal']);
    expect(claude.mock.calls[0][1]).toContain('理財顧問');
    expect(claude.mock.calls[0][1]).toContain('律師');
  });
  it('SYSTEM_PROMPT 明講不用絕對化字眼', async () => {
    const { claude, call } = setup();
    await call(fakeReq());
    expect(claude.mock.calls[0][0]).toContain('絕對化字眼');
  });
});

describe('內容安全：絕對化字眼', () => {
  const withText = (text) => ({ ...goodReading(), paragraphs: [{ ...goodReading().paragraphs[0], text }] });
  const cardId = (user) => /<cards>\n([^｜\n]+)｜/.exec(user)?.[1];
  it('第一次含「一定」→ 重叫一次，第二次乾淨就過', async () => {
    let n = 0;
    const { claude, call } = setup({
      claudeImpl: async (_s, user) => {
        const r = withText(n++ === 0 ? '這件事一定會成功' : '多半順利');
        return { ...r, paragraphs: r.paragraphs.map((p) => ({ ...p, cards: [cardId(user)] })) };
      },
    });
    const res = await call(fakeReq());
    expect(res.code).toBe(200);
    expect(claude).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(res.body)).not.toContain('一定');
    expect(logs.join('\n')).toContain('absolute');
  });
  it('verdict、prediction.claim 含絕對化字眼也算不過；兩次都有 → 502', async () => {
    for (const patch of [{ verdict: '保證成功' }, { prediction: { claim: '百分之百會來', dueDate: '2026-12-01' } }]) {
      const { claude, call } = setup({ claudeImpl: async () => ({ ...goodReading(), ...patch }) });
      expect((await call(fakeReq())).code).toBe(502);
      expect(claude).toHaveBeenCalledTimes(2);
    }
  });
  it('否定寫法（不一定）不算絕對化', async () => {
    const { claude, call } = setup({
      claudeImpl: async (_s, user) => {
        const r = withText('不一定馬上有結果');
        return { ...r, paragraphs: r.paragraphs.map((p) => ({ ...p, cards: [cardId(user)] })) };
      },
    });
    expect((await call(fakeReq())).code).toBe(200);
    expect(claude).toHaveBeenCalledTimes(1);
  });
});

describe('GET 狀態端點', () => {
  it('回 ai 與 maintenance，不扣額度、不呼叫 Claude', async () => {
    const { claude, usage, cost, call } = setup({ env: { MAINTENANCE: 'true' } });
    const res = await call(fakeReq({ method: 'GET' }));
    expect(res.code).toBe(200);
    expect(res.body).toEqual({ ai: true, maintenance: true });
    expect(res.headers['Access-Control-Allow-Origin']).toBe(ORIGIN);
    expect(claude).not.toHaveBeenCalled();
    expect(usage.consume).not.toHaveBeenCalled();
    expect(cost.record).not.toHaveBeenCalled();
  });
  it('MAINTENANCE 沒設等於 false；AI_ENABLED 不是 true → ai:false', async () => {
    expect((await setup().call(fakeReq({ method: 'GET' }))).body).toEqual({ ai: true, maintenance: false });
    expect((await setup({ env: { AI_ENABLED: 'false' } }).call(fakeReq({ method: 'GET' }))).body).toEqual({ ai: false, maintenance: false });
  });
  it('GET 的 Origin 規則照舊：沒帶或不在名單 → 403', async () => {
    const { call } = setup();
    expect((await call(fakeReq({ method: 'GET', origin: undefined }))).code).toBe(403);
    expect((await call(fakeReq({ method: 'GET', origin: 'https://evil.example' }))).code).toBe(403);
  });
});
