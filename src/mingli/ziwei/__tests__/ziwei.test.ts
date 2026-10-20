import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  ZIWEI_CONFIG, ZIWEI_FIX_LEAP, MAJOR_STAR_NAMES, timeIndexOf, buildChart, candidates, starPositions,
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
