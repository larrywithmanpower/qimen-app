import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { buildChart, horoscope, timeIndexOf, type Gender, type HoroscopeLayer } from '../engine'

// 對答案：Windada 紫微斗數（fate.windada.com）。答案檔 ziwei.windada.json 不可改；決定與例外見該檔 decisions 段
const dir = dirname(fileURLToPath(import.meta.url))
type SiteStar = [string, string, string[]]
interface SitePalace { gz: string; name: string; decadal: string; ages: number[]; bg: string; stars: SiteStar[] }
interface SiteChart { title: string; palaces: SitePalace[] }
interface Windada {
  natal: Record<string, SiteChart>
  horoscope: Record<string, { yearly: SiteChart; monthlyDou: SiteChart; dailyDou: SiteChart }>
  decisions: Record<string, string>
}
interface Fixture { id: number; solarDate: string; time: string; gender: Gender; source: { siteLunar: string } }

const wd: Windada = JSON.parse(readFileSync(join(dir, 'ziwei.windada.json'), 'utf8'))
const fixtures: Fixture[] = JSON.parse(readFileSync(join(dir, 'ziwei.fixtures.json'), 'utf8'))
const input = (fx: Fixture) => ({ solarDate: fx.solarDate, timeIndex: timeIndexOf(Number(fx.time.split(':')[0])), gender: fx.gender })

const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
const BRIGHT = '廟旺得利平陷地'
const CHANGSHENG = ['長生', '沐浴', '冠帶', '臨官', '帝旺', '衰', '病', '死', '墓', '絕', '胎', '養']
const BOSHI = ['博士', '力士', '青龍', '小耗', '將軍', '奏書', '飛廉', '喜神', '病符', '大耗', '伏兵', '官府']
const SUIQIAN = ['歲建', '晦氣', '喪門', '貫索', '官符', '小耗', '大耗', '龍德', '白虎', '天德', '弔客', '病符']
const JIANGQIAN = ['將星', '攀鞍', '歲驛', '息神', '華蓋', '劫煞', '災煞', '天煞', '指背', '咸池', '月煞', '亡神']

const branchOf = (p: SitePalace) => p.gz[1]
const stemOf = (p: SitePalace) => p.gz[0]
// 網站主星名稱後面接亮度（「地」等於「得」）
const splitMajor = (raw: string) => {
  const last = raw[raw.length - 1]
  return BRIGHT.includes(last) ? { name: raw.slice(0, -1), brightness: last === '地' ? '得' : last } : { name: raw, brightness: '' }
}
const siteNames = (p: SitePalace, color: string) => p.stars.filter((s) => s[1] === color).map((s) => s[0])
const sortStr = (a: string[]) => [...a].sort()

// 網站某層四化標記：「流年權」→ 星名＋化
function siteMutagens(chart: SiteChart, prefix: string): string[] {
  const out: string[] = []
  for (const p of chart.palaces) {
    for (const [raw, color, marks] of p.stars) {
      const name = color === 'R' ? splitMajor(raw).name : raw
      for (const m of marks) if (m.startsWith(prefix)) out.push(`${name}化${m.slice(prefix.length)}`)
    }
  }
  return sortStr(out)
}
const appMutagens = (layer: HoroscopeLayer) => sortStr(layer.mutagens.map((m) => `${m.star}化${m.mutagen}`))
const soulOf = (chart: SiteChart) => chart.palaces.filter((p) => p.bg === '#FFCC66').map(branchOf)
const threeFour = (chart: SiteChart) => sortStr(chart.palaces.filter((p) => p.bg === '#CCFF33').map(branchOf))
// 命宮的三方四正：對宮與左右三合（命宮本身另標）
const surround = (soul: string) => {
  const i = BRANCHES.indexOf(soul)
  return sortStr([4, 6, 8].map((n) => BRANCHES[(i + n) % 12]))
}

describe('答案檔完整', () => {
  it('本命 30 盤、運限 10 盤×3 日期', () => {
    expect(Object.keys(wd.natal)).toHaveLength(30)
    expect(Object.keys(wd.horoscope)).toHaveLength(30)
    expect(new Set(Object.keys(wd.horoscope).map((k) => k.split('@')[0])).size).toBe(10)
  })
})

// ───────── 本命 30 盤 × 12 宮 ─────────
describe('本命盤面（30 盤）', () => {
  for (const fx of fixtures) {
    it(`${fx.id} ${fx.solarDate} ${fx.time} ${fx.gender}`, () => {
      const facts = buildChart(input(fx))
      const site = wd.natal[String(fx.id)]
      expect(site.palaces).toHaveLength(12)
      const yearStem = facts.chineseDate[0]
      const diffs: string[] = []
      const siteMut: string[] = []
      const appMut: string[] = []
      for (const sp of site.palaces) {
        const b = branchOf(sp)
        const p = facts.palaces.find((x) => x.branch === b)!
        const tag = `${b}宮`
        if (p.stem !== stemOf(sp)) diffs.push(`${tag} 宮干 ${p.stem} ≠ ${stemOf(sp)}`)
        if (p.isBody !== sp.name.includes('身宮')) diffs.push(`${tag} 身宮標記`)
        const [d0, d1] = sp.decadal.split('-').map(Number)
        if (p.decadalRange[0] !== d0 || p.decadalRange[1] !== d1) diffs.push(`${tag} 大限 ${p.decadalRange} ≠ ${sp.decadal}`)
        if (JSON.stringify(p.ages.slice(0, sp.ages.length)) !== JSON.stringify(sp.ages)) diffs.push(`${tag} 小限 ${p.ages} ≠ ${sp.ages}`)

        // 主星亮度
        const siteMajor = sp.stars.filter((s) => s[1] === 'R').map((s) => splitMajor(s[0]))
        const appMajor = p.majorStars.map((s) => ({ name: s.name, brightness: s.brightness ?? '' }))
        if (JSON.stringify(appMajor.sort((a, c) => a.name.localeCompare(c.name))) !== JSON.stringify(siteMajor.sort((a, c) => a.name.localeCompare(c.name)))) {
          diffs.push(`${tag} 主星亮度 ${JSON.stringify(appMajor)} ≠ ${JSON.stringify(siteMajor)}`)
        }

        // 輔星：辛年天魁天鉞沿用 iztro（網站相反），兩邊都排除
        const skip = (n: string) => yearStem === '辛' && (n === '天魁' || n === '天鉞')
        const sMinor = sortStr(siteNames(sp, 'B').filter((n) => !skip(n)))
        const aMinor = sortStr(p.minorStars.map((s) => s.name).filter((n) => !skip(n)))
        if (JSON.stringify(sMinor) !== JSON.stringify(aMinor)) diffs.push(`${tag} 輔星 ${aMinor} ≠ ${sMinor}`)

        // 生年四化（主星與輔星）
        for (const [raw, color, marks] of sp.stars) {
          const name = color === 'R' ? splitMajor(raw).name : raw
          for (const m of marks) siteMut.push(`${name}化${m}`)
        }
        for (const s of [...p.majorStars, ...p.minorStars]) if (s.mutagen) appMut.push(`${s.name}化${s.mutagen}`)

        // 長生 12、博士 12
        const k = siteNames(sp, 'K')
        const sCs = k.filter((n) => CHANGSHENG.includes(n))
        const sBs = k.filter((n) => BOSHI.includes(n))
        if (sCs.length !== 1 || sCs[0] !== p.changsheng12) diffs.push(`${tag} 長生 ${p.changsheng12} ≠ ${sCs}`)
        if (sBs.length !== 1 || sBs[0] !== p.boshi12) diffs.push(`${tag} 博士 ${p.boshi12} ≠ ${sBs}`)
      }
      if (JSON.stringify(sortStr(appMut)) !== JSON.stringify(sortStr(siteMut))) diffs.push(`生年四化 ${sortStr(appMut)} ≠ ${sortStr(siteMut)}`)
      expect(diffs).toEqual([])
    })
  }
})

// ───────── 雜曜 ─────────
// 網站有、App 也要有。例外：月馬（網站獨有，不做）；旬空（App 只標一宮，必須是網站兩宮之一）
describe('雜曜（30 盤）', () => {
  for (const fx of fixtures) {
    it(`${fx.id} 網站雜曜 App 都有`, () => {
      const facts = buildChart(input(fx))
      const site = wd.natal[String(fx.id)]
      const diffs: string[] = []
      const siteXun: string[] = []
      for (const sp of site.palaces) {
        const p = facts.palaces.find((x) => x.branch === branchOf(sp))!
        const adj = siteNames(sp, 'K').filter((n) => !CHANGSHENG.includes(n) && !BOSHI.includes(n) || n === '病符' && false)
        for (const n of adj) {
          if (n === '月馬') continue
          if (n === '旬空') { siteXun.push(branchOf(sp)); continue }
          if (!p.adjectiveStars.includes(n)) diffs.push(`${branchOf(sp)}宮 缺 ${n}`)
        }
      }
      expect(siteXun).toHaveLength(2)
      const appXun = facts.palaces.filter((p) => p.adjectiveStars.includes('旬空')).map((p) => p.branch)
      expect(appXun).toHaveLength(1)
      expect(siteXun).toContain(appXun[0])
      expect(diffs).toEqual([])
    })
  }
})

// 安星口訣（手工排盤用，直接寫在這裡、不從 engine 匯入）。以生年干支為準
// 天廚（依年干）：來源 108s.tw 手工排盤第 11 步
const TIANCHU: Record<string, string> = { 甲: '巳', 丁: '巳', 乙: '午', 戊: '午', 辛: '午', 丙: '子', 己: '申', 庚: '寅', 壬: '酉', 癸: '亥' }
// 天德：從酉起子年，順數到生年地支
const tiande = (yb: number) => BRANCHES[(9 + yb) % 12]
// 年解：從戌起子年，逆數到生年地支
const nianjie = (yb: number) => BRANCHES[(10 - yb + 12) % 12]
// 月德：從巳起子年，順數到生年地支（古本另有「從子起」一說，L 選用 iztro 這派）
const yuede = (yb: number) => BRANCHES[(5 + yb) % 12]

describe('App 多出的四顆雜曜：天廚、天德、年解、月德對口訣', () => {
  for (const fx of fixtures) {
    it(`${fx.id}`, () => {
      const facts = buildChart(input(fx))
      const [ys, yb] = [facts.chineseDate[0], BRANCHES.indexOf(facts.chineseDate[1])]
      const where = (n: string) => facts.palaces.filter((p) => p.adjectiveStars.includes(n)).map((p) => p.branch)
      expect(where('天廚'), '天廚').toEqual([TIANCHU[ys]])
      expect(where('天德'), '天德').toEqual([tiande(yb)])
      expect(where('年解'), '年解').toEqual([nianjie(yb)])
      expect(where('月德'), '月德').toEqual([yuede(yb)])
    })
  }

  it('App 的雜曜不會比網站多出這四顆與旬空以外的星', () => {
    const extra = new Set(['天廚', '天德', '年解', '月德', '旬空'])
    for (const fx of fixtures) {
      const facts = buildChart(input(fx))
      const site = wd.natal[String(fx.id)]
      for (const sp of site.palaces) {
        const p = facts.palaces.find((x) => x.branch === branchOf(sp))!
        const siteSet = new Set(siteNames(sp, 'K'))
        for (const n of p.adjectiveStars) {
          if (!extra.has(n)) expect(siteSet.has(n), `${fx.id} ${branchOf(sp)}宮多出 ${n}`).toBe(true)
        }
      }
    }
  })
})

// ───────── 運限 30 組 ─────────
// 案例 11（國曆 1990-01-26，農曆仍是 1989 年）網站在這幾項用了國曆年份，App 照農曆年，不比對網站（答案檔 decisions 段）：
//   流月命宮、流日命宮、大限四化、流年歲前將前
// 另外實測 11 的「流年星」（流祿、流羊…）也是同一個原因（網站用了前一年的干支），為免過度放行，
// 這一項不是跳過，而是改驗「網站的流年星＝App 前一年的流年星」
const KNOWN_SITE_ERRORS: Record<number, string[]> = { 11: ['monthlySoul', 'dailySoul', 'decadalMutagen', 'suiqianJiangqian'] }
const skippedItems = new Set<string>()
const excluded = (key: string, item: string) => {
  const hit = KNOWN_SITE_ERRORS[Number(key.split('@')[0])]?.includes(item) ?? false
  if (hit) skippedItems.add(`${key}:${item}`)
  return hit
}
// 辛年天魁、天鉞維持 iztro（網站相反），流魁、流鉞同理
const KUIYUE = ['流魁', '流鉞']

describe('運限（10 盤 × 3 日期）', () => {
  for (const [key, h] of Object.entries(wd.horoscope)) {
    const [idStr, date] = key.split('@')
    const id = Number(idStr)
    const fx = fixtures.find((f) => f.id === id)!
    it(`${key}`, () => {
      const hs = horoscope(input(fx), date)
      const diffs: string[] = []
      const check = (item: string, got: unknown, want: unknown) => {
        if (JSON.stringify(got) !== JSON.stringify(want)) diffs.push(`${item}：App ${JSON.stringify(got)} ≠ 網站 ${JSON.stringify(want)}`)
      }
      const natal = buildChart(input(fx))

      // 流年
      check('流年命宮', [hs.yearly.soulBranch], soulOf(h.yearly))
      check('流年四化', appMutagens(hs.yearly), siteMutagens(h.yearly, '流年'))
      if (!excluded(key, 'decadalMutagen')) check('大限四化', appMutagens(hs.decadal), siteMutagens(h.yearly, '大限'))
      check('生年四化（運限盤內標記）', sortStr(natal.palaces.flatMap((p) => [...p.majorStars, ...p.minorStars]).filter((s) => s.mutagen).map((s) => `${s.name}化${s.mutagen}`)), siteMutagens(h.yearly, '本命'))
      // 小限宮：落在小限歲數含虛歲的那一宮
      check('小限宮', [hs.age.soulBranch], h.yearly.palaces.filter((p) => p.ages.includes(hs.nominalAge)).map(branchOf))
      const title = h.yearly.title.match(/農曆(\d+)年/)!
      const birthYear = Number(fx.source.siteLunar.slice(0, 4))
      check('虛歲', hs.nominalAge, Number(title[1]) - birthYear + 1)
      check('三方四正（流年）', surround(hs.yearly.soulBranch), threeFour(h.yearly))

      // 流年星、歲前、將前。案例 11 的網站用了前一年的干支，改拿 App 前一年的資料來比
      const sameStarsAsSite = excluded(key, 'suiqianJiangqian')
      const ref = sameStarsAsSite ? horoscope(input(fx), `${hs.lunar.year - 1}-07-15`).yearly : hs.yearly
      const noKuiyue = (names: string[]) => (ref.stem === '辛' ? names.filter((n) => !KUIYUE.includes(n)) : names)
      for (const sp of h.yearly.palaces) {
        const b = branchOf(sp)
        const green = siteNames(sp, 'green')
        const flow = noKuiyue(green.filter((n) => n.startsWith('流')))
        const mine = noKuiyue(ref.stars[b])
        const missing = flow.filter((n) => !mine.includes(n))
        if (missing.length) diffs.push(`${b}宮 流年星缺 ${missing}`)
        const extra = mine.filter((n) => !flow.includes(n) && !['流曲', '年解'].includes(n))
        if (extra.length) diffs.push(`${b}宮 流年星多 ${extra}`)
        check(`${b}宮 歲前`, ref.suiqian![b], green.find((n) => SUIQIAN.includes(n)))
        check(`${b}宮 將前`, ref.jiangqian![b], green.find((n) => JIANGQIAN.includes(n)))
      }

      // 流月（斗君起）
      if (!excluded(key, 'monthlySoul')) check('流月命宮', [hs.monthly.soulBranch], soulOf(h.monthlyDou))
      check('流月四化', appMutagens(hs.monthly), siteMutagens(h.monthlyDou, '流月'))
      if (!excluded(key, 'monthlySoul')) check('三方四正（流月）', surround(hs.monthly.soulBranch), threeFour(h.monthlyDou))

      // 流日（從流月命宮起算初一）
      if (!excluded(key, 'dailySoul')) check('流日命宮', [hs.daily.soulBranch], soulOf(h.dailyDou))
      check('流日四化', appMutagens(hs.daily), siteMutagens(h.dailyDou, '流日'))
      if (!excluded(key, 'dailySoul')) check('三方四正（流日）', surround(hs.daily.soulBranch), threeFour(h.dailyDou))

      expect(diffs).toEqual([])
    })
  }

  it('案例 11 的網站已知錯誤剛好排除 3 日期 × 4 項 = 12 筆（比對前一年的流年星那 3 筆不算跳過）', () => {
    expect(skippedItems.size).toBe(12)
    expect([...skippedItems].every((k) => k.startsWith('11@'))).toBe(true)
  })
})
