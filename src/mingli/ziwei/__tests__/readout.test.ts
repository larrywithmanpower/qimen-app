import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { buildChart, horoscope, timeIndexOf } from '../engine'
import type { HoroscopeLayerKey } from '../engine'
import { palaceReadout, periodReadout, periodWord } from '../ui/readout'

// 說明文字依分層而不同；每層講的命宮與四化要等於 engine，並對得上 Windada 答案檔（案例 1，2025-08-10）
const dir = dirname(fileURLToPath(import.meta.url))
type SiteStar = [string, string, string[]]
interface SiteChart { palaces: { gz: string; bg: string; stars: SiteStar[] }[] }
const wd = JSON.parse(readFileSync(join(dir, 'ziwei.windada.json'), 'utf8')) as { horoscope: Record<string, { yearly: SiteChart; monthlyDou: SiteChart; dailyDou: SiteChart }> }
const fx = (JSON.parse(readFileSync(join(dir, 'ziwei.fixtures.json'), 'utf8')) as { id: number; solarDate: string; time: string; gender: '男' | '女' }[]).find((f) => f.id === 1)!
const input = { solarDate: fx.solarDate, timeIndex: timeIndexOf(Number(fx.time.split(':')[0])), gender: fx.gender }
const DATE = '2025-08-10'
const site = wd.horoscope[`1@${DATE}`]

const facts = buildChart(input)
const hs = horoscope(input, DATE)
const KEYS: HoroscopeLayerKey[] = ['decadal', 'age', 'yearly', 'monthly', 'daily']
const readout = (k: HoroscopeLayerKey, branch: string, today = true) => periodReadout(facts, branch, { key: k, word: periodWord(k, today), L: hs[k] })
const textOf = (r: { title: string; sentences: string[]; basis: string }) => [r.title, ...r.sentences, r.basis].join('\n')

// 網站某層的命宮與四化（標記前綴：大限／流年／流月／流日）
const siteSoul = (c: SiteChart) => c.palaces.filter((p) => p.bg === '#FFCC66').map((p) => p.gz[1])
const siteMut = (c: SiteChart, prefix: string) =>
  c.palaces
    .flatMap((p) => p.stars.flatMap(([raw, color, marks]) => marks.filter((m) => m.startsWith(prefix)).map((m) => `${color === 'R' ? raw.replace(/[廟旺得利平陷地]$/, '') : raw}化${m.slice(prefix.length)}`)))
    .sort()
// 文字裡出現的「某星化祿權科忌」
const mentioned = (t: string) => [...t.replace(/這十年|小限這年|今年|這個月|今天|整體來看/g, '').matchAll(/([一-鿿]{2,3}?)化([祿權科忌])/g)].map((m) => `${m[1]}化${m[2]}`)

describe('說明文字依分層而不同', () => {
  const sel = hs.yearly.soulBranch
  it('一生與五層的說明兩兩不同（同一張盤、同一天、同一宮）', () => {
    const texts = [textOf(palaceReadout(facts, sel)), ...KEYS.map((k) => textOf(readout(k, sel)))]
    expect(new Set(texts).size).toBe(texts.length)
  })
  it('換日期（今天 vs 那一天）用詞不同', () => {
    expect(textOf(readout('yearly', sel, true))).not.toBe(textOf(readout('yearly', sel, false)))
    expect(periodWord('yearly', false)).toBe('那一年')
  })
  it('點不同的宮：該宮的疊宮名稱不同', () => {
    const a = readout('yearly', '子')
    const b = readout('yearly', '午')
    expect(a.sentences[0]).toContain(hs.yearly.palaceNames['子'])
    expect(b.sentences[0]).toContain(hs.yearly.palaceNames['午'])
    expect(a.sentences[0]).not.toBe(b.sentences[0])
  })
})

describe('每層說明講的命宮與四化等於 engine', () => {
  for (const k of KEYS) {
    it(k, () => {
      const L = hs[k]
      const t = textOf(readout(k, L.soulBranch))
      const soulPalace = facts.palaces.find((p) => p.branch === L.soulBranch)!
      expect(t).toContain(`「${soulPalace.name}」（${L.soulBranch}宮）`)
      // 提到的四化 = 該層的四化，不多不少
      expect([...new Set(mentioned(t))].sort()).toEqual([...new Set(L.mutagens.map((m) => `${m.star}化${m.mutagen}`))].sort())
      // 每個四化落的宮名都講出來
      for (const m of L.mutagens) expect(t).toContain(`${m.star}化${m.mutagen}落在「${facts.palaces.find((p) => p.branch === m.branch)!.name}」（${m.branch}宮）`)
    })
  }
  it('今年：講歲建落在哪一宮', () => {
    const b = Object.entries(hs.yearly.suiqian!).find(([, v]) => v === '歲建')![0]
    expect(textOf(readout('yearly', '子'))).toContain(`歲建在「${facts.palaces.find((p) => p.branch === b)!.name}」（${b}宮）`)
  })
  it('重要星（祿羊陀魁鉞）都有講', () => {
    const t = textOf(readout('yearly', '子'))
    for (const names of Object.values(hs.yearly.stars)) for (const n of names.filter((x) => /[祿羊陀魁鉞]$/.test(x))) expect(t).toContain(n)
  })
})

describe('對答案檔：案例 1 在 2025-08-10', () => {
  const cases: [HoroscopeLayerKey, SiteChart, string][] = [
    ['yearly', site.yearly, '流年'],
    ['monthly', site.monthlyDou, '流月'],
    ['daily', site.dailyDou, '流日'],
  ]
  for (const [k, chart, prefix] of cases) {
    it(`${prefix}：說明講的命宮與四化等於網站`, () => {
      const t = textOf(readout(k, hs[k].soulBranch))
      const soul = siteSoul(chart)[0]
      const soulName = facts.palaces.find((p) => p.branch === soul)!.name
      expect(t).toContain(`「${soulName}」（${soul}宮）`)
      expect([...new Set(mentioned(t))].sort()).toEqual(siteMut(chart, prefix))
    })
  }
  it('大限：四化等於網站（大限標記）', () => {
    expect([...new Set(mentioned(textOf(readout('decadal', hs.decadal.soulBranch))))].sort()).toEqual(siteMut(site.yearly, '大限'))
  })
})
