// AI 解讀的狀態：idle＝沒開 AI（直接顯示範本）、loading＝解讀中、ok＝AI 成功、refused＝後端婉拒（顯示婉拒訊息，不退範本）、
// fail＝退回範本（limited 有值代表是額度用完，畫面要多顯示提示）
import { useEffect, useRef, useState } from 'react'
import { fetchAiReading, isAiLimited, isAiRefusal, proxyUrl } from '../ai'
import type { AiLimit, AiLimited, AiReading, AiRefusal, AiRequest } from '../ai'
import { useAuth } from '../auth'

export type AiState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; reading: AiReading }
  | { status: 'refused'; refusal: AiRefusal['refusal'] }
  | { status: 'fail'; limited?: AiLimit }

// req 為 null 代表還不需要解讀；key 相同就不重送（換盤才換 key）。成功過的 key 會記著，切回來不重送。
// 登入身分併進 key：登入／登出後同一題會重送；額度用完的結果不記成定案
export function useAiReading(req: AiRequest | null, key: string): AiState {
  const url = proxyUrl()
  const auth = useAuth()
  const authLoading = auth.status === 'loading'
  const fullKey = `${key}@${auth.uid ?? ''}`
  const [results, setResults] = useState<Record<string, AiReading | AiRefusal | AiLimited | null>>({})
  const okKeys = useRef(new Set<string>())
  const active = req !== null && url !== ''

  useEffect(() => {
    // 還在還原登入狀態時先不送，免得送出匿名請求又馬上換身分重送
    if (!req || !url || authLoading || okKeys.current.has(fullKey)) return
    const ctrl = new AbortController()
    fetchAiReading(req, { url, signal: ctrl.signal }).then((reading) => {
      if (ctrl.signal.aborted) return
      // 婉拒也是定案的回覆，同一題不重送；額度用完不是
      if (reading && !isAiLimited(reading)) okKeys.current.add(fullKey)
      setResults((cur) => ({ ...cur, [fullKey]: reading }))
    })
    return () => {
      ctrl.abort()
    }
    // req 每次渲染都是新物件，只看 key 與網址
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullKey, url, active, authLoading])

  if (!active) return { status: 'idle' }
  if (authLoading || !(fullKey in results)) return { status: 'loading' }
  const reading = results[fullKey]
  if (!reading) return { status: 'fail' }
  if (isAiLimited(reading)) return { status: 'fail', limited: reading.limited }
  return isAiRefusal(reading) ? { status: 'refused', refusal: reading.refusal } : { status: 'ok', reading }
}
