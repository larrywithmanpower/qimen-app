// 今日一牌：免費、不呼叫 AI；想細看才按「AI 詳細解讀」（用掉一次每日 AI 次數，同一天看過的存在本機不重扣）
import { useEffect, useState } from 'react'
import '../ui/tarot.css'
import './daily.css'
import { prefersReduced, setRealm } from '../ui/fx'
import { proxyUrl } from '../ai'
import type { AiReading } from '../ai'
import { AiHelpLine, AiLimitLine, AiLoading, AiReadingView, AiRefusalView } from '../ui/AiReadingView'
import { useAiReading } from '../ui/useAiReading'
import { BACK_SRC, faceSrc } from './cardArt'
import { Astrolabe } from './TarotPage'
import { DAILY_QUESTION, dailyCard, dailyCardId, dailyFacts, dailyTone, deviceId, taiwanDate } from './daily'

const AI_CACHE_KEY = 'ml-daily-ai'

// 今天看過的 AI 詳細解讀（只存這台裝置；日期不同就當沒有）
function loadCachedReading(date: string): AiReading | null {
  try {
    const v = JSON.parse(localStorage.getItem(AI_CACHE_KEY) ?? 'null') as { date?: string; reading?: AiReading } | null
    return v?.date === date && typeof v.reading?.verdict === 'string' && Array.isArray(v.reading.paragraphs) ? v.reading : null
  } catch {
    return null
  }
}
function saveCachedReading(date: string, reading: AiReading) {
  try {
    localStorage.setItem(AI_CACHE_KEY, JSON.stringify({ date, reading }))
  } catch {
    // 存不了就只在這次畫面使用
  }
}

// 知識卡牌義跟後端同一份檔案，用到才載入，不拖慢首頁
async function loadMeaning(id: string): Promise<string> {
  const { default: raw } = await import('../../../functions/gemini-proxy/cards/tarot.json?raw')
  const cards = (JSON.parse(raw) as { cards: { id: string; text: string }[] }).cards
  return cards.find((c) => c.id === id)?.text ?? ''
}

export default function DailyPage() {
  // 開頁那一刻的台灣日期；頁面開著跨過午夜也不換，重新整理才換
  const [date] = useState(() => taiwanDate())
  const [drawn] = useState(() => dailyCard(deviceId(), date))
  const [flipped, setFlipped] = useState(false)
  const [meaning, setMeaning] = useState('')
  const [cached] = useState(() => loadCachedReading(date))
  // 按了幾次 AI 詳細解讀；失敗後再按換新的 key 重送
  const [attempt, setAttempt] = useState(0)
  const cardId = dailyCardId(drawn)
  const { card, reversed } = drawn
  const orientation = reversed ? '逆位' : '正位'

  useEffect(() => { setRealm('west') }, [])
  useEffect(() => {
    const t = window.setTimeout(() => setFlipped(true), prefersReduced() ? 0 : 500)
    return () => { window.clearTimeout(t) }
  }, [])
  useEffect(() => {
    let alive = true
    loadMeaning(cardId).then((m) => { if (alive) setMeaning(m) })
    return () => { alive = false }
  }, [cardId])

  // 按了才送；今天看過的直接用存好的
  const ai = useAiReading(
    attempt > 0 && !cached ? { kind: 'tarot', question: DAILY_QUESTION, facts: dailyFacts(drawn), tone: dailyTone(drawn) } : null,
    `daily-${date}-${cardId}-${attempt}`,
  )
  useEffect(() => {
    if (ai.status === 'ok') saveCachedReading(date, ai.reading)
  }, [ai, date])
  const reading = cached ?? (ai.status === 'ok' ? ai.reading : null)
  const [, month, day] = date.split('-').map(Number)

  return (
    <section className="ml-view ml-tarot ml-daily" data-testid="ml-daily" data-card={cardId} data-ai={cached ? 'cached' : ai.status}>
      <div className="ml-tarot-head ml-daily-head">
        <span className="ml-tarot-sub">Card of the Day・{month}/{day}</span>
        <h1 className="ml-tarot-question">今日一牌</h1>
      </div>
      <div className="ml-ritual ml-tritual ml-daily-ritual">
        <div className="ml-decor" aria-hidden="true">
          <Astrolabe />
          <span className="ml-tw ml-tw1" />
          <span className="ml-tw ml-tw2" />
          <span className="ml-tw ml-tw3" />
        </div>
        <div className="ml-well ml-daily-well" data-filled="true">
          <div className={`ml-tcard${flipped ? ' ml-flipped ml-revealed' : ''}`} data-testid="ml-daily-card">
            <div className="ml-tcard-inner ml-daily-inner">
              <div className="ml-cb"><img src={BACK_SRC} alt="" draggable={false} /></div>
              <div className="ml-face">
                <div className={`ml-face-art${reversed ? ' ml-rev' : ''}`}>
                  <img src={faceSrc(card.index)} alt={`${card.zh} ${orientation}`} draggable={false} />
                  <span className="ml-fc-roman">{card.roman}</span>
                  <span className="ml-fc-text ml-daily-fctext">
                    <span className="ml-fc-zh">{card.zh}</span>
                    <span className="ml-fc-en">{card.en}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="ml-daily-name" data-testid="ml-daily-name">{card.zh}・{orientation}</p>
      </div>

      <div className="ml-reading" data-testid="ml-daily-reading">
        <div className="ml-verdict">
          <div className="ml-verdict-k">今天的提醒</div>
          <div className="ml-verdict-v" data-testid="ml-daily-line">{reversed ? card.reversed : card.upright}</div>
        </div>
        {meaning && <p className="ml-daily-meaning" data-testid="ml-daily-meaning">{meaning}</p>}
        <span className="ml-basis ml-daily-basis">依據：{card.zh} {orientation}</span>
      </div>

      {reading && <AiReadingView reading={reading} />}
      {!reading && ai.status === 'loading' && <AiLoading />}
      {!reading && ai.status === 'refused' && <AiRefusalView refusal={ai.refusal} />}
      {!reading && ai.status === 'fail' && (ai.limited ? <AiLimitLine /> : <p className="ml-ai-help" data-testid="ml-daily-fail">AI 詳細解讀暫時沒辦法完成，稍後再按一次。</p>)}
      {!reading && ai.status === 'fail' && <AiHelpLine />}

      <div className="ml-daily-actions">
        {!reading && proxyUrl() !== '' && (ai.status === 'idle' || ai.status === 'fail') && (
          <button type="button" className="ml-daily-aibtn" data-testid="ml-daily-ai" onClick={() => setAttempt((n) => n + 1)}>AI 詳細解讀</button>
        )}
        <a className="ml-ghost ml-daily-ask" href="#/tarot" data-testid="ml-daily-ask">問一件具體的事</a>
      </div>
      <p className="ml-note ml-daily-note" data-testid="ml-daily-note">
        {!reading && proxyUrl() !== '' ? 'AI 詳細解讀會用掉一次 AI 次數　·　' : ''}台灣時間每天 00:00 換新牌
      </p>
    </section>
  )
}
