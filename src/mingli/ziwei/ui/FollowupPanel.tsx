import { useState } from 'react'
import type { FormEvent } from 'react'
import './followup.css'
import { AI_LIMIT_TEXT, AI_NOTICE_TEXT, MAX_QUESTION } from '../../ai'
import type { AiRefusal, FollowupResult, ThreadEntry } from '../../ai'
import { AiHelpLine, AiLoading, AiReadingView, AiRefusalView, AiSources } from '../../ui/AiReadingView'
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
          <AiSources basis={result.basis} cards={result.cards} basisId="ml-followup-basis" cardsId="ml-followup-cards" />
        </>
      ) : (
        <p className="ml-ai-text">{result.text}</p>
      )}
    </>
  )
}

// 解讀完繼續追問：對話樣式，問題靠右、AI 靠左，輸入框黏在畫面底部
// questionInHeader：塔羅、梅花的問題已經寫在頁首，解讀前不再重複一次問題泡泡
// suggestions：還沒追問時給幾個建議問題，點了直接送出
export default function FollowupPanel({ entries, status, refusal, canAsk, onSend, onClear, placeholder = '接著問…', questionInHeader = false, suggestions = [] }: {
  entries: ThreadEntry[]
  status: FollowupStatus
  refusal: AiRefusal['refusal'] | null
  canAsk: boolean
  onSend: (q: string) => Promise<boolean>
  onClear: () => void
  placeholder?: string
  questionInHeader?: boolean
  suggestions?: string[]
}) {
  const [text, setText] = useState('')
  const hasReading = entries.some((e) => e.type === 'reading')
  const asked = entries.some((e) => e.type === 'followup')
  const loading = status === 'loading'
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const q = text.trim()
    if (!q || loading) return
    if (await onSend(q)) setText('')
  }
  // 建議問題：送不出去就放回輸入框，讓人改一改再送
  const pick = async (q: string) => {
    if (loading) return
    if (!(await onSend(q))) setText(q)
  }
  return (
    <div className="ml-followup">
      <div className="ml-followup-thread" data-testid="ml-followup-thread">
        {entries.map((e, k) =>
          e.type === 'reading' ? (
            <div className="ml-followup-reading" key={k}>
              {!questionInHeader && <p className="ml-chat-q ml-followup-q" data-testid="ml-followup-reading-q">{e.q || '整體運勢'}</p>}
              {/* 後面已經接著問的解讀就收起來，讓對話露出來 */}
              <AiReadingView reading={e.reading} folded={entries.slice(k + 1).some((x) => x.type === 'followup')} />
            </div>
          ) : (
            <div className="ml-followup-item" data-testid="ml-followup-item" data-action={e.result.action} key={k}>
              <p className="ml-chat-q ml-followup-q">{e.q}</p>
              <div className="ml-chat-a">
                <FollowupAnswer result={e.result} />
              </div>
            </div>
          ),
        )}
        {loading && <div className="ml-chat-a ml-chat-wait"><AiLoading /></div>}
      </div>
      {refusal && <AiRefusalView refusal={refusal} />}
      {(status === 'fail' || status === 'limited') && (
        <>
          <p className="ml-z-hint" data-testid="ml-followup-error" role="status">{status === 'limited' ? AI_LIMIT_TEXT : 'AI 暫時無法回答，稍後再試'}</p>
          <AiHelpLine />
        </>
      )}
      {(!questionInHeader || asked) && (
        <button type="button" className="ml-followup-clear" data-testid="ml-followup-clear" onClick={onClear}>清除對話</button>
      )}
      {hasReading && canAsk && !asked && !loading && suggestions.length > 0 && (
        <div className="ml-followup-sugs" role="group" aria-label="建議問題">
          {suggestions.map((q) => (
            <button type="button" className="ml-followup-sug" data-testid="ml-followup-sug" key={q} onClick={() => void pick(q)}>{q}</button>
          ))}
        </div>
      )}
      {hasReading && canAsk && (
        <div className="ml-followup-dock">
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
            <button type="submit" className="ml-followup-send" data-testid="ml-followup-send" disabled={loading || text.trim() === ''}>送出</button>
          </form>
        </div>
      )}
    </div>
  )
}
