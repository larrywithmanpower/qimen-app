import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import '../ui/tarot.css'
import { burstAt, prefersReduced, setRealm } from '../ui/fx'
import { SAMPLE_QUESTION, session } from '../ui/session'
import { CARDS } from './cards'
import { backSVG, faceSVG } from './cardArt'
import { drawThree, nextSeed, SEED_RANGE, seedFrom, shuffle, templateReading } from './engine'

const SLOT_LABELS = [['過去', 'Past'], ['現在', 'Present'], ['接下來', 'Future']] as const

// 每個牌位的進度：空 → 飛行中 → 蓋著 → 翻面 → 牌面揭露
type Phase = 'empty' | 'flying' | 'back' | 'flipped' | 'revealed'

const pad = (seed: number) => String(seed).padStart(5, '0')

function initialSeed(param: string | null, question: string) {
  const n = param === null || param === '' ? NaN : Number(param)
  return Number.isInteger(n) && n >= 0 && n < SEED_RANGE ? n : seedFrom(question, Date.now())
}

export default function TarotPage({ seedParam }: { seedParam: string | null }) {
  const question = session.question || SAMPLE_QUESTION
  const [seed, setSeed] = useState(() => initialSeed(seedParam, question))
  const [picks, setPicks] = useState<number[]>([])
  const [phases, setPhases] = useState<Phase[]>(['empty', 'empty', 'empty'])
  const [read, setRead] = useState(false)
  const [busy, setBusy] = useState(false)
  const deck = useMemo(() => shuffle(seed), [seed])
  const fanRef = useRef<HTMLDivElement>(null)
  const wellRefs = useRef<(HTMLDivElement | null)[]>([])
  const picksRef = useRef<number[]>([])
  const timers = useRef<number[]>([])
  const flyers = useRef<{ el: HTMLElement; anim: Animation }[]>([])

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }
  const clearAll = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    flyers.current.forEach((f) => {
      f.anim.cancel()
      f.el.remove()
    })
    flyers.current = []
  }

  useEffect(() => {
    setRealm('west')
    return clearAll
  }, [])

  const setPhase = (slot: number, phase: Phase) =>
    setPhases((cur) => cur.map((p, i) => (i === slot ? phase : p)))

  const reset = (nextSeedValue: number) => {
    clearAll()
    picksRef.current = []
    setPicks([])
    setPhases(['empty', 'empty', 'empty'])
    setRead(false)
    setBusy(false)
    setSeed(nextSeedValue)
  }

  const pick = (pos: number, btn: HTMLElement) => {
    const cur = picksRef.current
    if (cur.length >= 3 || cur.includes(pos) || busy) return
    const slot = cur.length
    const reduce = prefersReduced()
    picksRef.current = [...cur, pos]
    setPicks(picksRef.current)
    setPhase(slot, 'flying')

    // 牌從牌堆飛到牌位
    const well = wellRefs.current[slot]!
    const from = btn.getBoundingClientRect()
    const to = well.getBoundingClientRect()
    const fly = document.createElement('div')
    fly.className = 'ml-flyer ml-cb'
    fly.innerHTML = backSVG()
    Object.assign(fly.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` })
    document.body.append(fly)
    const dx = to.left - from.left
    const dy = to.top - from.top
    const sx = to.width / from.width
    const sy = to.height / from.height
    const anim = fly.animate(
      [
        { transform: 'translate(0,0) scale(1) rotate(0deg)', transformOrigin: '0 0' },
        { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 60}px) scale(${(1 + sx) / 2}) rotate(-8deg)`, transformOrigin: '0 0', offset: 0.55 },
        { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy}) rotate(0deg)`, transformOrigin: '0 0' },
      ],
      { duration: reduce ? 1 : 750, easing: 'cubic-bezier(.3,.7,.2,1)', fill: 'forwards' },
    )
    const record = { el: fly, anim }
    flyers.current.push(record)
    anim.onfinish = () => {
      fly.remove()
      flyers.current = flyers.current.filter((f) => f !== record)
      setPhase(slot, 'back')
      later(() => {
        setPhase(slot, 'flipped')
        later(() => {
          setPhase(slot, 'revealed')
          burstAt(well)
        }, reduce ? 0 : 420)
        if (slot === 2) later(() => setRead(true), reduce ? 0 : 1500)
      }, reduce ? 0 : 220)
    }
  }

  const shuffleDeck = () => {
    if (busy) return
    if (picks.length) return reset(seedFrom(question, Date.now()))
    const reduce = prefersReduced()
    const cards = [...(fanRef.current?.children ?? [])] as HTMLElement[]
    setBusy(true)
    cards.forEach((b, k) => {
      const base = getComputedStyle(b).transform
      b.animate(
        [
          { transform: base },
          { transform: `translate(${(Math.random() - 0.5) * 220}px, ${-40 - Math.random() * 80}px) rotate(${(Math.random() - 0.5) * 60}deg)` },
          { transform: base },
        ],
        { duration: reduce ? 1 : 700, delay: reduce ? 0 : k * 12, easing: 'cubic-bezier(.4,0,.2,1)' },
      )
    })
    if (fanRef.current) burstAt(fanRef.current)
    later(() => {
      setSeed(nextSeed(seed))
      setBusy(false)
    }, reduce ? 0 : 720 + cards.length * 12)
  }

  // 立體傾斜＋箔面反光跟著手指走
  const tilt = (e: PointerEvent<HTMLDivElement>) => {
    const well = e.currentTarget
    const card = well.querySelector<HTMLElement>('.ml-tcard')
    if (!card) return
    const r = well.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    card.style.setProperty('--ml-ry', `${(x - 0.5) * 22}deg`)
    card.style.setProperty('--ml-rx', `${(0.5 - y) * 18}deg`)
    card.style.setProperty('--ml-mx', `${(1 - x) * 100}%`)
    card.style.setProperty('--ml-my', `${y * 100}%`)
  }
  const untilt = (e: PointerEvent<HTMLDivElement>) => {
    const card = e.currentTarget.querySelector<HTMLElement>('.ml-tcard')
    card?.style.setProperty('--ml-rx', '0deg')
    card?.style.setProperty('--ml-ry', '0deg')
  }

  const drawn = read && picks.length === 3 ? drawThree(seed, [picks[0], picks[1], picks[2]]) : null
  const reading = drawn ? templateReading(drawn) : null
  const n = deck.length
  const spread = Math.min(4.6, 110 / n)

  return (
    <section className="ml-view ml-tarot" data-testid="ml-tarot" data-read={read}>
      <div className="ml-tarot-board">
        <div className="ml-tarot-head">
          <span className="ml-tarot-sub">The Three-Card Spread</span>
          <h1 className="ml-tarot-question">{question}</h1>
        </div>
        <div className="ml-slots">
          {SLOT_LABELS.map(([zh, en], i) => {
            const phase = phases[i]
            const slotCard = picks[i] === undefined ? null : deck[picks[i]]
            const card = slotCard ? CARDS[slotCard.index] : null
            return (
              <div className="ml-slot" key={zh} data-testid="ml-slot" data-card={(phase === 'flipped' || phase === 'revealed') && card ? card.zh : ''}>
                <div
                  className="ml-well"
                  data-filled={phase !== 'empty' && phase !== 'flying'}
                  ref={(el) => { wellRefs.current[i] = el }}
                  onPointerMove={tilt}
                  onPointerLeave={untilt}
                >
                  {slotCard && card && phase !== 'empty' && phase !== 'flying' && (
                    <div className={`ml-tcard${phase === 'flipped' || phase === 'revealed' ? ' ml-flipped' : ''}${phase === 'revealed' ? ' ml-revealed' : ''}`}>
                      <div className="ml-tcard-inner">
                        <div className="ml-cb" dangerouslySetInnerHTML={{ __html: backSVG() }} />
                        <div className="ml-face">
                          <div className={`ml-face-art${slotCard.reversed ? ' ml-rev' : ''}`} dangerouslySetInnerHTML={{ __html: faceSVG(card.index) }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="ml-slot-label">
                  <span className="ml-slot-zh">{zh}</span>
                  <span className="ml-slot-en">{en}</span>
                </div>
              </div>
            )
          })}
        </div>
        <div className="ml-tools">
          {read ? (
            <button type="button" className="ml-ghost" data-testid="ml-again" onClick={() => reset(seedFrom(question, Date.now()))}>重新抽</button>
          ) : (
            <button type="button" className="ml-ghost" data-testid="ml-shuffle" onClick={shuffleDeck}>洗牌</button>
          )}
          <span className="ml-seed" data-testid="ml-seed">牌序 No. {pad(seed)}</span>
        </div>
        {!read && <p className="ml-tarot-hint">{picks.length === 0 ? '點牌堆任一張，抽三張' : `再抽 ${3 - picks.length} 張・點牌堆任一張`}</p>}
        <div
          className={`ml-fan${picks.length >= 3 || busy ? ' ml-locked' : ''}`}
          data-testid="ml-fan"
          ref={fanRef}
          hidden={read}
          role="group"
          aria-label="牌堆，點一張抽出"
        >
          {deck.map((_, k) => (
            <button
              key={`${seed}-${k}`}
              type="button"
              className="ml-fan-card"
              data-testid="ml-fan-card"
              aria-label={`第 ${k + 1} 張牌`}
              style={{ '--ml-a': `${(k - (n - 1) / 2) * spread}deg`, visibility: picks.includes(k) ? 'hidden' : 'visible' } as CSSProperties}
              onClick={(e) => pick(k, e.currentTarget)}
            >
              <span className="ml-cb" dangerouslySetInnerHTML={{ __html: backSVG() }} />
            </button>
          ))}
        </div>
      </div>
      {reading && (
        <div className="ml-reading" data-testid="ml-reading">
          <div className="ml-verdict" data-testid="ml-verdict">
            <div className="ml-verdict-k">一句話</div>
            <div className="ml-verdict-v">{reading.verdict}</div>
          </div>
          <div className="ml-paras">
            {reading.paragraphs.map((p, k) => (
              <div className="ml-para" key={p.title} style={{ animationDelay: `${0.15 + k * 0.18}s` }}>
                <h2 className="ml-para-title">{p.title}</h2>
                <p className="ml-para-text">{p.text}。</p>
                <span className="ml-basis" data-testid="ml-basis">依據：{p.basis}</span>
              </div>
            ))}
          </div>
          <p className="ml-note">範例解讀，正式版由 AI 依牌義規則卡撰寫</p>
        </div>
      )}
    </section>
  )
}
