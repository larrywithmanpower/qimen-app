import { describe, it, expect } from 'vitest';
import { selectCards } from './cards.js';
import { validateReading } from './validate.js';

// 測試自己造的小卡片集
const c = (id, when) => ({ id, title: `T-${id}`, source: `S-${id}`, text: `X-${id}`, when });
const DB = {
  tarot: [
    c('t-fool-up', { card: '愚者', orientation: '正位' }),
    c('t-fool-rev', { card: '愚者', orientation: '逆位' }),
    c('t-tower-up', { card: '高塔', orientation: '正位' }),
  ],
  meihua: [
    c('m-qian', { hexagram: '乾為天' }),
    c('m-kun', { hexagram: '坤為地' }),
    c('m-tai', { hexagram: '地天泰' }),
    c('m-qian-1', { hexagram: '乾為天', line: 1 }),
    c('m-qian-2', { hexagram: '乾為天', line: 2 }),
    c('m-rel', { relation: '用生體' }),
    c('m-rel2', { relation: '體克用' }),
    c('m-tri-qian', { trigram: '乾' }),
    c('m-tri-kun', { trigram: '坤' }),
    c('m-tri-kan', { trigram: '坎' }),
  ],
  ziwei: [
    c('z-star-zw', { star: '紫微' }),
    c('z-star-tj', { star: '天機' }),
    c('z-star-zf', { star: '左輔' }),
    c('z-star-qs', { star: '七殺' }),
    c('z-p-soul', { palace: '命宮' }),
    c('z-p-wealth', { palace: '財帛' }),
    c('z-m-lu', { mutagen: '祿' }),
    c('z-m-ji', { mutagen: '忌' }),
    c('z-f-yearly', { focus: 'yearly' }),
    c('z-f-daily', { focus: 'daily' }),
    c('z-f-decadal', { focus: 'decadal' }),
  ],
};
const ids = (r) => r.map((x) => x.id);

describe('selectCards：塔羅', () => {
  it('依牌名＋正逆位選卡，順序照卡片檔', () => {
    const facts = { cards: [{ name: '高塔', orientation: '正位' }, { name: '愚者', orientation: '逆位' }] };
    expect(ids(selectCards('tarot', facts, undefined, DB))).toEqual(['t-fool-rev', 't-tower-up']);
  });
  it('同一張牌方向不同不會混；對不到的牌略過、不丟錯', () => {
    expect(ids(selectCards('tarot', { cards: [{ name: '愚者', orientation: '正位' }, { name: '不存在', orientation: '正位' }] }, undefined, DB))).toEqual(['t-fool-up']);
    expect(selectCards('tarot', {}, undefined, DB)).toEqual([]);
    expect(selectCards('tarot', { cards: ['愚者'] }, undefined, DB)).toEqual([]);
  });
});

describe('selectCards：梅花', () => {
  const facts = {
    main: { name: '乾為天' }, mutual: { name: '乾為天' }, changed: { name: '地天泰' },
    movingLine: 2, ti: { trigram: '乾' }, yong: { trigram: '坎' }, relation: '用生體',
  };
  it('三卦卦辭、動爻爻辭、體用、八卦都選到，且不重複', () => {
    expect(ids(selectCards('meihua', facts, undefined, DB))).toEqual(['m-qian', 'm-tai', 'm-qian-2', 'm-rel', 'm-tri-qian', 'm-tri-kan']);
  });
  it('爻辭只取本卦的動爻；動爻不在 1~6 或缺欄位就不選爻辭', () => {
    expect(ids(selectCards('meihua', { ...facts, movingLine: 1 }, undefined, DB))).toContain('m-qian-1');
    expect(ids(selectCards('meihua', { ...facts, movingLine: 9 }, undefined, DB)).some((x) => x.startsWith('m-qian-'))).toBe(false);
    expect(ids(selectCards('meihua', { main: { name: '坤為地' }, movingLine: 1 }, undefined, DB))).toEqual(['m-kun']);
  });
});

describe('selectCards：紫微', () => {
  const facts = {
    palaces: [
      { name: '命宮', majorStars: [{ name: '紫微', mutagen: '祿' }], minorStars: [{ name: '左輔' }] },
      { name: '財帛', majorStars: [{ name: '天機' }], minorStars: [] },
    ],
  };
  it('本命：主星輔星、宮位、本命四化；不帶運限卡', () => {
    expect(ids(selectCards('ziwei', facts, 'natal', DB))).toEqual(['z-star-zw', 'z-star-tj', 'z-star-zf', 'z-p-soul', 'z-p-wealth', 'z-m-lu']);
    expect(ids(selectCards('ziwei', facts, undefined, DB))).not.toContain('z-f-yearly');
  });
  it('選運限層：加該層運限卡，並納入運限各層的四化', () => {
    const f = { ...facts, horoscope: { focus: 'yearly', yearly: { soulBranch: '午', mutagens: [{ star: '天機', mutagen: '忌', branch: '子' }] } } };
    const r = ids(selectCards('ziwei', f, 'yearly', DB));
    expect(r).toContain('z-f-yearly');
    expect(r).toContain('z-m-ji');
    expect(r).not.toContain('z-f-daily');
    expect(r).not.toContain('z-star-qs');
    expect(r).not.toContain('z-f-decadal');
  });
  it('選運限層且附大限背景：同時給大限卡', () => {
    const f = { ...facts, horoscope: { focus: 'yearly', decadal: { soulBranch: '寅', mutagens: [] }, yearly: { soulBranch: '午', mutagens: [] } } };
    const r = ids(selectCards('ziwei', f, 'yearly', DB));
    expect(r).toContain('z-f-yearly');
    expect(r).toContain('z-f-decadal');
  });
});

describe('validateReading：知識卡引用', () => {
  const allowed = [c('a', {}), c('b', {})];
  const good = (cards) => ({
    verdict: 'v', tone: '吉',
    paragraphs: [{ title: 't', text: 'x', basis: ['b'], ...(cards === undefined ? {} : { cards }) }],
    prediction: { claim: 'c', dueDate: '2026-12-01' },
  });
  it('合法引用通過，並附 { id, title, source }', () => {
    const r = validateReading(good(['a', 'b']), '吉', allowed);
    expect(r.paragraphs[0].cards).toEqual([{ id: 'a', title: 'T-a', source: 'S-a' }, { id: 'b', title: 'T-b', source: 'S-b' }]);
  });
  it('引用不在清單的卡 → null', () => {
    expect(validateReading(good(['a', 'zzz']), '吉', allowed)).toBeNull();
  });
  it('cards 是空陣列、沒有 cards 欄位、含空字串或非字串 → null', () => {
    for (const bad of [[], undefined, [''], [1], 'a']) expect(validateReading(good(bad), '吉', allowed)).toBeNull();
  });
});
