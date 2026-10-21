import './ai.css'
import type { AiReading } from '../ai'

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
      <div className="ml-ai-verdict" data-testid="ml-ai-verdict">
        <div className="ml-ai-verdict-k">一句話</div>
        <div className="ml-ai-verdict-v">{reading.verdict}</div>
      </div>
      {reading.paragraphs.map((p, k) => (
        <div className="ml-ai-para" key={k}>
          <h2 className="ml-ai-title">{p.title}</h2>
          <p className="ml-ai-text">{p.text}</p>
          <span className="ml-ai-basis" data-testid="ml-ai-basis">依據：{p.basis.join('；')}</span>
        </div>
      ))}
    </div>
  )
}
