// 塔羅知識卡結構測試：156 張（78 牌 × 正逆位）、id／欄位／字數／禁用詞
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CARDS } from '../../../src/mingli/tarot/cards.ts'

const data = JSON.parse(readFileSync(new URL('./tarot.json', import.meta.url), 'utf8'))
const cards = data.cards
const ORIENTATIONS = ['正位', '逆位']

describe('tarot.json 知識卡', () => {
  it('檔頭正確', () => {
    expect(data.version).toBe(1)
    expect(data.kind).toBe('tarot')
  })

  it('剛好 156 張，id 不重複', () => {
    expect(cards).toHaveLength(156)
    expect(new Set(cards.map((c) => c.id)).size).toBe(156)
  })

  it('每張牌 × 正逆位剛好一張卡', () => {
    expect(CARDS).toHaveLength(78)
    for (const card of CARDS) {
      for (const o of ORIENTATIONS) {
        const hits = cards.filter((c) => c.when.card === card.zh && c.when.orientation === o)
        expect(hits, `${card.zh}${o}`).toHaveLength(1)
      }
    }
  })

  it('id 格式正確且與 when、title 對得上', () => {
    for (const c of cards) {
      expect(c.id).toMatch(/^T\d{2}[正逆]$/)
      const card = CARDS.find((x) => x.zh === c.when.card)
      expect(card, c.id).toBeTruthy()
      const expected = `T${String(card.index).padStart(2, '0')}${c.when.orientation === '正位' ? '正' : '逆'}`
      expect(c.id).toBe(expected)
      expect(c.title).toBe(`${c.when.card}${c.when.orientation}`)
    }
  })

  it('所有欄位都是非空字串', () => {
    for (const c of cards) {
      for (const v of [c.id, c.title, c.source, c.when.card, c.when.orientation, c.text]) {
        expect(typeof v).toBe('string')
        expect(v.trim().length).toBeGreaterThan(0)
      }
      expect(ORIENTATIONS).toContain(c.when.orientation)
    }
  })

  it('text 長度 40～120 字', () => {
    for (const c of cards) {
      const n = [...c.text].length
      expect(n, `${c.id} 長度 ${n}`).toBeGreaterThanOrEqual(40)
      expect(n, `${c.id} 長度 ${n}`).toBeLessThanOrEqual(120)
    }
  })

  it('text 不含斷言字眼', () => {
    for (const c of cards) {
      for (const w of ['一定', '必定', '絕對']) {
        expect(c.text, `${c.id} 含「${w}」`).not.toContain(w)
      }
    }
  })

  it('任一句（以句號切開）不會在 3 張以上卡中完全相同', () => {
    const count = new Map()
    for (const c of cards) {
      for (const s of new Set(c.text.split('。').map((x) => x.trim()).filter(Boolean))) {
        count.set(s, (count.get(s) ?? 0) + 1)
      }
    }
    const dup = [...count].filter(([, n]) => n >= 3)
    expect(dup, `重複句：${JSON.stringify(dup)}`).toEqual([])
  })
})
