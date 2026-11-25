// 結果頁自動存紀錄：AI 解讀回來（或確定用範本）就存一筆；之後追問有變再更新同一筆
import { useEffect, useRef, useState } from 'react'
import type { AiReading, AiTone, ThreadEntry } from '../ai'
import { newRecordId, saveRecord } from '../storage/records'
import type { ReadingRecord, RecordKind } from '../storage/records'

interface Options {
  kind: RecordKind
  // 這次牌陣／卦的 key；null＝還沒有結果
  key: string | null
  // false＝AI 還在解讀，先不存
  ready: boolean
  question: string
  context?: string
  title: string
  level: string
  tone: AiTone
  facts: Record<string, unknown> | null
  reading: AiReading | null
  verdict: string
  followups: ThreadEntry[]
  sources?: [string, string]
  combo?: ReadingRecord['combo']
}

// 回傳這次結果的紀錄 id（存好之後才有）。同一個 key 永遠是同一筆：每次新結果要給新的 key
export function useSaveRecord(o: Options): string | null {
  const ids = useRef(new Map<string, { id: string; at: number }>())
  const [savedKey, setSavedKey] = useState<string | null>(null)
  const followupCount = o.followups.length
  const readingVerdict = o.reading?.verdict ?? ''

  useEffect(() => {
    if (!o.key || !o.ready || !o.facts) return
    let slot = ids.current.get(o.key)
    if (!slot) {
      slot = { id: newRecordId(o.kind), at: Date.now() }
      ids.current.set(o.key, slot)
    }
    const rec: ReadingRecord = {
      id: slot.id,
      kind: o.kind,
      at: slot.at,
      question: o.question,
      ...(o.context ? { context: o.context } : {}),
      title: o.title,
      level: o.level,
      tone: o.tone,
      facts: o.facts,
      reading: o.reading,
      verdict: o.reading?.verdict ?? o.verdict,
      followups: o.followups,
      ...(o.sources ? { sources: o.sources } : {}),
      ...(o.combo ? { combo: o.combo } : {}),
    }
    let alive = true
    const key = o.key
    saveRecord(rec).then(() => { if (alive) setSavedKey(key) })
    return () => { alive = false }
    // 只在結果、解讀、追問數變了才重存；其他欄位跟著 key 走
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o.key, o.ready, readingVerdict, followupCount])

  return o.key && savedKey === o.key ? ids.current.get(o.key)?.id ?? null : null
}
