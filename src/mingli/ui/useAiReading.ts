// AI 解讀的狀態：idle＝沒開 AI（直接顯示範本）、loading＝解讀中、ok＝AI 成功、refused＝後端婉拒（顯示婉拒訊息，不退範本）、fail＝退回範本
import { useEffect, useRef, useState } from 'react'
import { fetchAiReading, isAiRefusal, proxyUrl } from '../ai'
import type { AiReading, AiRefusal, AiRequest } from '../ai'

export type AiState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; reading: AiReading }
  | { status: 'refused'; refusal: AiRefusal['refusal'] }
  | { status: 'fail' }

// req 為 null 代表還不需要解讀；key 相同就不重送（換盤才換 key）。成功過的 key 會記著，切回來不重送
export function useAiReading(req: AiRequest | null, key: string): AiState {
  const url = proxyUrl()
  const [results, setResults] = useState<Record<string, AiReading | AiRefusal | null>>({})
  const okKeys = useRef(new Set<string>())
  const active = req !== null && url !== ''

  useEffect(() => {
    if (!req || !url || okKeys.current.has(key)) return
    const ctrl = new AbortController()
    fetchAiReading(req, { url, signal: ctrl.signal }).then((reading) => {
      if (ctrl.signal.aborted) return
      // 婉拒也是定案的回覆，同一題不重送
      if (reading) okKeys.current.add(key)
      setResults((cur) => ({ ...cur, [key]: reading }))
    })
    return () => {
      ctrl.abort()
    }
    // req 每次渲染都是新物件，只看 key 與網址
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, url, active])

  if (!active) return { status: 'idle' }
  if (!(key in results)) return { status: 'loading' }
  const reading = results[key]
  if (!reading) return { status: 'fail' }
  return isAiRefusal(reading) ? { status: 'refused', refusal: reading.refusal } : { status: 'ok', reading }
}
