// 6-2 盤面核對：解讀講到的位置（牌陣位置、本互變卦、體用、星曜落宮、宮位地支、四化）要跟排出來的盤一致
import { describe, expect, it } from 'vitest'
import { chartProblems } from '../../../functions/gemini-proxy/consistency.js'
import { validateAiReading } from '../ai'
import type { AiKind, AiTone } from '../ai'
import fixtures from './chartCheck.fixtures.json'

type Obj = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
interface Fixture { kind: AiKind; label: string; tone: AiTone; facts: Obj; reading: Obj; text: string }
const READINGS = fixtures.readings as unknown as Fixture[]
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))

describe('正常解讀不誤報（真 AI 存檔 60 份：塔羅、梅花、紫微各 20）', () => {
  it('份數', () => {
    expect(READINGS).toHaveLength(60)
    for (const k of ['tarot', 'meihua', 'ziwei']) expect(READINGS.filter((r) => r.kind === k)).toHaveLength(20)
  })
  it.each(READINGS.map((r, i) => [i, r.kind, r.label, r] as const))('#%i %s %s', (_i, _k, _l, r) => {
    expect(chartProblems(r.kind, r.facts, r.text)).toEqual([])
  })
})

// 10 份故意改錯盤面的解讀：名稱都還在盤上（舊的名稱檢查抓不到），只有位置不對
const CORRUPT: { name: string; index: number; break: (f: Obj) => void; expect: RegExp }[] = [
  { name: '塔羅：過去與現在的牌對調', index: 0, break: (f) => { [f.cards[0].name, f.cards[1].name] = [f.cards[1].name, f.cards[0].name] }, expect: /過去寫成/ },
  { name: '塔羅：三個位置輪換', index: 31, break: (f) => { const c = f.cards; [c[0].name, c[1].name, c[2].name] = [c[1].name, c[2].name, c[0].name] }, expect: /寫成「/ },
  { name: '塔羅：現在與接下來對調', index: 7, break: (f) => { [f.cards[1].name, f.cards[2].name] = [f.cards[2].name, f.cards[1].name] }, expect: /寫成「/ },
  { name: '梅花：互卦與變卦對調', index: 10, break: (f) => { [f.mutual.name, f.changed.name] = [f.changed.name, f.mutual.name] }, expect: /(互卦|變卦)寫成/ },
  { name: '梅花：體卦用卦對調', index: 40, break: (f) => { [f.ti.trigram, f.yong.trigram] = [f.yong.trigram, f.ti.trigram]; [f.ti.element, f.yong.element] = [f.yong.element, f.ti.element] }, expect: /(體卦|用卦)寫成/ },
  { name: '梅花：體用生剋改掉', index: 45, break: (f) => { f.relation = '用剋體'; for (const s of f.stages ?? []) s.relation = '用剋體' }, expect: /體用關係/ },
  { name: '紫微：星曜全部往下一宮挪', index: 20, break: (f) => { const s = f.palaces.map((p: Obj) => [p.majorStars, p.minorStars]); f.palaces.forEach((p: Obj, i: number) => { [p.majorStars, p.minorStars] = s[(i + 1) % s.length] }) }, expect: /盤上.+在.宮/ },
  { name: '紫微：宮位地支錯開', index: 26, break: (f) => { const b = f.palaces.map((p: Obj) => p.branch); f.palaces.forEach((p: Obj, i: number) => { p.branch = b[(i + 1) % b.length] }) }, expect: /宮/ },
  { name: '紫微：流年四化換掉', index: 52, break: (f) => { for (const l of Object.values(f.horoscope ?? {}) as Obj[]) for (const m of l.mutagens ?? []) m.mutagen = ({ 祿: '權', 權: '科', 科: '忌', 忌: '祿' } as Obj)[m.mutagen] }, expect: /盤上沒有/ },
  { name: '紫微：流年命宮換到別的地支', index: 50, break: (f) => { f.horoscope.yearly.soulBranch = f.horoscope.yearly.soulBranch === '子' ? '丑' : '子' }, expect: /命宮寫成在/ },
]

describe('故意改錯盤面的 10 份解讀全部抓出', () => {
  it.each(CORRUPT.map((c) => [c.name, c] as const))('%s', (_n, c) => {
    const r = READINGS[c.index]
    const bad = clone(r.facts)
    c.break(bad)
    const problems = chartProblems(r.kind, bad, r.text)
    expect(problems.length).toBeGreaterThan(0)
    expect(problems.join('\n')).toMatch(c.expect)
    // 前端：換成改錯的盤就不採用；原盤照常採用
    expect(validateAiReading(r.kind, r.facts, r.tone, r.reading)).not.toBeNull()
    expect(validateAiReading(r.kind, bad, r.tone, r.reading)).toBeNull()
  })
})

describe('各條規則的句型', () => {
  const tarot = { cards: [{ position: '過去', name: '權杖六' }, { position: '現在', name: '權杖五' }, { position: '接下來', name: '聖杯三' }] }
  it('塔羅：位置後面接牌名才判；講位置但沒接牌名不判', () => {
    expect(chartProblems('tarot', tarot, '過去「權杖六」正位、現在的權杖五、接下來是「聖杯三」')).toEqual([])
    expect(chartProblems('tarot', tarot, '過去的努力被肯定，現在要沉住氣，接下來人際支持強')).toEqual([])
    expect(chartProblems('tarot', tarot, '現在「權杖六」')).toEqual(['現在寫成「權杖六」，盤上是「權杖五」'])
  })
  const meihua = { main: { name: '雷澤歸妹' }, mutual: { name: '水火既濟' }, changed: { name: '地澤臨' }, ti: { trigram: '兌' }, yong: { trigram: '震' }, relation: '體剋用', stages: [{ relation: '體剋用' }, { relation: '體生用' }, { relation: '用生體' }] }
  it('梅花：本互變卦、體用八卦與五行、生剋', () => {
    expect(chartProblems('meihua', meihua, '本卦雷澤歸妹，互卦水火既濟，變卦是「地澤臨」。體卦兌金剋用卦震木，結果用生體')).toEqual([])
    expect(chartProblems('meihua', meihua, '變卦水火既濟')).toEqual(['變卦寫成「水火既濟」，盤上是「地澤臨」'])
    expect(chartProblems('meihua', meihua, '體卦震')).toEqual(['體卦寫成震，盤上是兌'])
    expect(chartProblems('meihua', meihua, '體卦兌木')).toEqual(['兌的五行寫成木，應該是金'])
    expect(chartProblems('meihua', meihua, '整體是用剋體')).toHaveLength(1)
    expect(chartProblems('meihua', meihua, '體克用')).toEqual([])
  })
  const ziwei = {
    palaces: [
      { name: '命宮', branch: '丑', majorStars: [{ name: '天機', mutagen: '權' }], minorStars: [] },
      { name: '官祿', branch: '巳', majorStars: [{ name: '巨門' }], minorStars: [{ name: '火星' }] },
      { name: '僕役', branch: '午', majorStars: [{ name: '廉貞' }, { name: '天相' }], minorStars: [] },
      { name: '財帛', branch: '酉', majorStars: [{ name: '天同' }], minorStars: [] },
    ],
    horoscope: { focus: 'yearly', yearly: { soulBranch: '午', mutagens: [{ star: '廉貞', mutagen: '忌' }, { star: '天同', mutagen: '祿' }] } },
  }
  it('紫微：寫對的句子都不判錯', () => {
    const ok = [
      '今年流年命宮落在午宮，剛好是僕役宮', '午宮為僕役宮', '午宮有廉貞、天相', '官祿宮有旺的巨門和火星', '官祿宮在巳宮',
      '流年天同化祿落在酉宮，也就是你的財帛宮', '天機化權在命宮所在的丑宮', '廉貞化忌落午宮', '事業宮在巳宮', '交友宮有天相',
    ]
    for (const t of ok) expect(chartProblems('ziwei', ziwei, t), t).toEqual([])
  })
  it('紫微：寫錯的句子各自抓出', () => {
    expect(chartProblems('ziwei', ziwei, '官祿宮在午宮')).toEqual(['官祿宮寫成在午宮，盤上在巳宮'])
    expect(chartProblems('ziwei', ziwei, '午宮是財帛宮')).toEqual(['午宮寫成財帛宮，盤上是僕役'])
    expect(chartProblems('ziwei', ziwei, '午宮有天同')).toEqual(['午宮寫有天同，盤上天同在酉宮'])
    expect(chartProblems('ziwei', ziwei, '巨門落在酉宮')).toEqual(['寫巨門在酉宮，盤上巨門在巳宮'])
    expect(chartProblems('ziwei', ziwei, '天同化忌')).toEqual(['寫了天同化忌，盤上沒有'])
    expect(chartProblems('ziwei', ziwei, '流年命宮在子宮')).toEqual(['命宮寫成在子宮，盤上在午宮'])
  })
  it('紫微：運限層的其他宮位不判（盤上沒給那一層的十二宮）', () => {
    expect(chartProblems('ziwei', ziwei, '流年財帛宮在子宮')).toEqual([])
  })
  it('合併解讀：梅花、塔羅兩邊都核對', () => {
    expect(chartProblems('combo', { meihua, tarot }, '本卦雷澤歸妹\n過去「權杖六」')).toEqual([])
    expect(chartProblems('combo', { meihua, tarot }, '互卦地澤臨\n接下來「權杖五」')).toHaveLength(2)
  })
})
