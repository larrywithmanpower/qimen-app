import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { MAJOR_STAR_NAMES } from '../../../src/mingli/ziwei/engine.ts'

const data = JSON.parse(
  readFileSync(new URL('./ziwei.json', import.meta.url), 'utf8'),
)
const cards = data.cards

const MINOR = ['左輔', '右弼', '文昌', '文曲', '天魁', '天鉞', '祿存', '天馬', '擎羊', '陀羅', '火星', '鈴星', '地空', '地劫']
const PALACES = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '僕役', '官祿', '田宅', '福德', '父母']
const MUTAGENS = ['祿', '權', '科', '忌']
const FOCUS = { 大限: 'decadal', 流年: 'yearly', 流月: 'monthly', 流日: 'daily' }

const countBy = (key, value) => cards.filter((c) => c.when[key] === value).length

describe('ziwei 知識卡', () => {
  it('檔頭正確、共 48 張、id 不重複', () => {
    expect(data.version).toBe(1)
    expect(data.kind).toBe('ziwei')
    expect(cards).toHaveLength(48)
    expect(new Set(cards.map((c) => c.id)).size).toBe(48)
  })

  it('主星來源與專案一致且各剛好一張', () => {
    expect(MAJOR_STAR_NAMES).toHaveLength(14)
    for (const s of [...MAJOR_STAR_NAMES, ...MINOR]) expect(countBy('star', s)).toBe(1)
    expect(cards.filter((c) => c.when.star)).toHaveLength(28)
  })

  it('十二宮、四化、運限各剛好一張', () => {
    for (const p of PALACES) expect(countBy('palace', p)).toBe(1)
    for (const m of MUTAGENS) expect(countBy('mutagen', m)).toBe(1)
    for (const f of Object.values(FOCUS)) expect(countBy('focus', f)).toBe(1)
    expect(cards.filter((c) => c.when.palace)).toHaveLength(12)
    expect(cards.filter((c) => c.when.mutagen)).toHaveLength(4)
    expect(cards.filter((c) => c.when.focus)).toHaveLength(4)
  })

  it('id 跟 when 對得上', () => {
    for (const c of cards) {
      const keys = Object.keys(c.when)
      expect(keys).toHaveLength(1)
      const [k] = keys
      const v = c.when[k]
      if (k === 'star') expect(c.id).toBe(`Z星-${v}`)
      else if (k === 'palace') expect(c.id).toBe(`Z宮-${v}`)
      else if (k === 'mutagen') expect(c.id).toBe(`Z化-${v}`)
      else if (k === 'focus') {
        const name = Object.keys(FOCUS).find((n) => FOCUS[n] === v)
        expect(c.id).toBe(`Z運-${name}`)
      } else throw new Error(`未知 when 欄位 ${k}`)
    }
  })

  it('欄位為非空字串、text 40~120 字', () => {
    for (const c of cards) {
      for (const f of ['id', 'title', 'source', 'text']) {
        expect(typeof c[f]).toBe('string')
        expect(c[f].trim().length).toBeGreaterThan(0)
      }
      const n = [...c.text].length
      expect(n, c.id).toBeGreaterThanOrEqual(40)
      expect(n, c.id).toBeLessThanOrEqual(120)
    }
  })

  it('text 不含絕對化用語', () => {
    for (const c of cards) for (const w of ['一定', '必定', '絕對']) expect(c.text, c.id).not.toContain(w)
  })

  it('疾厄宮卡不含病名類字眼', () => {
    const c = cards.find((x) => x.id === 'Z宮-疾厄')
    for (const w of ['癌', '病名']) expect(c.text).not.toContain(w)
  })
})
