import { describe, it, expect } from 'vitest'
import { PRICES, aggregate, costUsd, itemKey, renderReport } from './ai-cost-lib.mjs'

const rec = (over = {}) => ({
  date: '2026-10-22', kind: 'tarot', focus: null, model: 'claude-sonnet-5-5', attempts: 1, status: 'ok',
  input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, ...over,
})

describe('單價表', () => {
  it('claude-sonnet-5-5：輸入 2、輸出 10、快取寫入 2.5、快取讀取 0.10（美金/百萬 token）', () => {
    expect(PRICES['claude-sonnet-5-5']).toEqual({ input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.1 })
  })
})

describe('成本計算：等於手算值（到小數第 6 位）', () => {
  it('只有輸入 1,000,000 token = 2 美金；只有輸出 1,000,000 = 10 美金', () => {
    expect(costUsd(rec({ input_tokens: 1_000_000 }))).toBeCloseTo(2, 6)
    expect(costUsd(rec({ output_tokens: 1_000_000 }))).toBeCloseTo(10, 6)
    expect(costUsd(rec({ cache_creation_input_tokens: 1_000_000 }))).toBeCloseTo(2.5, 6)
    expect(costUsd(rec({ cache_read_input_tokens: 1_000_000 }))).toBeCloseTo(0.1, 6)
  })
  it('混合：1234 輸入 + 567 輸出 + 89 快取寫 + 1011 快取讀', () => {
    // 手算：1234×2=2468；567×10=5670；89×2.5=222.5；1011×0.1=101.1；合計 8461.6 ÷ 1e6
    expect(costUsd(rec({ input_tokens: 1234, output_tokens: 567, cache_creation_input_tokens: 89, cache_read_input_tokens: 1011 }))).toBeCloseTo(0.0084616, 6)
  })
  it('輸出不能用輸入價算：500 輸出 = 0.005，不是 0.001', () => {
    expect(costUsd(rec({ output_tokens: 500 }))).toBeCloseTo(0.005, 6)
  })
  it('沒有的欄位算 0', () => {
    expect(costUsd({ model: 'claude-sonnet-5-5', input_tokens: 1000 })).toBeCloseTo(0.002, 6)
  })
  it('帶日期版本後綴的 model 照同一組單價算', () => {
    expect(costUsd({ model: 'claude-sonnet-5-5-20260915', input_tokens: 1000 })).toBeCloseTo(0.002, 6)
    expect(() => costUsd({ model: 'claude-sonnet-5-55', input_tokens: 1 })).toThrow()
  })
  it('不在表內的 model 要報錯，不能當 0', () => {
    expect(() => costUsd(rec({ model: 'claude-unknown-9', input_tokens: 1 }))).toThrow(/claude-unknown-9/)
    expect(() => costUsd(rec({ model: undefined }))).toThrow()
  })
})

describe('彙整', () => {
  const rows = [
    rec({ kind: 'tarot', input_tokens: 1000, output_tokens: 200 }),
    rec({ kind: 'tarot', attempts: 2, status: 'bad_format', input_tokens: 2000, output_tokens: 400 }),
    rec({ kind: 'ziwei', focus: 'yearly', input_tokens: 3000, output_tokens: 500 }),
    rec({ kind: 'ziwei', focus: null, input_tokens: 100 }),
    rec({ date: '2026-10-23', kind: 'meihua', input_tokens: 10 }),
  ]
  it('項目分類：紫微沒 focus 算一生', () => {
    expect(rows.map(itemKey)).toEqual(['tarot', 'tarot', 'ziwei:yearly', 'ziwei:natal', 'meihua'])
  })
  it('塔羅：請求 2、成功 1、呼叫 3、成本與單次最高', () => {
    const t = aggregate(rows).byItem.get('tarot')
    expect(t.requests).toBe(2)
    expect(t.ok).toBe(1)
    expect(t.calls).toBe(3)
    expect(t.input).toBe(3000)
    expect(t.usd).toBeCloseTo(0.012, 6) // (1000×2+200×10)/1e6 + (2000×2+400×10)/1e6 = 0.004 + 0.008
    expect(t.maxUsd).toBeCloseTo(0.008, 6)
  })
  it('總計等於各項加總', () => {
    const { byItem, total } = aggregate(rows)
    const sum = [...byItem.values()].reduce((a, s) => a + s.usd, 0)
    expect(total.usd).toBeCloseTo(sum, 9)
    expect(total.requests).toBe(5)
  })
  it('報表：有項目名稱、台幣換算、每日明細', () => {
    const text = renderReport({ rows, from: '2026-10-01', to: '2026-10-31', rate: 32.5 })
    for (const w of ['塔羅', '梅花', '紫微・今年', '紫微・一生', '總計', '每日明細', '2026-10-23', '32.5']) expect(text).toContain(w)
    expect(text).not.toContain('紫微・今天')
    // 塔羅總成本 0.012 美金 = NT$0.39
    expect(text).toContain('$0.0120')
    expect(text).toContain('NT$0.39')
  })
})
