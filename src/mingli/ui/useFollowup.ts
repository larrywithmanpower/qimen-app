// 塔羅、梅花追問：對話只放記憶體（換牌、換卦就清掉），沒有換時間重排
import { useCallback, useEffect, useRef, useState } from 'react'
import { buildHistory, fetchFollowup } from '../ai'
import type { AiKind, AiReading, AiRefusal, AiTone, FollowupResult, ThreadEntry } from '../ai'
import type { FollowupStatus } from '../ziwei/ui/useZiweiFollowup'

interface Options {
  kind: Exclude<AiKind, 'ziwei'>
  // 這次牌陣／卦的 key；null＝還沒有解讀
  key: string | null
  facts: Record<string, unknown> | null
  tone: AiTone
  question: string
  context?: string
  // AI 解讀成功的那份；有了才可以追問
  reading: AiReading | null
}

interface View {
  key: string | null
  entries: ThreadEntry[]
  status: FollowupStatus
  refusal: AiRefusal['refusal'] | null
}

const EMPTY = (key: string | null): View => ({ key, entries: [], status: 'idle', refusal: null })

export function useFollowup(opts: Options) {
  const { key, reading, question } = opts
  const [view, setView] = useState<View>(EMPTY(null))
  const optsRef = useRef(opts)
  // 最新的追問紀錄，async 流程裡用 ref 讀，不吃舊 closure
  const viewRef = useRef(view)
  const ctrlRef = useRef<AbortController | null>(null)
  useEffect(() => {
    optsRef.current = opts
    viewRef.current = view
  })
  useEffect(() => {
    return () => {
      ctrlRef.current?.abort()
    }
  }, [])
  // 換牌：中斷還在等的追問
  useEffect(() => {
    ctrlRef.current?.abort()
  }, [key])

  // 對話串第一筆是解讀（給後端當上下文，畫面上解讀另外顯示）；layer、date 只有紫微用得到
  const readingEntry: ThreadEntry | null = reading ? { type: 'reading', q: question, layer: 'natal', date: '', reading } : null
  const cur = view.key === key ? view : EMPTY(key)
  const entries = readingEntry ? [readingEntry, ...cur.entries] : []

  const patch = useCallback((k: string | null, p: Partial<View>) => {
    setView((v) => ({ ...(v.key === k ? v : EMPTY(k)), ...p }))
  }, [])

  // 送出追問；成功（含拒答）回 true，失敗或被婉拒回 false
  const send = useCallback(async (q: string): Promise<boolean> => {
    const o = optsRef.current
    if (!o.key || !o.reading || !o.facts) return false
    const k = o.key
    ctrlRef.current?.abort()
    const ctrl = new AbortController()
    ctrlRef.current = ctrl
    patch(k, { status: 'loading', refusal: null })
    const prior = viewRef.current.key === k ? viewRef.current.entries : []
    const history = buildHistory([{ type: 'reading', q: o.question, layer: 'natal', date: '', reading: o.reading }, ...prior])
    const res = await fetchFollowup({ kind: o.kind, question: q, facts: o.facts, tone: o.tone, history, context: o.context }, { signal: ctrl.signal })
    if (ctrl.signal.aborted || optsRef.current.key !== k) return false
    if (!res) {
      patch(k, { status: 'fail' })
      return false
    }
    if ('limited' in res) {
      patch(k, { status: 'limited' })
      return false
    }
    if ('refusal' in res) {
      patch(k, { refusal: res.refusal, status: 'idle' })
      return false
    }
    const result: FollowupResult = res
    setView((v) => {
      const base = v.key === k ? v : EMPTY(k)
      return { ...base, status: 'idle', entries: [...base.entries, { type: 'followup', q, layer: 'natal', date: '', result }] }
    })
    return true
  }, [patch])

  // 清除追問（解讀本身留著）
  const clear = useCallback(() => {
    ctrlRef.current?.abort()
    patch(optsRef.current.key, { entries: [], refusal: null, status: 'idle' })
  }, [patch])

  return { entries, status: cur.status, refusal: cur.refusal, send, clear }
}
