// 梅花易數知識卡結構測試
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { hexagramName } from '../../../src/mingli/meihua/engine.ts'

const data = JSON.parse(readFileSync(new URL('./meihua.json', import.meta.url), 'utf8'))
const cards = data.cards

const TRIGRAMS = ['乾', '兌', '離', '震', '巽', '坎', '艮', '坤']
// 三爻由下往上，1 = 陽
const LINES = {
  乾: [1, 1, 1], 兌: [1, 1, 0], 離: [1, 0, 1], 震: [1, 0, 0],
  巽: [0, 1, 1], 坎: [0, 1, 0], 艮: [0, 0, 1], 坤: [0, 0, 0],
}
const RELATIONS = ['用生體', '體剋用', '比和', '體生用', '用剋體']
const ALL = TRIGRAMS.flatMap((u) => TRIGRAMS.map((l) => ({ name: hexagramName(u, l), lines: [...LINES[l], ...LINES[u]] })))

// 文王卦序
const KING_WEN = [
  '乾為天', '坤為地', '水雷屯', '山水蒙', '水天需', '天水訟', '地水師', '水地比',
  '風天小畜', '天澤履', '地天泰', '天地否', '天火同人', '火天大有', '地山謙', '雷地豫',
  '澤雷隨', '山風蠱', '地澤臨', '風地觀', '火雷噬嗑', '山火賁', '山地剝', '地雷復',
  '天雷無妄', '山天大畜', '山雷頤', '澤風大過', '坎為水', '離為火', '澤山咸', '雷風恆',
  '天山遯', '雷天大壯', '火地晉', '地火明夷', '風火家人', '火澤睽', '水山蹇', '雷水解',
  '山澤損', '風雷益', '澤天夬', '天風姤', '澤地萃', '地風升', '澤水困', '水風井',
  '澤火革', '火風鼎', '震為雷', '艮為山', '風山漸', '雷澤歸妹', '雷火豐', '火山旅',
  '巽為風', '兌為澤', '風水渙', '水澤節', '風澤中孚', '雷山小過', '水火既濟', '火水未濟',
]
const byId = (id) => cards.find((c) => c.id === id)
const pad = (n) => String(n).padStart(2, '0')

describe('meihua.json 結構', () => {
  it('頂層欄位與張數', () => {
    expect(data.version).toBe(1)
    expect(data.kind).toBe('meihua')
    expect(cards).toHaveLength(461)
    expect(new Set(cards.map((c) => c.id)).size).toBe(461)
  })

  it('所有欄位為非空字串、when 為物件', () => {
    for (const c of cards) {
      for (const k of ['id', 'title', 'source', 'text']) {
        expect(typeof c[k], `${c.id}.${k}`).toBe('string')
        expect(c[k].trim().length, `${c.id}.${k}`).toBeGreaterThan(0)
      }
      expect(c.when && typeof c.when === 'object').toBe(true)
    }
  })

  it('文字不含絕對化用語', () => {
    for (const c of cards) expect(c.text, c.id).not.toMatch(/一定|必定|絕對/)
  })

  it('64 卦各有 1 張卦辭卡與 6 張爻辭卡，id 對得上 when', () => {
    expect(ALL).toHaveLength(64)
    expect(new Set(ALL.map((h) => h.name)).size).toBe(64)
    for (const h of ALL) {
      const no = pad(KING_WEN.indexOf(h.name) + 1)
      const gua = cards.filter((c) => c.when.hexagram === h.name && c.when.line === undefined)
      expect(gua, h.name).toHaveLength(1)
      expect(gua[0].id).toBe(`M卦${no}`)
      expect(gua[0].title).toBe(`${h.name}・卦辭`)
      expect(gua[0].text).toMatch(/^原文：.+白話：.+/)
      expect(gua[0].source).toBe('《周易》原文（維基文庫）')
      for (let n = 1; n <= 6; n++) {
        const y = cards.filter((c) => c.when.hexagram === h.name && c.when.line === n)
        expect(y, `${h.name}-${n}`).toHaveLength(1)
        expect(y[0].id).toBe(`M爻${no}-${n}`)
        expect(y[0].text).toMatch(/^原文：.+白話：.+/)
        expect(y[0].source).toBe('《周易》原文（維基文庫）')
      }
    }
  })

  it('白話長度 20～80 字', () => {
    for (const c of cards.filter((x) => x.id.startsWith('M卦') || x.id.startsWith('M爻'))) {
      const plain = c.text.split('白話：')[1]
      const n = [...plain].length
      expect(n, c.id).toBeGreaterThanOrEqual(20)
      expect(n, c.id).toBeLessThanOrEqual(80)
    }
  })

  it('5 種體用、8 個卦各剛好一張', () => {
    for (const r of RELATIONS) {
      const m = cards.filter((c) => c.when.relation === r)
      expect(m, r).toHaveLength(1)
      expect(m[0].id).toBe(`M體用-${r}`)
      expect(m[0].source).toBe('邵雍《梅花易數》（古籍）白話整理')
    }
    for (const t of TRIGRAMS) {
      const m = cards.filter((c) => c.when.trigram === t)
      expect(m, t).toHaveLength(1)
      expect(m[0].id).toBe(`M八卦-${t}`)
      expect(m[0].source).toBe('邵雍《梅花易數》（古籍）白話整理')
    }
  })

  it('卦序正確', () => {
    const name = (id) => byId(id).when.hexagram
    expect(name('M卦01')).toBe('乾為天')
    expect(name('M卦02')).toBe('坤為地')
    expect(name('M卦11')).toBe('地天泰')
    expect(name('M卦12')).toBe('天地否')
    expect(name('M卦63')).toBe('水火既濟')
    expect(name('M卦64')).toBe('火水未濟')
    // 整張順序與 engine 卦名集合一致
    expect([...KING_WEN].sort()).toEqual(ALL.map((h) => h.name).sort())
  })

  it('爻題陰陽與卦象一致', () => {
    const POS = ['初', '二', '三', '四', '五', '上']
    for (const h of ALL) {
      for (let n = 1; n <= 6; n++) {
        const yang = h.lines[n - 1] === 1
        const expected = n === 1 ? `初${yang ? '九' : '六'}` : n === 6 ? `上${yang ? '九' : '六'}` : `${yang ? '九' : '六'}${POS[n - 1]}`
        const c = byId(`M爻${pad(KING_WEN.indexOf(h.name) + 1)}-${n}`)
        expect(c.title, c.id).toBe(`${h.name}・${expected}`)
        expect(c.text, c.id).toContain(`原文：${expected}：`)
      }
    }
    // 乾全九、坤全六、泰初九＋六四
    for (let n = 1; n <= 6; n++) {
      expect(byId(`M爻01-${n}`).title).toMatch(/九/)
      expect(byId(`M爻02-${n}`).title).toMatch(/六/)
    }
    expect(byId('M爻11-1').title).toBe('地天泰・初九')
    expect(byId('M爻11-4').title).toBe('地天泰・六四')
  })

  it('爻辭原文抽查', () => {
    expect(byId('M爻01-1').text).toContain('潛龍勿用')
    expect(byId('M爻02-6').text).toContain('龍戰于野，其血玄黃')
    expect(byId('M爻11-3').text).toContain('無平不陂')
    expect(byId('M爻63-5').text).toContain('東鄰殺牛')
  })
})
