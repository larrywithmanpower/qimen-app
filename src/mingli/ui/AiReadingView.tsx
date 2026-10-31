import './ai.css'
import { AI_LIMIT_TEXT, AI_NOTICE_TEXT } from '../ai'
import type { AiCardRef, AiReading, AiRefusal } from '../ai'

// 讀取中
export function AiLoading() {
  return (
    <div className="ml-ai-loading" data-testid="ml-ai-loading" role="status">
      <span className="ml-ai-dot" aria-hidden="true" />
      AI 解讀中…
    </div>
  )
}

// 依據＋知識卡：知識卡只列名稱（編號是內部用的），停留可看出處
export function AiSources({ basis, cards, basisId, cardsId }: { basis: string[]; cards: AiCardRef[]; basisId: string; cardsId: string }) {
  return (
    <div className="ml-ai-src">
      {basis.length > 0 && <span className="ml-ai-basis" data-testid={basisId}>依據：{basis.join('；')}</span>}
      {cards.length > 0 && (
        <span className="ml-ai-cards" data-testid={cardsId}>
          {cards.map((c) => <span className="ml-ai-chip" key={c.id} title={c.source}>{c.title}</span>)}
        </span>
      )}
    </div>
  )
}

// AI 解讀結果：一句話＋各段，每段下方列依據
// folded：已經接著問了，各段收起來（一句話留著），點標題可再展開
export function AiReadingView({ reading, folded = false }: { reading: AiReading; folded?: boolean }) {
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
        // key 帶 folded：收合狀態一變就重設開關
        <details className="ml-ai-para" key={`${k}-${folded}`} open={!folded}>
          <summary className="ml-ai-sum"><h2 className="ml-ai-title">{p.title}</h2></summary>
          <p className="ml-ai-text">{p.text}</p>
          <AiSources basis={p.basis} cards={p.cards} basisId="ml-ai-basis" cardsId="ml-ai-cards" />
        </details>
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
