// 紀錄相關的顯示文字與網址（紀錄頁、合併選單、合併解讀頁共用）
import { clipContext } from '../ai'
import { normQuestion } from '../storage/records'
import type { ReadingRecord } from '../storage/records'

export const KIND_NAME = { meihua: '梅花', tarot: '塔羅', combo: '合併' } as const

// 11/25 14:30
export const shortTime = (ms: number) => {
  const d = new Date(ms)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export const comboPath = (a: ReadingRecord, b: ReadingRecord) => {
  const [m, t] = a.kind === 'meihua' ? [a, b] : [b, a]
  return `/combo?m=${encodeURIComponent(m.id)}&t=${encodeURIComponent(t.id)}`
}

// 兩邊題目不一樣時，把塔羅那次問的也告訴 AI（當近況，不當盤面依據）
export function comboContext(m: ReadingRecord, t: ReadingRecord): string | undefined {
  const parts = [m.context, normQuestion(m.question) === normQuestion(t.question) ? '' : `塔羅那次問的是「${t.question}」`]
  return clipContext(parts.filter(Boolean).join('；'))
}
