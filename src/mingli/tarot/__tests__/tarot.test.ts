import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { CARDS } from '../cards'
import {
  shuffle, drawThree, seedFrom, nextSeed, templateReading, REVERSED_RATE, SEED_RANGE,
} from '../engine'
import { faceSVG, motifSVG, backSVG } from '../cardArt'

const here = dirname(fileURLToPath(import.meta.url))

describe('可重現', () => {
  it('同一 seed＋同一 picks 重抽 100 次，100/100 相同', () => {
    const first = JSON.stringify(drawThree(4321, [3, 9, 17]))
    let same = 0
    for (let i = 0; i < 100; i++) if (JSON.stringify(drawThree(4321, [3, 9, 17])) === first) same++
    expect(same).toBe(100)
  })

  it('shuffle 一副牌 78 張、每張只出現一次', () => {
    const deck = shuffle(777)
    expect(deck).toHaveLength(78)
    expect(new Set(deck.map((d) => d.index)).size).toBe(78)
  })

  it('seedFrom / nextSeed 落在 0～99999', () => {
    for (let i = 0; i < 1000; i++) {
      const s = seedFrom(`問題${i}`, 1_700_000_000_000 + i * 997)
      expect(s).toBeGreaterThanOrEqual(0)
      expect(s).toBeLessThan(SEED_RANGE)
      const n = nextSeed(s)
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThan(SEED_RANGE)
    }
    expect(seedFrom('a', 1)).toBe(seedFrom('a', 1))
  })
})

describe('統計（seed 0～9999 共 1 萬次，picks 固定 [0,1,2]）', () => {
  const draws = Array.from({ length: 10000 }, (_, seed) => drawThree(seed, [0, 1, 2]))

  it('78 張每張都出現過', () => {
    const seen = new Set(draws.flatMap((d) => d.map((c) => c.index)))
    expect(seen.size).toBe(78)
  })

  it('逆位比例在 0.33～0.37', () => {
    const cards = draws.flat()
    const ratio = cards.filter((c) => c.reversed).length / cards.length
    expect(ratio).toBeGreaterThan(0.33)
    expect(ratio).toBeLessThan(0.37)
    expect(REVERSED_RATE).toBe(0.35)
  })
})

describe('drawThree 位置對應', () => {
  it('第 N 個 pick 對到牌堆第 pick 張，順序是過去／現在／接下來', () => {
    const deck = shuffle(2468)
    const drawn = drawThree(2468, [5, 0, 77])
    expect(drawn.map((d) => d.index)).toEqual([deck[5].index, deck[0].index, deck[77].index])
    expect(drawn.map((d) => d.reversed)).toEqual([deck[5].reversed, deck[0].reversed, deck[77].reversed])
  })

  it('picks 重複或超出範圍會丟錯', () => {
    expect(() => drawThree(1, [1, 1, 2])).toThrow()
    expect(() => drawThree(1, [0, 1, 78])).toThrow()
    expect(() => drawThree(1, [0, 1, 77])).not.toThrow()
  })
})

describe('牌組資料', () => {
  const minors = CARDS.filter((c) => c.suit !== null)

  it('共 78 張、索引 0～77 依序', () => {
    expect(CARDS).toHaveLength(78)
    CARDS.forEach((c, k) => expect(c.index).toBe(k))
    expect(CARDS.filter((c) => c.suit === null)).toHaveLength(22)
  })

  it('小牌 56 張，四花色各 14 張，順序為權杖、聖杯、寶劍、錢幣', () => {
    expect(minors).toHaveLength(56)
    const suits = ['wands', 'cups', 'swords', 'pentacles']
    suits.forEach((suit, g) => {
      const group = CARDS.filter((c) => c.suit === suit)
      expect(group).toHaveLength(14)
      expect(group.map((c) => c.index)).toEqual(Array.from({ length: 14 }, (_, k) => 22 + g * 14 + k))
    })
    expect(CARDS[22].zh).toBe('權杖王牌')
    expect(CARDS[22].en).toBe('Ace of Wands')
    expect(CARDS[22].roman).toBe('A')
    expect(CARDS[77].zh).toBe('錢幣國王')
    expect(CARDS[77].en).toBe('King of Pentacles')
    expect(CARDS[77].roman).toBe('K')
  })

  it('中文名、英文名全部不重複', () => {
    expect(new Set(CARDS.map((c) => c.zh)).size).toBe(78)
    expect(new Set(CARDS.map((c) => c.en)).size).toBe(78)
  })

  it('正逆位短義非空且 78 張兩兩不重複', () => {
    for (const c of CARDS) {
      expect(c.upright.trim()).not.toBe('')
      expect(c.reversed.trim()).not.toBe('')
    }
    expect(new Set(CARDS.map((c) => c.upright)).size).toBe(78)
    expect(new Set(CARDS.map((c) => c.reversed)).size).toBe(78)
  })
})

describe('牌面 SVG', () => {
  it('78 張 faceSVG 都含角標、中文名、英文名', () => {
    expect(CARDS).toHaveLength(78)
    for (const c of CARDS) {
      const svg = faceSVG(c.index)
      expect(svg).toContain(`>${c.roman}<`)
      expect(svg).toContain(`>${c.zh}<`)
      expect(svg).toContain(`>${c.en}<`)
    }
  })

  it('22 張大牌的圖騰字串兩兩不同', () => {
    const motifs = CARDS.filter((c) => c.suit === null).map((c) => motifSVG(c.index))
    expect(new Set(motifs).size).toBe(22)
  })

  it('SVG 內沒有寫死色碼', () => {
    const all = CARDS.map((c) => faceSVG(c.index)).join('') + backSVG()
    expect(all).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(all).not.toMatch(/rgba?\(/)
    expect(all).not.toMatch(/\b(fill|stroke)="(?!none)/)
  })
})

describe('templateReading', () => {
  it('basis 只出現抽到的那 3 張牌名', () => {
    for (let seed = 0; seed < 200; seed++) {
      const drawn = drawThree(seed, [4, 11, 19])
      const names = drawn.map((d) => d.card.zh)
      const reading = templateReading(drawn)
      expect(reading.paragraphs).toHaveLength(3)
      reading.paragraphs.forEach((p, k) => {
        expect(p.basis.startsWith(`第 ${k + 1} 張 ${names[k]}`)).toBe(true)
        const others = CARDS.map((c) => c.zh).filter((zh) => !names.some((n) => n.includes(zh)))
        for (const zh of others) expect(p.basis).not.toContain(zh)
      })
    }
  })

  it('正位張數決定 tone 與一句話', () => {
    const mk = (revs: boolean[]) =>
      revs.map((reversed, k) => ({ index: k, reversed, card: CARDS[k] }))
    expect(templateReading(mk([true, true, true]))).toMatchObject({ tone: '凶', verdict: '這次先別硬推' })
    expect(templateReading(mk([false, true, true]))).toMatchObject({ tone: '平', verdict: '先等等，條件還不夠' })
    expect(templateReading(mk([false, false, true]))).toMatchObject({ tone: '吉', verdict: '會成，但有一處要補' })
    expect(templateReading(mk([false, false, false]))).toMatchObject({ tone: '吉', verdict: '順，放手去做' })
  })

  it('段落標題與牌義取對正逆位', () => {
    const r = templateReading([
      { index: 0, reversed: false, card: CARDS[0] },
      { index: 1, reversed: true, card: CARDS[1] },
      { index: 2, reversed: false, card: CARDS[2] },
    ])
    expect(r.paragraphs.map((p) => p.title)).toEqual(['之前卡在哪', '現在的狀況', '接下來'])
    expect(r.paragraphs[0].text).toBe(CARDS[0].upright)
    expect(r.paragraphs[1].text).toBe(CARDS[1].reversed)
    expect(r.paragraphs[1].basis).toContain('逆位')
  })
})

describe('原始碼規範', () => {
  it('engine.ts 不使用 Math.random', () => {
    const src = readFileSync(join(here, '..', 'engine.ts'), 'utf8')
    expect(src).not.toContain('Math.random')
  })
})
