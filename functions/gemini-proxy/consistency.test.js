// 6-2 盤面核對接進後端：解讀與追問寫錯位置視同格式不過（handler 會重叫一次）
// 句型與 60 份真 AI 解讀的驗收在 src/mingli/__tests__/chartCheck.test.ts
import { describe, expect, it } from 'vitest'
import { checkFollowup, checkReading } from './validate.js'

describe('後端盤面核對', () => {
  const cards = [{ id: 'T00正', title: '愚者正位', source: 's' }]
  const facts = { spread: '三張牌陣', cards: [{ position: '過去', name: '愚者', orientation: '正位' }, { position: '現在', name: '魔術師', orientation: '正位' }, { position: '接下來', name: '女祭司', orientation: '正位' }] }
  const out = (text) => ({ verdict: '可以', tone: '吉', paragraphs: [{ title: '答案', text, basis: ['依據'], cards: ['T00正'] }], prediction: { claim: '一個月內有消息', dueDate: '2026-12-20' } })
  it('對的照過、錯的回 chart', () => {
    expect(checkReading(out('過去「愚者」正位，現在「魔術師」正位'), '吉', cards, 'tarot', facts).problem).toBeNull()
    expect(checkReading(out('現在「愚者」正位'), '吉', cards, 'tarot', facts).problem).toBe('chart')
  })
  it('沒帶盤面（舊呼叫）不做核對', () => {
    expect(checkReading(out('現在「愚者」正位'), '吉', cards, 'tarot').problem).toBeNull()
  })
})

describe('追問也核對', () => {
  const cards = [{ id: 'T00正', title: '愚者正位', source: 's' }]
  const facts = { spread: '三張牌陣', cards: [{ position: '過去', name: '愚者' }, { position: '現在', name: '魔術師' }] }
  const f = (text) => ({ action: 'answer', text, basis: ['依據'], cards: ['T00正'] })
  it('對的過、錯的回 chart', () => {
    expect(checkFollowup(f('過去「愚者」'), cards, 'tarot', facts).problem).toBeNull()
    expect(checkFollowup(f('現在「愚者」'), cards, 'tarot', facts).problem).toBe('chart')
  })
})
