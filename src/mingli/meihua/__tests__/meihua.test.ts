import { describe, expect, it } from 'vitest'
import casesRaw from '../../../../tests/oracle/meihua_cases.json?raw'
import answersRaw from '../../../../tests/oracle/meihua_answers.json?raw'
import {
  castByLunar,
  castByNumbers,
  castByTime,
  hexagramName,
  qiOf,
  seasonOf,
  lunarNumbersOf,
  templateReading,
  type MeihuaResult,
  type Trigram,
} from '../engine'

interface Answer {
  本卦上: string
  本卦下: string
  動爻: number
  互卦上: string
  互卦下: string
  變卦上: string
  變卦下: string
  體: string
  用: string
  生剋: string
}
interface Case {
  id: string
  type: 'time' | 'numbers'
  gregorian?: string
  lunar?: { yearZhi: number; month: number; day: number; hourZhi: number; isLeap: boolean }
  a?: number
  b?: number
}

const cases: Case[] = JSON.parse(casesRaw)
const answers: Record<string, Answer> = JSON.parse(answersRaw)

const parseLocal = (s: string) => {
  const [d, t] = s.split('T')
  const [y, mo, da] = d.split('-').map(Number)
  const [h, mi] = t.split(':').map(Number)
  return new Date(y, mo - 1, da, h, mi, 0)
}

// 古書兩例：年支數、月、日、時支數 → 標準答案
const bookCases: { id: string; args: [number, number, number, number]; ans: Answer }[] = [
  {
    id: '觀梅占',
    args: [5, 12, 17, 9],
    ans: { 本卦上: '兌', 本卦下: '離', 動爻: 1, 互卦上: '乾', 互卦下: '巽', 變卦上: '兌', 變卦下: '艮', 體: '兌', 用: '離', 生剋: '用剋體' },
  },
  {
    id: '牡丹占',
    args: [6, 3, 16, 4],
    ans: { 本卦上: '乾', 本卦下: '巽', 動爻: 5, 互卦上: '乾', 互卦下: '乾', 變卦上: '離', 變卦下: '巽', 體: '巽', 用: '乾', 生剋: '用剋體' },
  },
]

// 比對 7 欄：本卦、動爻、互卦、變卦、體、用、生剋
const compare = (r: MeihuaResult, a: Answer) => ({
  本卦: [r.upper, r.lower],
  動爻: r.moving,
  互卦: [r.mutual.upper, r.mutual.lower],
  變卦: [r.changed.upper, r.changed.lower],
  體: r.ti,
  用: r.yong,
  生剋: r.relation,
  _expect: {
    本卦: [a.本卦上, a.本卦下],
    動爻: a.動爻,
    互卦: [a.互卦上, a.互卦下],
    變卦: [a.變卦上, a.變卦下],
    體: a.體,
    用: a.用,
    生剋: a.生剋,
  },
})

const expectMatch = (r: MeihuaResult, a: Answer) => {
  const { _expect, ...got } = compare(r, a)
  expect(got).toEqual(_expect)
}

describe('古書兩例', () => {
  for (const c of bookCases) {
    it(c.id, () => {
      const [y, m, d, h] = c.args
      expectMatch(castByLunar({ yearZhi: y, month: m, day: d, hourZhi: h }), c.ans)
    })
  }
  it('觀梅占卦名', () => {
    const r = castByLunar({ yearZhi: 5, month: 12, day: 17, hourZhi: 9 })
    expect([r.name, r.mutual.name, r.changed.name]).toEqual(['澤火革', '天風姤', '澤山咸'])
    // 書中：傷股、不至凶危（2026-11-09 改三段計分後由「凶」變「小凶」）
    expect(r.level).toBe('小凶')
  })
  it('牡丹占卦名', () => {
    const r = castByLunar({ yearZhi: 6, month: 3, day: 16, hourZhi: 4 })
    expect([r.name, r.changed.name, r.mutual.name]).toEqual(['天風姤', '火風鼎', '乾為天'])
  })
})

describe('天文台對答案 18 案', () => {
  for (const c of cases) {
    it(`${c.id} 七欄全對`, () => {
      const ans = answers[c.id]
      if (c.type === 'time') {
        const l = c.lunar!
        expectMatch(castByLunar({ yearZhi: l.yearZhi, month: l.month, day: l.day, hourZhi: l.hourZhi }), ans)
      } else {
        expectMatch(castByNumbers(c.a!, c.b!), ans)
      }
    })
  }
  it('案例組成：13 個時間案＋5 個報數案', () => {
    expect(cases.filter((c) => c.type === 'time')).toHaveLength(13)
    expect(cases.filter((c) => c.type === 'numbers')).toHaveLength(5)
  })
})

describe('西曆轉農曆數字對天文台', () => {
  for (const c of cases.filter((x) => x.type === 'time')) {
    it(`${c.id} ${c.gregorian}`, () => {
      const got = lunarNumbersOf(parseLocal(c.gregorian!))
      const l = c.lunar!
      expect(got).toEqual({ yearZhi: l.yearZhi, month: l.month, day: l.day, hourZhi: l.hourZhi, isLeapMonth: l.isLeap })
    })
  }
  it('castByTime 與 castByLunar 一致', () => {
    const c = cases.find((x) => x.id === 'T05')!
    const l = c.lunar!
    const date = parseLocal(c.gregorian!)
    expect(castByTime(date)).toEqual(
      castByLunar({ yearZhi: l.yearZhi, month: l.month, day: l.day, hourZhi: l.hourZhi }, seasonOf(date)),
    )
  })
})

describe('64 卦名表', () => {
  const trigrams: Trigram[] = ['乾', '兌', '離', '震', '巽', '坎', '艮', '坤']
  it('64 個組合名稱不重複', () => {
    const names = trigrams.flatMap((u) => trigrams.map((l) => hexagramName(u, l)))
    expect(names).toHaveLength(64)
    expect(new Set(names).size).toBe(64)
  })
  it('八純卦', () => {
    expect(trigrams.map((t) => hexagramName(t, t))).toEqual([
      '乾為天', '兌為澤', '離為火', '震為雷', '巽為風', '坎為水', '艮為山', '坤為地',
    ])
  })
  it('抽查已知卦名', () => {
    expect(hexagramName('乾', '巽')).toBe('天風姤')
    expect(hexagramName('兌', '離')).toBe('澤火革')
    expect(hexagramName('兌', '艮')).toBe('澤山咸')
    expect(hexagramName('離', '巽')).toBe('火風鼎')
    expect(hexagramName('坎', '離')).toBe('水火既濟')
    expect(hexagramName('離', '坎')).toBe('火水未濟')
    expect(hexagramName('坤', '乾')).toBe('地天泰')
    expect(hexagramName('乾', '坤')).toBe('天地否')
  })
})

describe('報數起卦與時支開關', () => {
  it('預設不加時支：動爻 = (a+b)%6', () => {
    const r = castByNumbers(3, 5)
    expect(r.moving).toBe(2)
    expect(r.input.movingTotal).toBe(8)
  })
  it('addHour 開了動爻加時支：(3+5+9)%6 = 5', () => {
    const r = castByNumbers(3, 5, { addHour: true, hourZhi: 9 })
    expect(r.moving).toBe(5)
    expect(r.upper).toBe('離')
    expect(r.lower).toBe('巽')
  })
  it('兩數和為 6 的倍數動爻為 6', () => {
    expect(castByNumbers(4, 8).moving).toBe(6)
  })
})

describe('範本解讀', () => {
  it('tone 一致且三段都有 basis', () => {
    const samples = [
      castByLunar({ yearZhi: 5, month: 12, day: 17, hourZhi: 9 }),
      castByLunar({ yearZhi: 6, month: 3, day: 16, hourZhi: 4 }),
      ...cases.filter((c) => c.type === 'numbers').map((c) => castByNumbers(c.a!, c.b!)),
    ]
    for (const r of samples) {
      const t = templateReading(r)
      expect(t.tone).toBe(r.tone)
      expect(t.paragraphs).toHaveLength(3)
      for (const p of t.paragraphs) {
        expect(p.basis.length).toBeGreaterThan(0)
        expect(p.text).not.toMatch(/[!！]|大凶|劫數/)
      }
      expect(t.paragraphs[0].basis).toBe(`本卦 ${r.name}`)
      expect(t.paragraphs[2].basis).toBe(`變卦 ${r.changed.name}・${r.moving}爻動`)
    }
  })
})

// 2026-11-09 吉凶改三段計分＋旺衰（《梅花易數》卷二〈體用總訣〉〈衰旺論〉、卷三〈體用互變之訣〉）
// 古例資料出自卷一象數易理篇；書中沒有可靠月令，這裡都不計旺衰
describe('三段計分：古例', () => {
  const C: { id: string; cast: () => MeihuaResult; name: string; score: number; level: string; trend: string; book: string }[] = [
    { id: '觀梅占', cast: () => castByLunar({ yearZhi: 5, month: 12, day: 17, hourZhi: 9 }), name: '澤火革', score: -1, level: '小凶', trend: '先難後成', book: '傷股、不至凶危' },
    { id: '牡丹占', cast: () => castByLunar({ yearZhi: 6, month: 3, day: 16, hourZhi: 4 }), name: '天風姤', score: -7, level: '凶', trend: '前後都有阻力', book: '被馬踩毀' },
    { id: '老人有憂色占', cast: () => castByNumbers(1, 5, { addHour: true, hourZhi: 4 }), name: '天風姤', score: -5, level: '凶', trend: '先難後成', book: '五日內死' },
    { id: '少年有喜色占', cast: () => castByNumbers(7, 3, { addHour: true, hourZhi: 7 }), name: '山火賁', score: 2, level: '吉', trend: '先難後成', book: '互變俱生之，定親之喜' },
    { id: '牛哀鳴占', cast: () => castByNumbers(8, 6, { addHour: true, hourZhi: 7 }), name: '地水師', score: -2, level: '凶', trend: '先順後阻', book: '互變俱克之，被宰殺' },
    { id: '西林寺添兩勾', cast: () => castByNumbers(7, 10), name: '山澤損', score: 7, level: '大吉', trend: '前後都順', book: '用互俱生體，為吉卦' },
  ]
  for (const c of C) {
    it(`${c.id}（書：${c.book}）→ ${c.level}`, () => {
      const r = c.cast()
      expect([r.name, r.score, r.level, r.trend]).toEqual([c.name, c.score, c.level, c.trend])
      expect(r.season).toBeNull()
    })
  }
  it('已知例外：西林寺牌額占全比和，程式判吉、書判陰人之禍（書中自承體用推不出）', () => {
    const r = castByNumbers(7, 8)
    expect([r.name, r.level]).toEqual(['山地剝', '吉'])
  })
  it('走勢：開頭結果相同而中段不同才補一句', () => {
    const all = new Set<string>()
    for (let a = 1; a <= 8; a++) for (let b = 1; b <= 48; b++) all.add(castByNumbers(a, b).trend)
    expect([...all].sort()).toEqual(['先難後成', '先順後阻', '前後都有阻力', '前後都有阻力，中段有轉機', '前後都順', '前後都順，中段有消耗'].sort())
  })
  it('乾坤無互：乾為天、坤為地的過程改看變卦的互卦', () => {
    const r = castByNumbers(1, 1) // 乾為天，動爻 2（下卦）
    const fromChanged = castByNumbers(1, 1)
    expect(r.stages[1].trigram).toBe(fromChanged.stages[1].trigram)
    // 變卦天火同人（2 爻動）下卦離的 2～4 爻 → 巽，不是乾
    expect(r.changed.name).toBe('天火同人')
    expect(r.stages[1].trigram).toBe('巽')
  })
  it('用互取跟用卦同一側：動爻在下卦取下互、在上卦取上互', () => {
    const low = castByNumbers(2, 3) // 澤火革 動 5 → 用在上卦
    expect(low.moving).toBe(5)
    expect(low.stages[1].trigram).toBe(low.mutual.upper)
    const up = castByLunar({ yearZhi: 5, month: 12, day: 17, hourZhi: 9 }) // 動 1 → 用在下卦
    expect(up.stages[1].trigram).toBe(up.mutual.lower)
  })
})

describe('季節旺衰', () => {
  it('卦氣旺衰對照表（卷一〈卦氣旺〉〈卦氣衰〉）', () => {
    expect(['震', '巽', '坤'].map((t) => qiOf(t as Trigram, '春'))).toEqual(['旺', '旺', '衰'])
    expect(['離', '乾', '兌'].map((t) => qiOf(t as Trigram, '夏'))).toEqual(['旺', '衰', '衰'])
    expect(['乾', '兌', '震'].map((t) => qiOf(t as Trigram, '秋'))).toEqual(['旺', '旺', '衰'])
    expect(['坎', '離', '艮'].map((t) => qiOf(t as Trigram, '冬'))).toEqual(['旺', '衰', '平'])
    expect(['坤', '艮', '坎', '乾'].map((t) => qiOf(t as Trigram, '四季'))).toEqual(['旺', '旺', '衰', '平'])
  })
  it('季節依節氣月建：立春前一天還是冬（丑月屬四季）、立春後是春', () => {
    expect(seasonOf(new Date(2026, 1, 3, 12))).toBe('四季') // 2026 立春 2/4
    expect(seasonOf(new Date(2026, 1, 5, 12))).toBe('春')
    expect(seasonOf(new Date(2026, 4, 1, 12))).toBe('四季') // 辰月
    expect(seasonOf(new Date(2026, 4, 10, 12))).toBe('夏') // 立夏 5/5 後巳月
    expect(seasonOf(new Date(2026, 10, 9, 12))).toBe('冬') // 立冬 11/7 後亥月
  })
  it('旺衰修正：同一卦，體卦旺 +1、體卦衰（且有剋體）−2', () => {
    // 牛哀鳴占：體坤土、互變震巽木剋體
    const base = castByNumbers(8, 6, { addHour: true, hourZhi: 7 }).score
    const inSiji = castByNumbers(8, 6, { addHour: true, hourZhi: 7, at: new Date(2026, 4, 1, 12) }) // 四季：坤旺
    expect([inSiji.tiQi, inSiji.score]).toEqual(['旺', base + 1])
    const inSpring = castByNumbers(8, 6, { addHour: true, hourZhi: 7, at: new Date(2026, 2, 1, 12) }) // 春：坤衰、震巽木旺剋體
    expect(inSpring.tiQi).toBe('衰')
    expect(inSpring.score).toBe(base - 2 - 1)
  })
  it('沒給時間的報數起卦不計旺衰', () => {
    const r = castByNumbers(12, 34)
    expect([r.season, r.tiQi]).toEqual([null, null])
  })
})

describe('吉凶分布', () => {
  it('384 種組合 × 12 個月，五級每一級都出現、沒有一級超過 40%', () => {
    const count: Record<string, number> = {}
    let n = 0
    for (let m = 0; m < 12; m++) {
      const at = new Date(2026, m, 15, 12)
      for (let a = 1; a <= 8; a++) for (let b = 1; b <= 48; b++) {
        const r = castByNumbers(a, b, { at })
        count[r.level] = (count[r.level] ?? 0) + 1
        n++
      }
    }
    expect(Object.keys(count).sort()).toEqual(['凶', '吉', '大吉', '小凶', '平'].sort())
    for (const v of Object.values(count)) expect(v / n).toBeLessThanOrEqual(0.4)
  })
  it('tone 由五級歸三類：大吉吉→吉、平→平、小凶凶→凶', () => {
    const map: Record<string, string> = { 大吉: '吉', 吉: '吉', 平: '平', 小凶: '凶', 凶: '凶' }
    for (let a = 1; a <= 8; a++) for (let b = 1; b <= 48; b++) {
      const r = castByNumbers(a, b)
      expect(r.tone).toBe(map[r.level])
    }
  })
})
