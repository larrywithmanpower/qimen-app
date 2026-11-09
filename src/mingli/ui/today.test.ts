import { describe, expect, it } from 'vitest'
import { moonName, todayInfo } from './today'

// 日干支用獨立算法對答案：1949-10-01 是甲子日，之後每天往下數一個
const GAN = '甲乙丙丁戊己庚辛壬癸'
const ZHI = '子丑寅卯辰巳午未申酉戌亥'
const dayGz = (y: number, m: number, d: number) => {
  const n = ((Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1949, 9, 1)) / 86400000) % 60) + 60) % 60
  return GAN[n % 10] + ZHI[n % 12]
}
// 台灣中午，避免時區邊界
const at = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d, 4))

describe('首頁今日資訊', () => {
  const dates: [number, number, number][] = [
    [2026, 11, 8], [2026, 11, 7], [2024, 2, 4], [2024, 2, 3], [2025, 12, 21],
    [2026, 3, 20], [2025, 12, 31], [2026, 1, 1], [2026, 6, 21], [2027, 2, 4],
  ]
  for (const [y, m, d] of dates) {
    it(`${y}-${m}-${d} 日干支跟獨立算法一致`, () => {
      expect(todayInfo(at(y, m, d)).day).toBe(dayGz(y, m, d))
    })
  }

  it('2026-11-08：丙午年 己亥月 丙戌日、立冬第二天', () => {
    expect(todayInfo(at(2026, 11, 8))).toMatchObject({ year: '丙午', month: '己亥', day: '丙戌', term: '立冬第二天' })
  })
  it('節氣當天直接寫節氣名：2026-11-07 立冬、2024-02-04 立春、2025-12-21 冬至', () => {
    expect(todayInfo(at(2026, 11, 7)).term).toBe('立冬')
    expect(todayInfo(at(2024, 2, 4)).term).toBe('立春')
    expect(todayInfo(at(2025, 12, 21)).term).toBe('冬至')
  })
  it('立春前一天年柱還是前一年：2024-02-03 癸卯、2024-02-04 甲辰', () => {
    expect(todayInfo(at(2024, 2, 3)).year).toBe('癸卯')
    expect(todayInfo(at(2024, 2, 4)).year).toBe('甲辰')
  })
  it('節氣名稱用繁體：2026-03-05 驚蟄、2026-06-05 芒種', () => {
    expect(todayInfo(at(2026, 3, 5)).term).toBe('驚蟄')
    expect(todayInfo(at(2026, 6, 5)).term).toBe('芒種')
  })
  it('照台灣日期：UTC 11-07 17:00 已是台灣 11-08', () => {
    expect(todayInfo(new Date(Date.UTC(2026, 10, 7, 17))).day).toBe('丙戌')
  })
  it('月相：初一新月、十五滿月、廿九殘月', () => {
    expect(moonName(1)).toBe('新月')
    expect(moonName(15)).toBe('滿月')
    expect(moonName(29)).toBe('殘月')
    expect(moonName(7)).toBe('上弦月')
  })
})
