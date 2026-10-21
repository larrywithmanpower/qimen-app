import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  ZIWEI_CONFIG, ZIWEI_FIX_LEAP, MAJOR_STAR_NAMES, timeIndexOf, buildChart, candidates, starPositions, sortMinorStars,
  type Gender,
} from '../engine'

describe('ZIWEI_FIX_LEAP', () => {
  it('閏月照本月排（fixLeap 關閉）被鎖住', () => {
    expect(ZIWEI_FIX_LEAP).toBe(false)
  })
})

describe('ZIWEI_CONFIG', () => {
  it('五項設定全部鎖在預設值', () => {
    expect(ZIWEI_CONFIG.yearDivide).toBe('normal')
    expect(ZIWEI_CONFIG.horoscopeDivide).toBe('normal')
    expect(ZIWEI_CONFIG.ageDivide).toBe('normal')
    expect(ZIWEI_CONFIG.dayDivide).toBe('forward')
    expect(ZIWEI_CONFIG.algorithm).toBe('default')
    expect(Object.keys(ZIWEI_CONFIG)).toHaveLength(5)
  })

  it('晚子時算隔天：23 點盤等於隔天早子時盤（dayDivide forward 的實際效果）', () => {
    const late = starPositions(buildChart({ solarDate: '1990-05-15', timeIndex: 12, gender: '男' }))
    const nextDay = starPositions(buildChart({ solarDate: '1990-05-16', timeIndex: 0, gender: '男' }))
    expect(late).toEqual(nextDay)
  })
})

describe('timeIndexOf', () => {
  const expected = [
    0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12,
  ]
  it('24 個整點全對', () => {
    for (let h = 0; h < 24; h++) expect(timeIndexOf(h), `${h} 點`).toBe(expected[h])
  })
})

describe('排盤', () => {
  it('candidates 回 13 張，每張十四主星都有落宮', () => {
    const list = candidates('1990-05-15', '男')
    expect(list).toHaveLength(13)
    for (const facts of list) {
      const pos = starPositions(facts)
      for (const name of MAJOR_STAR_NAMES) expect(pos.stars[name], name).toBeTruthy()
    }
  })

  it('十四主星在任一盤都剛好 14 顆、各落一宮', () => {
    const genders: Gender[] = ['男', '女']
    for (const gender of genders) {
      for (const date of ['1984-02-04', '1990-05-15', '2000-12-31', '2024-02-29']) {
        for (const facts of candidates(date, gender)) {
          const names = facts.palaces.flatMap((p) => p.majorStars.map((s) => s.name))
          expect(names).toHaveLength(14)
          expect(new Set(names)).toEqual(new Set(MAJOR_STAR_NAMES))
        }
      }
    }
  })

  it('整理後的盤有十二宮、一個命宮、一個身宮', () => {
    const facts = buildChart({ solarDate: '1990-05-15', timeIndex: 3, gender: '男' })
    expect(facts.palaces).toHaveLength(12)
    expect(facts.palaces.filter((p) => p.isSoul)).toHaveLength(1)
    expect(facts.palaces.filter((p) => p.isBody)).toHaveLength(1)
    expect(facts.palaces.find((p) => p.isSoul)?.branch).toBe(facts.soulBranch)
    expect(facts.palaces.find((p) => p.isBody)?.branch).toBe(facts.bodyBranch)
  })
})

// 對答案：答案檔由人工從外部排盤網站整理，不可用 iztro 自己產生
interface Fixture {
  id: string
  solarDate: string
  time: string
  gender: Gender
  note: string
  source: { site: string; url: string; checkedAt: string }
  answer: { soul: string; body: string; stars: Record<string, string> }
}

const fixturePath = join(dirname(fileURLToPath(import.meta.url)), 'ziwei.fixtures.json')

// 答案來源：Windada 紫微斗數（非 iztro），出處見 ziwei.fixtures.source.json 與每案 source
describe('30 盤對答案', () => {
  const fixtures: Fixture[] = existsSync(fixturePath) ? JSON.parse(readFileSync(fixturePath, 'utf8')) : []

  it('答案檔剛好 30 盤、每盤都有出處', () => {
    expect(fixtures.length).toBe(30)
    for (const fx of fixtures) expect(fx.source?.site).toBeTruthy()
  })

  for (const fx of fixtures) {
    it(`${fx.id} ${fx.solarDate} ${fx.time} ${fx.gender}`, () => {
      const hour = Number(fx.time.split(':')[0])
      const pos = starPositions(buildChart({ solarDate: fx.solarDate, timeIndex: timeIndexOf(hour), gender: fx.gender }))
      expect(pos.soul).toBe(fx.answer.soul)
      expect(pos.body).toBe(fx.answer.body)
      expect(pos.stars).toEqual(fx.answer.stars)
    })
  }
})

// 晚子時算隔天：農曆日期與四化（看年干）都要跟隔天早子時一致
const starKey = (s: { name: string; mutagen?: string }) => (s.mutagen ? `${s.name}化${s.mutagen}` : s.name)

describe('晚子時與隔天', () => {
  const pairs: Array<[string, string]> = [
    ['1990-05-15', '1990-05-16'],
    ['2023-12-31', '2024-01-01'], // 跨年
    ['2024-02-28', '2024-02-29'], // 閏日
    ['2023-01-31', '2023-02-01'], // 跨月
    ['2019-03-06', '2019-03-07'], // 農曆月底（隔天初一）
    ['2020-06-20', '2020-06-21'],
    ['2022-12-22', '2022-12-23'],
    ['2023-10-14', '2023-10-15'],
  ]
  for (const [d, next] of pairs) {
    it(`${d} 23 點的農曆、干支、全盤等於 ${next} 0 點`, () => {
      const late = buildChart({ solarDate: d, timeIndex: 12, gender: '女' })
      const early = buildChart({ solarDate: next, timeIndex: 0, gender: '女' })
      expect(late).toEqual(early)
    })
  }

  it('除夕 23 點（2023-01-21）整盤等於大年初一 0 點，四化看癸干', () => {
    const late = buildChart({ solarDate: '2023-01-21', timeIndex: 12, gender: '男' })
    const early = buildChart({ solarDate: '2023-01-22', timeIndex: 0, gender: '男' })
    expect(early.lunar).toEqual({ month: 1, day: 1, leap: false })
    expect(late).toEqual(early)
    const mut = late.palaces.flatMap((p) => [...p.majorStars, ...p.minorStars]).filter((s) => s.mutagen).map(starKey).sort()
    expect(mut).toEqual(['破軍化祿', '巨門化權', '太陰化科', '貪狼化忌'].sort())
  })

  it('2023 年每 7 天抽一天，23 點的盤都等於隔天 0 點的盤（月底案例另列於上）', () => {
    for (let t = Date.UTC(2023, 0, 1); t < Date.UTC(2024, 0, 1); t += 7 * 86400000) {
      const d = new Date(t).toISOString().slice(0, 10)
      const n = new Date(t + 86400000).toISOString().slice(0, 10)
      expect(buildChart({ solarDate: d, timeIndex: 12, gender: '女' }), d).toEqual(buildChart({ solarDate: n, timeIndex: 0, gender: '女' }))
    }
  })
})

describe('輔星排序', () => {
  it('帶化的排最前面，其餘維持原順序', () => {
    const out = sortMinorStars([{ name: '左輔' }, { name: '文昌', mutagen: '忌' }, { name: '右弼' }, { name: '文曲', mutagen: '科' }])
    expect(out.map((s) => s.name)).toEqual(['文昌', '文曲', '左輔', '右弼'])
  })
})

// 完整對答案：宮干、宮名、四化（含輔星）、輔星、大限、五行局、命身主、農曆
interface FullPalace {
  stem: string
  name: string
  isBody: boolean
  decadalStart: number
  stars: Array<{ name: string; mutagen?: string }>
}
interface FullChart {
  id: number
  lunar: { leap: boolean; month: number; day: number }
  fiveElements: string
  soulMaster: string
  bodyMaster: string
  palaces: Record<string, FullPalace>
}
const fullPath = join(dirname(fileURLToPath(import.meta.url)), 'ziwei.fixtures.full.json')

describe('30 盤完整對答案（宮干、四化、輔星…）', () => {
  const full: { charts: FullChart[] } = JSON.parse(readFileSync(fullPath, 'utf8'))
  const base: Fixture[] = JSON.parse(readFileSync(fixturePath, 'utf8'))

  it('完整答案檔剛好 30 盤', () => {
    expect(full.charts).toHaveLength(30)
  })

  for (const ans of full.charts) {
    const fx = base.find((b) => Number(b.id) === ans.id)
    it(`${ans.id} ${fx?.solarDate} ${fx?.time} ${fx?.gender}`, () => {
      expect(fx).toBeTruthy()
      const hour = Number(fx!.time.split(':')[0])
      const facts = buildChart({ solarDate: fx!.solarDate, timeIndex: timeIndexOf(hour), gender: fx!.gender })

      expect(ans.fiveElements.endsWith(facts.fiveElementsClass), '五行局').toBe(true)
      expect(facts.soul, '命主').toBe(ans.soulMaster)
      expect(facts.body, '身主').toBe(ans.bodyMaster)
      expect(facts.lunar, '農曆月日閏').toEqual(ans.lunar)

      for (const [branch, exp] of Object.entries(ans.palaces)) {
        const p = facts.palaces.find((x) => x.branch === branch)!
        expect(p, `${branch} 宮存在`).toBeTruthy()
        expect(p.stem, `${branch} 宮干`).toBe(exp.stem)
        expect(p.name, `${branch} 宮名`).toBe(exp.name)
        expect(p.isBody, `${branch} 身宮`).toBe(exp.isBody)
        expect(p.decadalStart, `${branch} 大限起始`).toBe(exp.decadalStart)

        let got = [...p.majorStars, ...p.minorStars].map(starKey)
        let want = exp.stars.map(starKey)
        if (ans.id === 6) {
          // 已知派別差異：辛年天魁鉞，網站天魁在寅、天鉞在午，iztro 預設天魁午、天鉞寅，App 維持 iztro
          got = got.filter((n) => n !== '天魁' && n !== '天鉞')
          want = want.filter((n) => n !== '天魁' && n !== '天鉞')
        }
        expect([...got].sort(), `${branch} 宮星曜`).toEqual([...want].sort())
      }

      if (ans.id === 6) {
        // 鎖住現狀：iztro 給的是魁午鉞寅（網站為魁寅鉞午）
        const at = (n: string) => facts.palaces.find((x) => x.minorStars.some((s) => s.name === n))?.branch
        expect(at('天魁')).toBe('午')
        expect(at('天鉞')).toBe('寅')
      }
    })
  }
})
