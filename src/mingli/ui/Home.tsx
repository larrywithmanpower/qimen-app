import { useEffect, useRef, useState } from 'react'
import { burstAt, expandTaiji, prefersReduced, setRealm, setTaijiSide } from './fx'
import { goTo } from './route'
import { SAMPLE_QUESTION, session, updateSession, type Method } from './session'

const TITLE_SEGS = ['心裡有事，', '就問。']
const TITLE = TITLE_SEGS.join('')

const METHODS: { id: Method; tag: string; name: string; sub: string }[] = [
  { id: 'tarot', tag: 'Tarot', name: '塔羅', sub: '看清自己現在的心' },
  { id: 'meihua', tag: '梅', name: '梅花易數', sub: '一件事接下來會怎樣' },
  { id: 'ziwei', tag: '紫', name: '紫微斗數', sub: '十二宮看人生各面向' },
]

const SOON = ['奇門遁甲', '八字', '雙人合盤']

export default function Home() {
  const [method, setMethod] = useState<Method>(session.method)
  const [question, setQuestion] = useState(session.question)
  const timer = useRef(0)

  useEffect(() => {
    setRealm('home')
    setTaijiSide(session.method === 'tarot' ? 1 : -1)
    return () => clearTimeout(timer.current)
  }, [])

  const pick = (id: Method, el: Element) => {
    setMethod(id)
    updateSession({ method: id })
    setTaijiSide(id === 'tarot' ? 1 : -1)
    burstAt(el)
  }

  const start = (el: Element) => {
    updateSession({ question: question.trim() || SAMPLE_QUESTION, method })
    burstAt(el)
    // 太極擴散：選中的那半邊吞掉整個畫面，再進入該頁
    expandTaiji(method === 'tarot' ? 1 : -1)
    timer.current = window.setTimeout(() => goTo(`/${method}`), prefersReduced() ? 0 : 520)
  }

  return (
    <section className="ml-view ml-home" data-testid="ml-home">
      <h1 className="ml-home-title" aria-label={TITLE}>
        {TITLE_SEGS.map((seg, si) => (
          <span key={si} className="ml-home-title-seg" aria-hidden="true">
            {[...seg].map((ch, i) => {
              const n = TITLE_SEGS.slice(0, si).join('').length + i
              return <span key={i} style={{ animationDelay: `${0.15 + n * 0.12}s` }}>{ch}</span>
            })}
          </span>
        ))}
      </h1>
      <p className="ml-home-lead">寫下一件具體的事，選一種算法。每次解讀都附上依據，並留一句之後能對答案的判斷。</p>
      <div className="ml-home-ask">
        <div className="ml-home-q">
          <input
            data-testid="ml-question"
            aria-label="你想問的事"
            placeholder={`例：${SAMPLE_QUESTION}`}
            autoComplete="off"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </div>
        <div className="ml-home-methods">
          {METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              className="ml-method"
              data-m={m.id}
              data-testid={`ml-method-${m.id}`}
              aria-pressed={method === m.id}
              onClick={(e) => pick(m.id, e.currentTarget)}
            >
              <span className="ml-method-tag">{m.tag}</span>
              <span className="ml-method-name">{m.name}</span>
              <span className="ml-method-sub">{m.sub}</span>
            </button>
          ))}
        </div>
        <div className="ml-home-actions">
          <button type="button" className="ml-go" data-testid="ml-start" onClick={(e) => start(e.currentTarget)}>開始</button>
          <div className="ml-home-soon">
            <span className="ml-home-soon-label">之後開放</span>
            {SOON.map((s) => <span key={s} className="ml-soon-pill">{s}</span>)}
          </div>
        </div>
      </div>
    </section>
  )
}
