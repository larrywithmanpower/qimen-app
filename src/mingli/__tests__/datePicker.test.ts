import { describe, it, expect } from 'vitest'
import { daysInMonth, firstWeekday, formatDisplay, inRange, monthInRange, parseIso, shiftMonth, toIso, yearPageStart } from '../ui/dateMath'

describe('日期選擇器純函式', () => {
  it('閏年 2/29：2000 有、1900 沒有、2024 有', () => {
    expect(daysInMonth(2000, 2)).toBe(29)
    expect(daysInMonth(1900, 2)).toBe(28)
    expect(daysInMonth(2024, 2)).toBe(29)
    expect(daysInMonth(2023, 2)).toBe(28)
  })
  it('每月天數', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => daysInMonth(2023, m)))
      .toEqual([31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31])
  })
  it('1990-07-01 是星期日、1990-07-05 所在月 1 號之後的星期', () => {
    expect(firstWeekday(1990, 7)).toBe(0)
    expect(firstWeekday(2000, 1)).toBe(6)
  })
  it('範圍判斷含邊界', () => {
    expect(inRange('1900-01-01', '1900-01-01', '2026-10-21')).toBe(true)
    expect(inRange('2026-10-21', '1900-01-01', '2026-10-21')).toBe(true)
    expect(inRange('1899-12-31', '1900-01-01', '2026-10-21')).toBe(false)
    expect(inRange('2026-10-22', '1900-01-01', '2026-10-21')).toBe(false)
    expect(monthInRange(2026, 11, '1900-01-01', '2026-10-21')).toBe(false)
    expect(monthInRange(2026, 10, '1900-01-01', '2026-10-21')).toBe(true)
  })
  it('格式化補零與顯示', () => {
    expect(toIso(1990, 7, 5)).toBe('1990-07-05')
    expect(toIso(900, 1, 1)).toBe('0900-01-01')
    expect(formatDisplay('1990-07-05')).toBe('1990 年 7 月 5 日')
    expect(formatDisplay('')).toBe('')
  })
  it('解析與跨月跨年', () => {
    expect(parseIso('1990-02-30')).toBeNull()
    expect(parseIso('1990-7-5')).toBeNull()
    expect(parseIso('2000-02-29')).toEqual({ y: 2000, m: 2, d: 29 })
    expect(shiftMonth(1990, 1, -1)).toEqual({ y: 1989, m: 12 })
    expect(shiftMonth(1990, 12, 1)).toEqual({ y: 1991, m: 1 })
  })
  it('年份頁起點含 1990 為 1984 開頭', () => {
    expect(yearPageStart(1990, 1900)).toBe(1984)
    expect(yearPageStart(1900, 1900)).toBe(1900)
  })
})
