import './ai.css'
import { AI_LIMIT_TEXT, AI_NOTICE_TEXT } from '../ai'
import type { AiReading, AiRefusal } from '../ai'

// 讀取中
export function AiLoading() {
  return (
    <div className="ml-ai-loading" data-testid="ml-ai-loading" role="status">
      <span className="ml-ai-dot" aria-hidden="true" />
      AI 解讀中…
    </div>
  )
}

// AI 解讀結果：一句話＋各段，每段下方小字列依據
export function AiReadingView({ reading }: { reading: AiReading }) {
  return (
    <div className="ml-ai-reading" data-testid="ml-ai-reading">
      {reading.notice && reading.notice.length > 0 && (
        <div className="ml-ai-notice" data-testid="ml-ai-notice" role="note">
          {reading.notice.map((n) => <p key={n}>{AI_NOTICE_TEXT[n]}</p>)}
        </div>
      )}
      <div className="ml-ai-verdict" data-testid="ml-ai-verdict">
        <div className="ml-ai-verdict-k">一句話</div>
        <div className="ml-ai-verdict-v">{reading.verdict}</div>
      </div>
      {reading.paragraphs.map((p, k) => (
        <div className="ml-ai-para" key={k}>
          <h2 className="ml-ai-title">{p.title}</h2>
          <p className="ml-ai-text">{p.text}</p>
          <span className="ml-ai-basis" data-testid="ml-ai-basis">依據：{p.basis.join('；')}</span>
          <span className="ml-ai-cards" data-testid="ml-ai-cards">知識卡：{p.cards.map((c) => `${c.id} ${c.title}`).join('；')}</span>
        </div>
      ))}
    </div>
  )
}

// 今天次數用完：講清楚原因，不要只說「暫時無法」
export function AiLimitLine() {
  return <p className="ml-ai-help" data-testid="ml-ai-limit" role="status">{AI_LIMIT_TEXT}</p>
}

// AI 沒辦法解讀時（額度用完、緊急開關關掉、連線失敗）隱晦的輕生說法沒人判斷，固定附求助專線
export function AiHelpLine() {
  return (
    <p className="ml-ai-help" data-testid="ml-ai-help" role="note">
      如果最近心裡很難受，可以打安心專線 1925（24 小時免費）或生命線 1995。
    </p>
  )
}

// 後端婉拒：放在原本放解讀的位置，不退範本、不顯示「範例解讀」
export function AiRefusalView({ refusal }: { refusal: AiRefusal['refusal'] }) {
  return (
    <div className="ml-ai-refusal" data-testid="ml-ai-refusal" data-kind={refusal.kind} role="note">
      <p>{refusal.message}</p>
    </div>
  )
}
