// 紫微追問：對話串（存本機）、送出追問、收到 recompute 時切層後自動重送一次
import { useCallback, useEffect, useRef, useState } from 'react'
import { buildHistory, fetchFollowup } from '../../ai'
import type { AiFocus, AiRefusal, FollowupResult, ThreadEntry } from '../../ai'
import { capThread, clearThread, loadThread, saveThread } from '../../storage/followup'

export type FollowupStatus = 'idle' | 'loading' | 'fail'

interface Options {
  // null＝還沒有盤，沒有對話串
  threadKey: string | null
  // 依層與日期組出那一刻的盤面事實；組不出來（日期超出範圍等）回 null
  factsFor: (layer: AiFocus, date: string) => Record<string, unknown> | null
  layer: AiFocus
  date: string
  // 頁面切到指定層與日期（用頁面既有的切換）
  goTo: (layer: Exclude<AiFocus, 'natal'>, date: string) => void
}

interface View {
  key: string | null
  entries: ThreadEntry[]
  status: FollowupStatus
  // 本機紀錄讀完了沒（測試用來等，畫面不靠它）
  loaded?: boolean
  refusal: AiRefusal['refusal'] | null
}

export function useZiweiFollowup(opts: Options) {
  const { threadKey } = opts
  // 狀態跟著盤的 key 走：換盤時舊盤的內容自然不顯示
  const [view, setView] = useState<View>({ key: null, entries: [], status: 'idle', refusal: null })
  const cur = view.key === threadKey ? view : { key: threadKey, entries: [], status: 'idle' as FollowupStatus, refusal: null }
  const patch = useCallback((key: string | null, p: Partial<View>) => {
    setView((v) => ({ ...(v.key === key ? v : { key, entries: [], status: 'idle', refusal: null }), ...p }))
  }, [])
  // 最新的對話串與選項，async 流程裡用 ref 讀，不吃舊 closure
  const entriesRef = useRef<ThreadEntry[]>([])
  const optsRef = useRef(opts)
  const keyRef = useRef(threadKey)
  const ctrlRef = useRef<AbortController | null>(null)
  // 每次渲染後同步最新值（放在其他 effect 之前）
  useEffect(() => {
    optsRef.current = opts
    keyRef.current = threadKey
  })

  // 換盤：讀那張盤的紀錄；讀的期間新加的筆數接在後面
  useEffect(() => {
    entriesRef.current = []
    ctrlRef.current?.abort()
    if (!threadKey) return
    let alive = true
    loadThread(threadKey).then((loaded) => {
      if (!alive) return
      const next = capThread([...loaded, ...entriesRef.current])
      entriesRef.current = next
      patch(threadKey, { entries: next, loaded: true })
    })
    return () => {
      alive = false
    }
  }, [threadKey, patch])

  useEffect(() => {
    return () => {
      ctrlRef.current?.abort()
    }
  }, [])

  const add = useCallback((key: string, e: ThreadEntry) => {
    if (keyRef.current !== key) return
    const next = capThread([...entriesRef.current, e])
    entriesRef.current = next
    patch(key, { entries: next })
    void saveThread(key, next)
  }, [patch])

  // 解讀成功後加進串尾
  const addReading = useCallback((e: Extract<ThreadEntry, { type: 'reading' }>) => {
    if (keyRef.current) add(keyRef.current, e)
  }, [add])

  const clear = useCallback(() => {
    ctrlRef.current?.abort()
    entriesRef.current = []
    patch(keyRef.current, { entries: [], refusal: null, status: 'idle' })
    if (keyRef.current) void clearThread(keyRef.current)
  }, [patch])

  // 送出追問；成功（含 recompute、拒答）回 true，失敗或被婉拒回 false
  const send = useCallback(async (question: string): Promise<boolean> => {
    const key = keyRef.current
    if (!key || entriesRef.current.length === 0) return false
    ctrlRef.current?.abort()
    const ctrl = new AbortController()
    ctrlRef.current = ctrl
    patch(key, { status: 'loading', refusal: null })
    let { layer, date } = optsRef.current
    // 同一個問題最多自動重送一次
    for (let attempt = 0; attempt < 2; attempt++) {
      const facts = optsRef.current.factsFor(layer, date)
      const res = facts
        ? await fetchFollowup({ question, facts, focus: layer, history: buildHistory(entriesRef.current) }, { signal: ctrl.signal })
        : null
      if (ctrl.signal.aborted || keyRef.current !== key) return false
      if (!res) {
        patch(key, { status: 'fail' })
        return false
      }
      if ('refusal' in res) {
        patch(key, { refusal: res.refusal, status: 'idle' })
        return false
      }
      const result: FollowupResult = res
      add(key, { type: 'followup', q: question, layer, date, result })
      if (result.action !== 'recompute' || attempt === 1) break
      layer = result.target.focus
      date = result.target.date
      optsRef.current.goTo(layer, date)
    }
    patch(key, { status: 'idle' })
    return true
  }, [add, patch])

  return { entries: cur.entries, status: cur.status, refusal: cur.refusal, loaded: cur.loaded === true, addReading, send, clear }
}
