import { useEffect, useMemo, useRef, useState } from 'react'
import './home.css'
import { setRealm } from './fx'
import { goTo } from './route'
import { SAMPLE_QUESTION, session, updateSession, type Method } from './session'
import { NEED_QUESTION } from './QuestionBar'
import { todayInfo } from './today'

// 煩惱字卡：點了帶入問題，直接進推薦的算法（2026-11-09 定案的分類）
const WORRIES: { label: string; method: Method; question: string }[] = [
  { label: '感情', method: 'tarot', question: '我的感情接下來會怎麼走？' },
  { label: '工作', method: 'meihua', question: '工作上這件事接下來會怎樣？' },
  { label: '錢', method: 'meihua', question: '最近的財運要注意什麼？' },
  { label: '人際', method: 'tarot', question: '我跟身邊的人，關係要怎麼調整？' },
  { label: '我自己', method: 'ziwei', question: '' },
  { label: '該不該換工作', method: 'meihua', question: '我該不該換工作？' },
  { label: '他還喜歡我嗎', method: 'tarot', question: '他現在對我是什麼想法？' },
  { label: '今年運勢', method: 'ziwei', question: '今年整體運勢如何？' },
  { label: '不知道問什麼', method: 'tarot', question: '最近我最該注意的是什麼？' },
]

const TRIGRAMS = '乾兌離震巽坎艮坤'
// 全形空白（寫成跳脫碼，lint 不准直接出現在模板字串裡）
const SP = '\u3000'

const GO: { method: Method; label: string }[] = [
  { method: 'meihua', label: '用梅花問' },
  { method: 'tarot', label: '用塔羅問' },
  { method: 'ziwei', label: '看紫微命盤' },
]

// 東方入口的小羅盤（慢轉）
function MiniCompass() {
  return (
    <svg className="ml-hm-compass" viewBox="0 0 120 120" aria-hidden="true">
      <g className="ml-hm-spin">
        <circle cx="60" cy="60" r="56" className="ml-hm-ring" />
        <circle cx="60" cy="60" r="52" className="ml-hm-ticks" />
        <circle cx="60" cy="60" r="26" className="ml-hm-ring" />
        {[...TRIGRAMS].map((c, i) => {
          const a = (i * Math.PI) / 4
          return <text key={c} x={60 + 42 * Math.sin(a)} y={60 - 42 * Math.cos(a)} dy=".35em" textAnchor="middle" className="ml-hm-tri">{c}</text>
        })}
      </g>
      <circle cx="60" cy="60" r="4" className="ml-hm-dot" />
    </svg>
  )
}

// 西方入口浮著的一張星星牌（線稿）
function StarCard() {
  return (
    <svg className="ml-hm-card" viewBox="0 0 90 146" aria-hidden="true">
      <rect x="4" y="4" width="82" height="138" rx="4" className="ml-hm-card-frame" />
      <text x="45" y="20" textAnchor="middle" className="ml-hm-card-num">XVII</text>
      <path d="M45 32l4 12h13l-10.5 7.5 4 12L45 56l-10.5 7.5 4-12L28 44h13z" className="ml-hm-card-star" />
      <path d="M14 100c10-6 20-6 31 0s21 6 31 0M20 110c8-4 17-4 25 0s17 4 25 0M45 70v22M40 86c2 3 8 3 10 0" className="ml-hm-card-line" />
      <text x="45" y="132" textAnchor="middle" className="ml-hm-card-name">THE STAR</text>
    </svg>
  )
}

export default function Home() {
  const today = useMemo(() => todayInfo(), [])
  const [question, setQuestion] = useState(session.question)
  // 點字卡後標「推薦」的算法；使用者仍可自己選
  const [rec, setRec] = useState<Method | null>(null)
  const [needQ, setNeedQ] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { setRealm('home') }, [])

  // 字卡只幫忙填問題、標推薦，不直接跳頁
  const fill = (w: (typeof WORRIES)[number]) => {
    setQuestion(w.question)
    setRec(w.method)
    setNeedQ(false)
    inputRef.current?.focus()
  }

  const go = (method: Method) => {
    const q = question.trim()
    // 梅花、塔羅一定要有問題；紫微問題可空
    if (!q && method !== 'ziwei') {
      setNeedQ(true)
      inputRef.current?.focus()
      return
    }
    updateSession({ method, question: q })
    goTo(`/${method}`)
  }

  const chips = (dup: boolean) => WORRIES.map((w) => (
    <button
      key={`${dup ? 'b' : 'a'}-${w.label}`}
      type="button"
      className="ml-hm-chip"
      data-testid={dup ? undefined : 'ml-worry'}
      aria-hidden={dup || undefined}
      tabIndex={dup ? -1 : undefined}
      onClick={() => fill(w)}
    >
      {w.label}
    </button>
  ))

  return (
    <section className="ml-view ml-hm" data-testid="ml-home">
      <p className="ml-hm-today" data-testid="ml-today">
        {[`${today.year}年`, `${today.month}月`, `${today.day}日`, '·', today.term, '·', today.moon].join(SP)}
      </p>
      <div className="ml-hm-hero">
        <h1 className="ml-hm-title">有事<br className="ml-hm-br" />放不下，<br /><span className="ml-hm-red">就來問一問。</span></h1>
        <p className="ml-hm-lead">東方看天時，西方看星辰。點一個你在煩的事，我們幫你挑合適的方法；每段 AI 解讀都附上依據的卦辭、牌義與星曜。</p>
      </div>

      <div className="ml-hm-ask">
        <input
          ref={inputRef}
          className="ml-hm-input"
          data-testid="ml-question"
          aria-label="你想問的事"
          placeholder={`寫下你想問的事，例：${SAMPLE_QUESTION}`}
          autoComplete="off"
          maxLength={200}
          value={question}
          onChange={(e) => { setQuestion(e.target.value); setNeedQ(false) }}
        />
        {needQ && <p className="ml-hm-need" data-testid="ml-home-need" role="status">{NEED_QUESTION}</p>}
        <div className="ml-hm-go">
          {GO.map((g) => (
            <button key={g.method} type="button" className="ml-hm-gobtn" data-testid={`ml-go-${g.method}`} data-rec={rec === g.method || undefined} onClick={() => go(g.method)}>
              {g.label}{rec === g.method && <span className="ml-hm-rec">推薦</span>}
            </button>
          ))}
        </div>
      </div>

      <p className="ml-hm-mqlabel">不知道怎麼問？點一個</p>
      <div className="ml-hm-marquee" data-ml-marquee aria-label="不知道怎麼問？點一個">
        <div className="ml-hm-track">{chips(false)}{chips(true)}</div>
      </div>

      <div className="ml-hm-doors">
        <div className="ml-hm-east" data-testid="ml-door-east">
          <MiniCompass />
          <h2 className="ml-hm-east-title">問天時</h2>
          <span className="ml-hm-east-sub">東方命理</span>
          <div className="ml-hm-list">
            <a href="#/meihua" data-testid="ml-door-meihua">梅花易數<small>一件事接下來會怎樣</small></a>
            <a href="#/ziwei" data-testid="ml-door-ziwei">紫微斗數<small>十二宮看人生各面向</small></a>
            <span className="ml-hm-soon">{'奇門遁甲・八字　籌備中'}</span>
          </div>
        </div>
        <div className="ml-hm-west" data-testid="ml-door-west">
          <span className="ml-hm-dot1" aria-hidden="true" />
          <span className="ml-hm-dot2" aria-hidden="true" />
          <StarCard />
          <p className="ml-hm-west-title">Stars</p>
          <p className="ml-hm-west-sub">WESTERN · 問星辰</p>
          <div className="ml-hm-list">
            <a href="#/tarot" data-testid="ml-door-tarot">塔羅<small>看清自己現在的心</small></a>
            <span className="ml-hm-soon">{'星座運勢　籌備中'}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
