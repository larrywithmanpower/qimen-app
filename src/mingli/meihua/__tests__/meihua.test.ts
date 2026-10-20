import { describe, expect, it } from 'vitest'
import casesRaw from '../../../../tests/oracle/meihua_cases.json?raw'
import answersRaw from '../../../../tests/oracle/meihua_answers.json?raw'
import {
  castByLunar,
  castByNumbers,
  castByTime,
  hexagramName,
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
    expect(r.level).toBe('凶')
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
    expect(castByTime(parseLocal(c.gregorian!))).toEqual(
      castByLunar({ yearZhi: l.yearZhi, month: l.month, day: l.day, hourZhi: l.hourZhi }),
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
  it('五種生剋的吉凶定調與細分都對', () => {
    const expected: Record<string, [string, string]> = {
      用生體: ['吉', '大吉'],
      體剋用: ['吉', '吉'],
      比和: ['吉', '吉'],
      體生用: ['平', '小凶'],
      用剋體: ['凶', '凶'],
    }
    const seen = new Set<string>()
    for (let a = 1; a <= 8; a++) {
      for (let b = 1; b <= 8; b++) {
        const r = castByNumbers(a, b)
        seen.add(r.relation)
        expect([r.tone, r.level]).toEqual(expected[r.relation])
      }
    }
    expect([...seen].sort()).toEqual(Object.keys(expected).sort())
  })
  it('生剋對照吉凶', () => {
    const r = castByLunar({ yearZhi: 5, month: 12, day: 17, hourZhi: 9 })
    expect([r.relation, r.tone, r.level]).toEqual(['用剋體', '凶', '凶'])
  })
})
