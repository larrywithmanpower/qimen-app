import { useEffect, useRef, useState } from 'react'
import { Solar } from 'lunar-javascript'
import './meihua.css'
import { burstAt, lightTrigrams, prefersReduced, setRealm } from '../../ui/fx'
import { SAMPLE_QUESTION, session } from '../../ui/session'
import { castByNumbers, castByTime, lunarNumbersOf, templateReading } from '../engine'
import type { MeihuaResult } from '../engine'

type Way = 'time' | 'numbers'

const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
const YAO_NAMES = ['初', '二', '三', '四', '五', '上']
const ROW_KEYS = ['本卦', '互卦', '動爻', '變卦', '體用', '判'] as const

// 報數要 1～9999 的正整數
const parseNum = (s: string) => (/^\d{1,4}$/.test(s.trim()) && Number(s) >= 1 ? Number(s) : null)

// 時間起卦怎麼算的小字：農曆年支月日時，23 點起算隔天（與引擎一致）
function lunarLine(date: Date) {
  const base = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  if (date.getHours() >= 23) base.setDate(base.getDate() + 1)
  const lunar = Solar.fromYmdHms(base.getFullYear(), base.getMonth() + 1, base.getDate(), 12, 0, 0).getLunar()
  const month = `${lunar.getMonthInChinese()}月`.replace('闰', '閏').replace('腊', '臘')
  const { hourZhi } = lunarNumbersOf(date)
  return `${lunar.getYearInGanZhi()}年 ${month}${lunar.getDayInChinese()} ${ZHI[hourZhi - 1]}時`
}

// 六爻的 y 座標：由下往上，上下卦之間留一點空隙
const yaoY = (k: number) => 300 - k * 52 - (k > 2 ? 14 : 0)

interface Cast {
  res: MeihuaResult
  info: string
  key: number
}

// 讀解頁左上的小卦象：靜態，不做動畫
function MiniHex({ res }: { res: MeihuaResult }) {
  return (
    <svg className="ml-minihex" viewBox="0 0 60 66" aria-hidden="true">
      {res.lines.map((v, k) => {
        const y = 60 - k * 10 - (k > 2 ? 3 : 0)
        const d = v ? `M6 ${y} L54 ${y}` : `M6 ${y} L25 ${y} M35 ${y} L54 ${y}`
        return <path key={k} className={`ml-minihex-line${k === res.moving - 1 ? ' ml-moving' : ''}`} d={d} />
      })}
    </svg>
  )
}

export default function MeihuaPage({ params }: { params: URLSearchParams }) {
  const question = session.question || SAMPLE_QUESTION
  const pa = parseNum(params.get('a') ?? '')
  const pb = parseNum(params.get('b') ?? '')
  const direct = pa !== null && pb !== null

  const [way, setWay] = useState<Way>(direct ? 'numbers' : 'time')
  const [aStr, setAStr] = useState(direct ? String(pa) : '')
  const [bStr, setBStr] = useState(direct ? String(pb) : '')
  const [cast, setCast] = useState<Cast | null>(null)
  const [shown, setShown] = useState(0)
  const [read, setRead] = useState(false)
  const sealRef = useRef<HTMLSpanElement>(null)
  const timers = useRef<number[]>([])
  const castKey = useRef(0)

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }
  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  const a = parseNum(aStr)
  const b = parseNum(bStr)
  const numsOk = a !== null && b !== null
  const numsMsg = numsOk ? '' : aStr.trim() === '' || bStr.trim() === '' ? '兩個數字都要填，1～9999 的整數' : '只能填 1～9999 的整數'

  // 起卦：六爻由下往上寫，寫完下卦亮下卦、寫完上卦亮上卦，右側逐行浮現
  const run = (res: MeihuaResult, info: string) => {
    clearTimers()
    lightTrigrams([])
    setRead(false)
    castKey.current += 1
    setCast({ res, info, key: castKey.current })
    if (prefersReduced()) {
      lightTrigrams([res.lower, res.upper])
      setShown(ROW_KEYS.length)
      return
    }
    setShown(0)
    later(() => lightTrigrams([res.lower]), 1700)
    later(() => lightTrigrams([res.lower, res.upper]), 3300)
    ROW_KEYS.forEach((_, k) => later(() => setShown(k + 1), 3400 + k * 380))
    later(() => sealRef.current && burstAt(sealRef.current), 3400 + ROW_KEYS.length * 380 + 80)
  }

  const doCast = (btn?: Element) => {
    if (btn) burstAt(btn)
    if (way === 'numbers') {
      if (a === null || b === null) return
      run(castByNumbers(a, b), `報數 ${a}、${b}`)
      return
    }
    const t = params.get('t')
    const given = t ? new Date(t) : null
    const date = given && !Number.isNaN(given.getTime()) ? given : new Date()
    run(castByTime(date), lunarLine(date))
  }

  useEffect(() => {
    setRealm('east')
    if (pa !== null && pb !== null) run(castByNumbers(pa, pb), `報數 ${pa}、${pb}`)
    return () => {
      clearTimers()
      lightTrigrams([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const res = cast?.res ?? null
  const reading = res ? templateReading(res) : null
  const instant = prefersReduced()
  const complete = shown >= ROW_KEYS.length

  const rows: [string, string][] = res && reading
    ? [
        ['本卦', res.name],
        ['互卦', res.mutual.name],
        ['動爻', `${YAO_NAMES[res.moving - 1]}爻`],
        ['變卦', res.changed.name],
        ['體用', `體${res.ti}${res.tiElement}・用${res.yong}${res.yongElement}　${reading.paragraphs[1].basis.replace('體用 ', '')}`],
      ]
    : []

  const toRead = () => {
    setRead(true)
    window.scrollTo(0, 0)
  }

  return (
    <section className="ml-view ml-meihua" data-testid="ml-meihua" data-read={read}>
      <div className="ml-mboard">
        <div className="ml-mhead">
          <span className="ml-mh-sub">梅花易數・{way === 'time' ? '時間起卦' : '報數起卦'}</span>
          <h1 className="ml-mh-question">{question}</h1>
        </div>
        <div className="ml-how" role="group" aria-label="起卦方式">
          <button type="button" className="ml-chip" data-testid="ml-method-time" aria-pressed={way === 'time'} onClick={() => setWay('time')}>時間起卦</button>
          <button type="button" className="ml-chip" data-testid="ml-method-numbers" aria-pressed={way === 'numbers'} onClick={() => setWay('numbers')}>報數起卦</button>
        </div>
        {way === 'numbers' && (
          <div className="ml-nums">
            <label className="ml-num">
              <span className="ml-num-k">第一個數</span>
              <input data-testid="ml-num-a" type="text" inputMode="numeric" autoComplete="off" maxLength={4} placeholder="1～9999" value={aStr} onChange={(e) => setAStr(e.target.value)} />
            </label>
            <label className="ml-num">
              <span className="ml-num-k">第二個數</span>
              <input data-testid="ml-num-b" type="text" inputMode="numeric" autoComplete="off" maxLength={4} placeholder="1～9999" value={bStr} onChange={(e) => setBStr(e.target.value)} />
            </label>
            {!numsOk && <p className="ml-num-msg" data-testid="ml-num-msg" role="status">{numsMsg}</p>}
          </div>
        )}
        <div className="ml-hexwrap">
          <div className="ml-hex" data-testid="ml-hex">
            <svg viewBox="0 0 300 330" role="img" aria-label={res ? `${res.name}卦象` : '尚未起卦'}>
              {!res && [0, 1, 2, 3, 4, 5].map((k) => (
                <path key={k} className="ml-yao-ghost" d={`M30 ${yaoY(k)} L270 ${yaoY(k)}`} />
              ))}
              {res && (
                <g key={cast!.key}>
                  {res.lines.flatMap((v, k) => {
                    const y = yaoY(k)
                    const segs = v ? [[30, 270]] : [[30, 128], [172, 270]]
                    return segs.map(([x1, x2], s) => (
                      <path
                        key={`${k}-${s}`}
                        data-testid="ml-yao"
                        className={`ml-yao${k === res.moving - 1 ? ' ml-moving' : ''}${instant ? '' : ' ml-draw'}`}
                        d={`M${x1} ${y} C ${x1 + (x2 - x1) * 0.3} ${y - 3}, ${x1 + (x2 - x1) * 0.7} ${y + 3}, ${x2} ${y}`}
                        style={instant ? { strokeDashoffset: 0 } : { animationDelay: `${k * 0.55 + s * 0.22}s` }}
                      />
                    ))
                  })}
                </g>
              )}
            </svg>
          </div>
          <div className="ml-gua">
            {!res && <p className="ml-gua-hint">按下起卦，六爻會由下往上一筆一筆寫出來</p>}
            {rows.map(([k, v], i) => (
              <div className="ml-gua-row" data-testid="ml-gua-row" data-k={k} data-on={shown > i} key={k}>
                <span className="ml-gua-k">{k}</span>
                <span className={`ml-gua-v${k === '體用' ? ' ml-gua-v-sm' : ''}${k === '動爻' ? ' ml-gua-v-mid' : ''}`}>{v}</span>
              </div>
            ))}
            {res && (
              <div className="ml-gua-row" data-testid="ml-gua-row" data-k="判" data-on={shown > 5}>
                <span className="ml-gua-k">判</span>
                <span className="ml-seal" data-testid="ml-seal" ref={sealRef} aria-label={`判斷：${res.tone}`}>{res.tone}</span>
              </div>
            )}
          </div>
        </div>
        {cast && <p className="ml-cast-info" data-testid="ml-cast-info">{cast.info}</p>}
        <div className="ml-mtools">
          <button
            type="button"
            className={cast ? 'ml-ghost' : 'ml-cta'}
            data-testid="ml-cast"
            disabled={way === 'numbers' && !numsOk}
            onClick={(e) => doCast(e.currentTarget)}
          >
            {cast ? '重新起卦' : '起卦'}
          </button>
          {cast && complete && !read && (
            <button type="button" className="ml-cta" data-testid="ml-to-reading" onClick={toRead}>看解讀</button>
          )}
        </div>
      </div>

      {res && reading && read && (
        <div className="ml-mreading" data-testid="ml-reading">
          <button type="button" className="ml-ghost ml-back-hex" data-testid="ml-back-hex" onClick={() => { setRead(false); window.scrollTo(0, 0) }}>返回卦象</button>
          <div className="ml-read-head">
            <MiniHex res={res} />
            <div className="ml-read-head-text">
              <span className="ml-read-gua">{res.name} → {res.changed.name}</span>
              <span className="ml-read-q">{question}</span>
            </div>
          </div>
          <div className="ml-mverdict">
            <div>
              <div className="ml-mverdict-k">一句話</div>
              <div className="ml-mverdict-v">{reading.verdict}</div>
            </div>
            <span className="ml-seal ml-seal-sm" aria-hidden="true">{res.tone}</span>
          </div>
          <div className="ml-mparas">
            {reading.paragraphs.map((p, k) => (
              <div className="ml-mpara" key={p.title} style={{ animationDelay: `${0.15 + k * 0.18}s` }}>
                <h2 className="ml-mpara-title">{p.title}</h2>
                <p className="ml-mpara-text">{p.text}</p>
                <span className="ml-mbasis" data-testid="ml-basis">依據：{p.basis}</span>
              </div>
            ))}
          </div>
          <p className="ml-mnote">範例解讀，正式版由 AI 依卦義規則卡撰寫</p>
        </div>
      )}
    </section>
  )
}
