import { describe, it, expect } from 'vitest'
import { jaccard, mean, overlapRate, taiwanDate } from './ai-eval-lib.mjs'

describe('jaccard', () => {
  it('完全相同＝1、完全不同＝0', () => {
    expect(jaccard(['a', 'b'], ['b', 'a'])).toBe(1)
    expect(jaccard(['a'], ['b'])).toBe(0)
  })
  it('部分重疊＝交集/聯集', () => {
    expect(jaccard(['a', 'b', 'c'], ['b', 'c', 'd'])).toBeCloseTo(2 / 4, 10)
    expect(jaccard(new Set(['a']), new Set(['a', 'b']))).toBe(0.5)
  })
  it('重複元素不重複算；兩邊都空＝1；一邊空＝0', () => {
    expect(jaccard(['a', 'a', 'b'], ['a', 'b'])).toBe(1)
    expect(jaccard([], [])).toBe(1)
    expect(jaccard([], ['a'])).toBe(0)
  })
})

describe('overlapRate：三次的兩兩平均', () => {
  it('三次相同＝1', () => {
    expect(overlapRate([['a', 'b'], ['a', 'b'], ['a', 'b']])).toBe(1)
  })
  it('手算：{a,b}、{a,b}、{a,c} → (1 + 1/3 + 1/3) / 3', () => {
    expect(overlapRate([['a', 'b'], ['a', 'b'], ['a', 'c']])).toBeCloseTo((1 + 1 / 3 + 1 / 3) / 3, 10)
  })
  it('三次完全不同＝0', () => {
    expect(overlapRate([['a'], ['b'], ['c']])).toBe(0)
  })
  it('有一次失敗（null）：和它配對的算 0，不讓分數變好', () => {
    expect(overlapRate([['a'], ['a'], null])).toBeCloseTo(1 / 3, 10)
    expect(overlapRate([null, null, null])).toBe(0)
  })
  it('少於兩次＝0', () => {
    expect(overlapRate([['a']])).toBe(0)
    expect(overlapRate([])).toBe(0)
  })
})

describe('其他', () => {
  it('mean', () => {
    expect(mean([1, 2, 3])).toBe(2)
    expect(mean([])).toBe(0)
  })
  it('台灣日期以 UTC+8 換算', () => {
    expect(taiwanDate(Date.UTC(2026, 9, 26, 16, 0, 0))).toBe('2026-10-27')
    expect(taiwanDate(Date.UTC(2026, 9, 26, 15, 59, 59))).toBe('2026-10-26')
  })
})
