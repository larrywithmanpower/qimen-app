import { useState } from 'react'
import type { FormEvent } from 'react'
import './followup.css'
import { AI_LIMIT_TEXT, AI_NOTICE_TEXT, MAX_QUESTION } from '../../ai'
import type { AiRefusal, FollowupResult, ThreadEntry } from '../../ai'
import { AiHelpLine, AiLoading, AiReadingView, AiRefusalView } from '../../ui/AiReadingView'
import type { FollowupStatus } from './useZiweiFollowup'

function FollowupAnswer({ result }: { result: FollowupResult }) {
  return (
    <>
      {result.action === 'answer' || result.action === 'cards' ? (
        <>
          {result.notice && result.notice.length > 0 && (
            <div className="ml-ai-notice" data-testid="ml-ai-notice" role="note">
              {result.notice.map((n) => <p key={n}>{AI_NOTICE_TEXT[n]}</p>)}
            </div>
          )}
          <p className="ml-ai-text">{result.text}</p>
          {result.basis.length > 0 && <span className="ml-ai-basis" data-testid="ml-followup-basis">依據：{result.basis.join('；')}</span>}
          {result.cards.length > 0 && (
            <span className="ml-ai-cards" data-testid="ml-followup-cards">知識卡：{result.cards.map((c) => `${c.id} ${c.title}`).join('；')}</span>
          )}
        </>
      ) : (
        <p className="ml-ai-text">{result.text}</p>
      )}
    </>
  )
}

// 解讀完繼續追問：整串對話（解讀＋每則追問）＋輸入框
// hideReadings：塔羅、梅花的解讀已經顯示在頁面上，串裡只列追問
export default function FollowupPanel({ entries, status, refusal, canAsk, onSend, onClear, placeholder = '接著問，例如：那明年呢？感情那段再講細一點', hideReadings = false }: {
  entries: ThreadEntry[]
  status: FollowupStatus
  refusal: AiRefusal['refusal'] | null
  canAsk: boolean
  onSend: (q: string) => Promise<boolean>
  onClear: () => void
  placeholder?: string
  hideReadings?: boolean
}) {
  const [text, setText] = useState('')
  const hasReading = entries.some((e) => e.type === 'reading')
  const loading = status === 'loading'
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const q = text.trim()
    if (!q || loading) return
    if (await onSend(q)) setText('')
  }
  return (
    <div className="ml-followup">
      <div className="ml-followup-thread" data-testid="ml-followup-thread">
        {entries.map((e, k) =>
          e.type === 'reading' ? (hideReadings ? null : (
            <div className="ml-followup-reading" key={k}>
              <p className="ml-followup-q" data-testid="ml-followup-reading-q">問：{e.q || '整體運勢'}</p>
              <AiReadingView reading={e.reading} />
            </div>
          )) : (
            <div className="ml-followup-item" data-testid="ml-followup-item" data-action={e.result.action} key={k}>
              <p className="ml-followup-q">問：{e.q}</p>
              <FollowupAnswer result={e.result} />
            </div>
          ),
        )}
      </div>
      {loading && <AiLoading />}
      {refusal && <AiRefusalView refusal={refusal} />}
      {(status === 'fail' || status === 'limited') && (
        <>
          <p className="ml-z-hint" data-testid="ml-followup-error" role="status">{status === 'limited' ? AI_LIMIT_TEXT : 'AI 暫時無法回答，稍後再試'}</p>
          <AiHelpLine />
        </>
      )}
      {hasReading && canAsk && (
        <form className="ml-followup-form" onSubmit={submit}>
          <input
            className="ml-followup-input"
            data-testid="ml-followup-input"
            placeholder={placeholder}
            aria-label="接著問"
            maxLength={MAX_QUESTION}
            autoComplete="off"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button type="submit" className="ml-ghost ml-followup-send" data-testid="ml-followup-send" disabled={loading || text.trim() === ''}>送出</button>
        </form>
      )}
      {(!hideReadings || entries.some((e) => e.type === 'followup')) && (
        <button type="button" className="ml-ghost ml-followup-clear" data-testid="ml-followup-clear" onClick={onClear}>清除對話</button>
      )}
    </div>
  )
}
