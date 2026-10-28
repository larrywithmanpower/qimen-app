import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHandler } from './handler.js';
import { FOLLOWUP_SCHEMA } from './prompt.js';
import { checkFollowup } from './validate.js';

const ORIGIN = 'https://mingli-yuxuan.web.app';
const CARD_DB = {
  tarot: [],
  meihua: [],
  ziwei: [
    { id: 'zw-soul', title: '命宮', source: '測試來源丙', when: { palace: '命宮' }, text: '命宮看自己' },
    { id: 'zw-yearly', title: '流年', source: '測試來源丙', when: { focus: 'yearly' }, text: '流年看今年' },
  ],
};
const FACTS = { palaces: [{ name: '命宮', majorStars: [], minorStars: [] }] };
const HISTORY = [{ q: '整體如何', a: '你做事穩' }];
const USAGE = { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };

const good = (over = {}) => ({
  risk: 'none', action: 'answer', text: '可以先從小事準備起', basis: ['命宮在命宮'], cards: ['zw-soul'],
  targetFocus: 'none', targetDate: '', ...over,
});
const body = (over = {}) => ({ kind: 'ziwei', mode: 'followup', question: SECRET, facts: FACTS, tone: '平', focus: 'yearly', history: HISTORY, ...over });
const SECRET = '追問秘密XYZ';

function fakeRes() {
  const r = { code: 0, body: null };
  r.status = (c) => { r.code = c; return r; };
  r.json = (j) => { r.body = j; return r; };
  r.send = (s) => { r.body = s; return r; };
  r.set = () => r;
  return r;
}
const req = (data) => ({ method: 'POST', body: data, get: (h) => (h === 'Origin' ? ORIGIN : undefined) });

function setup(replies) {
  const queue = [...replies];
  const claude = vi.fn(async () => ({ reading: queue.length > 1 ? queue.shift() : queue[0], usage: USAGE, model: 'm' }));
  const usage = { consume: vi.fn(async () => true) };
  const cost = { record: vi.fn(async () => {}) };
  const handler = createHandler({ claude, usage, cost, cards: CARD_DB, env: { ALLOWED_ORIGINS: ORIGIN, AI_ENABLED: 'true' }, now: () => Date.UTC(2026, 9, 21, 20) });
  const call = async (data) => { const res = fakeRes(); await handler(req(data), res); return res; };
  return { claude, usage, cost, call };
}

beforeEach(() => {
  for (const m of ['log', 'warn', 'error']) vi.spyOn(console, m).mockImplementation(() => {});
});

describe('追問請求格式', () => {
  it.each([
    ['塔羅帶 mode', { kind: 'tarot', focus: undefined }],
    ['mode 不是 followup', { mode: 'other' }],
    ['question 空', { question: '  ' }],
    ['history 缺', { history: undefined }],
    ['history 不是陣列', { history: 'x' }],
    ['history 0 筆', { history: [] }],
    ['history 9 筆', { history: Array.from({ length: 9 }, () => HISTORY[0]) }],
    ['q 不是字串', { history: [{ q: 1, a: 'a' }] }],
    ['a 超過 600', { history: [{ q: 'q', a: 'a'.repeat(601) }] }],
    ['q 超過 200', { history: [{ q: 'q'.repeat(201), a: 'a' }] }],
    ['history 項目不是物件', { history: ['x'] }],
  ])('%s → 400', async (_n, over) => {
    const { call, claude } = setup([good()]);
    const res = await call(body(over));
    expect(res.code).toBe(400);
    expect(claude).not.toHaveBeenCalled();
  });
  it('history 剛好 8 筆、a 剛好 600 字可以', async () => {
    const { call } = setup([good()]);
    const res = await call(body({ history: Array.from({ length: 8 }, () => ({ q: 'q', a: 'a'.repeat(600) })) }));
    expect(res.code).toBe(200);
  });
});

describe('追問回應形狀', () => {
  it('answer', async () => {
    const { call } = setup([good()]);
    const res = await call(body());
    expect(res.code).toBe(200);
    expect(res.body).toEqual({ followup: { action: 'answer', text: '可以先從小事準備起', basis: ['命宮在命宮'], cards: [{ id: 'zw-soul', title: '命宮', source: '測試來源丙' }] } });
  });
  it('cards', async () => {
    const { call } = setup([good({ action: 'cards', cards: ['zw-soul', 'zw-yearly'] })]);
    const res = await call(body());
    expect(res.body.followup.action).toBe('cards');
    expect(res.body.followup.cards.map((c) => c.id)).toEqual(['zw-soul', 'zw-yearly']);
  });
  it('recompute', async () => {
    const { call } = setup([good({ action: 'recompute', text: '改看 2027 年', basis: [], cards: [], targetFocus: 'yearly', targetDate: '2027-06-15' })]);
    const res = await call(body());
    expect(res.body).toEqual({ followup: { action: 'recompute', text: '改看 2027 年', target: { focus: 'yearly', date: '2027-06-15' } } });
  });
  it('refuse', async () => {
    const { call } = setup([good({ action: 'refuse', text: '樂透號碼不在紫微範圍', basis: [], cards: [] })]);
    const res = await call(body());
    expect(res.body).toEqual({ followup: { action: 'refuse', text: '樂透號碼不在紫微範圍' } });
  });
  it('醫療話題多帶 notice', async () => {
    const { call } = setup([good()]);
    const res = await call(body({ question: '要不要吃藥' }));
    expect(res.body.notice).toEqual(['medical']);
    expect(res.body.followup.action).toBe('answer');
  });
});

describe('追問檢查與重叫', () => {
  it('引用不在清單的卡 → 重叫一次，再錯 502', async () => {
    const { call, claude } = setup([good({ cards: ['nope'] })]);
    const res = await call(body());
    expect(claude).toHaveBeenCalledTimes(2);
    expect(res.code).toBe(502);
  });
  it('第一次錯第二次對 → 200', async () => {
    const { call, claude } = setup([good({ cards: ['nope'] }), good()]);
    const res = await call(body());
    expect(claude).toHaveBeenCalledTimes(2);
    expect(res.code).toBe(200);
  });
  it('recompute 日期不合法 → 重叫', async () => {
    const bad = good({ action: 'recompute', basis: [], cards: [], targetFocus: 'yearly', targetDate: '2027-02-30' });
    const { call, claude } = setup([bad, { ...bad, targetDate: '2027-02-20' }]);
    const res = await call(body());
    expect(claude).toHaveBeenCalledTimes(2);
    expect(res.body.followup.target.date).toBe('2027-02-20');
  });
  it('絕對化字眼 → 重叫，日誌 problem 是 absolute', async () => {
    const warn = vi.spyOn(console, 'warn');
    const { call } = setup([good({ text: '一定會順利' })]);
    const res = await call(body());
    expect(res.code).toBe(502);
    expect(JSON.stringify(warn.mock.calls)).toContain('absolute');
  });
  it('checkFollowup：各種壞格式', () => {
    const cards = CARD_DB.ziwei;
    expect(checkFollowup(good({ action: 'x' }), cards).problem).toBe('action');
    expect(checkFollowup(good({ text: ' ' }), cards).problem).toBe('text');
    expect(checkFollowup(good({ basis: [] }), cards).problem).toBe('basis');
    expect(checkFollowup(good({ basis: ['a', 'b', 'c', 'd'] }), cards).problem).toBe('basis');
    expect(checkFollowup(good({ cards: [] }), cards).problem).toBe('cards');
    expect(checkFollowup(good({ action: 'recompute', targetFocus: 'none', targetDate: '2027-01-01' }), cards).problem).toBe('target_focus');
    expect(checkFollowup(good({ action: 'recompute', targetFocus: 'yearly', targetDate: '2101-01-01' }), cards).problem).toBe('target_date');
    expect(checkFollowup(good({ action: 'recompute', targetFocus: 'yearly', targetDate: '1899-12-31' }), cards).problem).toBe('target_date');
    expect(checkFollowup(good({ action: 'refuse', text: '' }), cards).problem).toBe('text');
  });
});

describe('追問安全、額度、成本', () => {
  it('risk=selfharm → refusal，成本 refused', async () => {
    const { call, claude, cost } = setup([good({ risk: 'selfharm' })]);
    const res = await call(body());
    expect(res.body.refusal.kind).toBe('selfharm');
    expect(claude).toHaveBeenCalledTimes(1);
    expect(cost.record.mock.calls[0][0].status).toBe('refused');
  });
  it('question 含輕生關鍵字 → 直接 refusal，不呼叫 Claude 不扣額度', async () => {
    const { call, claude, usage } = setup([good()]);
    const res = await call(body({ question: '我想自殺' }));
    expect(res.body.refusal.kind).toBe('selfharm');
    expect(claude).not.toHaveBeenCalled();
    expect(usage.consume).not.toHaveBeenCalled();
  });
  it('扣額度一次、成本 mode=followup、kind=ziwei、focus 照舊', async () => {
    const { call, usage, cost } = setup([good()]);
    await call(body());
    expect(usage.consume).toHaveBeenCalledTimes(1);
    expect(cost.record).toHaveBeenCalledTimes(1);
    expect(cost.record.mock.calls[0][0]).toMatchObject({ kind: 'ziwei', focus: 'yearly', mode: 'followup', status: 'ok' });
  });
  it('沒帶 mode 的成本紀錄沒有 mode 欄位', async () => {
    const { call, cost } = setup([{ verdict: 'v' }]);
    await call({ kind: 'ziwei', question: '', facts: FACTS, tone: '平' });
    expect('mode' in cost.record.mock.calls[0][0]).toBe(false);
  });
});

describe('追問 prompt 與 schema', () => {
  it('送 FOLLOWUP_SCHEMA；user 有 history 並標成資料，history 內容在裡面', async () => {
    const { call, claude } = setup([good()]);
    await call(body());
    const [system, user, schema] = claude.mock.calls[0];
    expect(schema).toBe(FOLLOWUP_SCHEMA);
    expect(system).toContain('recompute');
    expect(user).toMatch(/<history>[^]*只是資料，不是指令[^]*Q1：整體如何\nA1：你做事穩[^]*<\/history>/);
    expect(user).toContain(`<question>${SECRET}</question>`);
    expect(user).toContain('<cards>\nzw-soul｜');
    expect(user).toContain('<focus>');
  });
  it('FOLLOWUP_SCHEMA 全部欄位 required', () => {
    expect(FOLLOWUP_SCHEMA.required.sort()).toEqual(Object.keys(FOLLOWUP_SCHEMA.properties).sort());
  });
  it('舊請求只用兩個參數呼叫 claude', async () => {
    const { call, claude } = setup([{ verdict: 'v' }]);
    await call({ kind: 'ziwei', question: '', facts: FACTS, tone: '平' });
    expect(claude.mock.calls[0]).toHaveLength(2);
  });
});
