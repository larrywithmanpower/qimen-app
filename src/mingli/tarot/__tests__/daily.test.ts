import { describe, expect, it } from 'vitest'
import cardsRaw from '../../../../functions/gemini-proxy/cards/tarot.json?raw'
import { CARDS } from '../cards'
import { dailyCard, dailyCardId, dailyFacts, dailyTone, taiwanDate } from '../daily'

// 台灣 2026-11-27 00:00 ＝ UTC 2026-11-26 16:00
const MIDNIGHT = Date.UTC(2026, 10, 26, 16, 0, 0)
const key = (d: ReturnType<typeof dailyCard>) => `${d.index}${d.reversed}`

describe('台灣日期', () => {
  it('台灣 00:00 前一毫秒還是前一天，00:00 換成新的一天', () => {
    expect(taiwanDate(MIDNIGHT - 1)).toBe('2026-11-26')
    expect(taiwanDate(MIDNIGHT)).toBe('2026-11-27')
  })
  it('跨年、跨月照台灣時間算', () => {
    expect(taiwanDate(Date.UTC(2026, 11, 31, 15, 59, 59))).toBe('2026-12-31')
    expect(taiwanDate(Date.UTC(2026, 11, 31, 16, 0, 0))).toBe('2027-01-01')
    expect(taiwanDate(Date.UTC(2027, 1, 28, 16, 0, 0))).toBe('2027-03-01')
  })
  it('同一個時刻不論裝置在哪個時區都是同一個台灣日期（只看絕對時間）', () => {
    // 紐約 11/26 早上 10 點＝UTC 15:00＝台灣 11/26 23:00；洛杉磯 11/26 08:00＝UTC 16:00＝台灣 11/27 00:00
    expect(taiwanDate(Date.parse('2026-11-26T10:00:00-05:00'))).toBe('2026-11-26')
    expect(taiwanDate(Date.parse('2026-11-26T08:00:00-08:00'))).toBe('2026-11-27')
  })
})

describe('今日一牌', () => {
  it('同一台裝置同一天打開幾次都是同一張、同一個正逆位', () => {
    const first = dailyCard('dev-a', '2026-11-27')
    for (let i = 0; i < 20; i++) expect(key(dailyCard('dev-a', '2026-11-27'))).toBe(key(first))
  })
  it('換一天會換牌（連續 60 天不會天天同一張）', () => {
    const days = Array.from({ length: 60 }, (_, i) => taiwanDate(MIDNIGHT + i * 86400000))
    const seen = new Set(days.map((d) => key(dailyCard('dev-a', d))))
    expect(seen.size).toBeGreaterThan(30)
    // 隔天跟今天不同的比例要夠高（不是固定一張）
    const changed = days.slice(1).filter((d, i) => key(dailyCard('dev-a', d)) !== key(dailyCard('dev-a', days[i]))).length
    expect(changed).toBeGreaterThan(50)
  })
  it('不同裝置同一天可以抽到不同張', () => {
    const seen = new Set(Array.from({ length: 30 }, (_, i) => key(dailyCard(`dev-${i}`, '2026-11-27'))))
    expect(seen.size).toBeGreaterThan(15)
  })
  it('78 張都抽得到，也會有逆位', () => {
    const all = Array.from({ length: 5000 }, (_, i) => dailyCard(`d${i}`, '2026-11-27'))
    expect(new Set(all.map((d) => d.index)).size).toBe(CARDS.length)
    const rev = all.filter((d) => d.reversed).length / all.length
    expect(rev).toBeGreaterThan(0.25)
    expect(rev).toBeLessThan(0.45)
  })
  it('知識卡編號對得到同一張牌與正逆位', () => {
    const db = new Map((JSON.parse(cardsRaw) as { cards: { id: string; when: { card: string; orientation: string } }[] }).cards.map((c) => [c.id, c.when]))
    for (let index = 0; index < CARDS.length; index++) {
      for (const reversed of [false, true]) {
        const d = { index, reversed, card: CARDS[index] }
        expect(db.get(dailyCardId(d))).toEqual({ card: CARDS[index].zh, orientation: reversed ? '逆位' : '正位' })
      }
    }
  })
  it('送 AI 的盤面只有一張牌、標明今日一牌；吉凶一律定平（不因正位就定吉）', () => {
    const up = { index: 17, reversed: false, card: CARDS[17] }
    const down = { ...up, reversed: true }
    expect(dailyFacts(up)).toEqual({ spread: '今日一牌', cards: [{ position: '今天', name: '星星', orientation: '正位', keyword: CARDS[17].upright }] })
    expect((dailyFacts(down).cards as { orientation: string }[])[0].orientation).toBe('逆位')
    expect(dailyTone(up)).toBe('平')
    expect(dailyTone({ index: 16, reversed: false, card: CARDS[16] })).toBe('平')
    expect(dailyTone(down)).toBe('平')
  })
})
