// 合併解讀（梅花＋塔羅）：請求檢查、選卡、回傳檢查、提示詞
import { describe, it, expect } from 'vitest';
import { checkReading, validateRequest } from './validate.js';
import { selectCards } from './cards.js';
import { buildUserMessage } from './prompt.js';
import { createHandler } from './handler.js';

const DB = {
  tarot: [
    { id: 'T正', title: '愚者正位', source: '甲', when: { card: '愚者', orientation: '正位' }, text: '新開始' },
    { id: 'T逆', title: '愚者逆位', source: '甲', when: { card: '愚者', orientation: '逆位' }, text: '魯莽' },
  ],
  meihua: [
    { id: 'M乾', title: '乾為天', source: '乙', when: { hexagram: '乾為天' }, text: '自強不息' },
    { id: 'M坤', title: '坤為地', source: '乙', when: { hexagram: '坤為地' }, text: '厚德載物' },
  ],
  ziwei: [],
};
const FACTS = {
  meihua: { main: { name: '乾為天' }, mutual: { name: '乾為天' }, changed: { name: '乾為天' }, movingLine: 1, level: '吉', trend: '一路順' },
  tarot: { cards: [{ name: '愚者', orientation: '正位' }] },
};
const body = (over = {}) => ({ kind: 'combo', question: '要不要換工作', facts: FACTS, tone: '吉', ...over });

const reading = (basisA = '梅花：本卦乾為天', basisB = '塔羅：「愚者」正位') => ({
  risk: 'none',
  verdict: '可以換，但先拿到新工作再提',
  tone: '吉',
  paragraphs: [
    { title: '卦說可以動', text: '梅花吉', basis: [basisA], cards: ['M乾'] },
    { title: '你心裡已經準備好', text: '塔羅同向', basis: [basisB], cards: ['T正'] },
  ],
  prediction: { claim: '一個月內有面試', dueDate: '2026-12-20' },
});

describe('合併解讀請求檢查', () => {
  it('梅花與塔羅的 facts 都有才收', () => {
    expect(validateRequest(body())).toBeNull();
    expect(validateRequest(body({ facts: { meihua: FACTS.meihua } }))).toBe('Invalid facts');
    expect(validateRequest(body({ facts: { tarot: FACTS.tarot } }))).toBe('Invalid facts');
    expect(validateRequest(body({ facts: { meihua: [], tarot: FACTS.tarot } }))).toBe('Invalid facts');
  });
  it('一定要有問題、不能追問、不能帶紫微時間', () => {
    expect(validateRequest(body({ question: '  ' }))).toBe('Missing question');
    expect(validateRequest(body({ mode: 'followup', history: [{ q: 'a', a: 'b' }] }))).toBe('Invalid mode');
    expect(validateRequest(body({ focus: 'yearly' }))).toBe('Invalid focus');
  });
});

describe('合併解讀選卡', () => {
  it('只給兩邊實際出現的卡：梅花的卦＋塔羅的牌與正逆位', () => {
    expect(selectCards('combo', FACTS, undefined, DB).map((c) => c.id)).toEqual(['M乾', 'T正']);
  });
  it('facts 缺一邊就只剩另一邊', () => {
    expect(selectCards('combo', { tarot: FACTS.tarot }, undefined, DB).map((c) => c.id)).toEqual(['T正']);
    expect(selectCards('combo', null, undefined, DB)).toEqual([]);
  });
});

describe('合併解讀回傳檢查', () => {
  const cards = selectCards('combo', FACTS, undefined, DB);
  it('兩邊都有引用才過', () => {
    expect(checkReading(reading(), '吉', cards, 'combo').reading).not.toBeNull();
  });
  it('依據只用到一邊就擋下', () => {
    expect(checkReading(reading('梅花：本卦乾為天', '梅花：動爻初爻'), '吉', cards, 'combo').problem).toBe('combo_basis');
    expect(checkReading(reading('塔羅：「愚者」正位', '塔羅：「愚者」正位'), '吉', cards, 'combo').problem).toBe('combo_basis');
  });
  it('單一術數不受這條限制', () => {
    expect(checkReading(reading('本卦乾為天', '第 1 張'), '吉', cards, 'meihua').reading).not.toBeNull();
  });
  it('引用沒出現的卡（坤為地、愚者逆位）要擋', () => {
    const r = reading();
    r.paragraphs[0].cards = ['M坤'];
    expect(checkReading(r, '吉', cards, 'combo').problem).toBe('cards');
    r.paragraphs[0].cards = ['T逆'];
    expect(checkReading(r, '吉', cards, 'combo').problem).toBe('cards');
  });
});

describe('合併解讀提示詞', () => {
  it('寫明梅花下結論、塔羅補心態、要講同向或相衝、basis 標來源', () => {
    const msg = buildUserMessage({ kind: 'combo', question: '要不要換工作', facts: FACTS, tone: '吉', cards: [] }, '2026-11-25');
    expect(msg).toContain('梅花下結論');
    expect(msg).toContain('同向還是相衝');
    expect(msg).toContain('「梅花：」或「塔羅：」');
    expect(msg).toContain('"meihua"');
    expect(msg).toContain('"tarot"');
  });
});

describe('合併解讀整條流程', () => {
  const res = () => {
    const r = { headers: {} };
    r.status = (c) => { r.code = c; return r; };
    r.json = (j) => { r.body = j; return r; };
    r.set = (k, v) => { r.headers[k] = v; return r; };
    return r;
  };
  const req = (data) => ({ method: 'POST', body: data, get: () => 'https://mingli-yuxuan.web.app' });
  const env = { ALLOWED_ORIGINS: 'https://mingli-yuxuan.web.app', AI_ENABLED: 'true', DAILY_LIMIT: '60' };

  it('通過時回解讀、扣一次額度、成本記成 combo', async () => {
    let consumed = 0;
    const records = [];
    const h = createHandler({
      claude: async () => ({ reading: reading(), usage: { input_tokens: 1, output_tokens: 1 }, model: 'm' }),
      usage: { consume: async () => { consumed++; return true; } },
      cost: { record: async (r) => { records.push(r); } },
      cards: DB,
      env,
    });
    const r = res();
    await h(req(body()), r);
    expect(r.code).toBe(200);
    expect(r.body.verdict).toBe('可以換，但先拿到新工作再提');
    expect(consumed).toBe(1);
    expect(records[0].kind).toBe('combo');
  });

  it('只引用一邊時重叫一次，再不過回 502', async () => {
    let calls = 0;
    const h = createHandler({
      claude: async () => { calls++; return { reading: reading('梅花：a', '梅花：b'), usage: {}, model: 'm' }; },
      usage: { consume: async () => true },
      cards: DB,
      env,
    });
    const r = res();
    await h(req(body()), r);
    expect(calls).toBe(2);
    expect(r.code).toBe(502);
  });
});
