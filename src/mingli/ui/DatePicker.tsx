import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import './datePicker.css'
import { daysInMonth, firstWeekday, formatDisplay, inRange, monthInRange, parseIso, shiftMonth, toIso, yearPageStart } from './dateMath'

type View = 'year' | 'month' | 'day'

type Props = {
  value: string // '' 或 YYYY-MM-DD
  onChange: (v: string) => void
  min: string
  max: string
  testid?: string
  // 面板的無障礙名稱，預設是出生日期
  label?: string
}

const WEEK = ['日', '一', '二', '三', '四', '五', '六']
const DEFAULT_YEAR = 1990 // 沒有值時年畫面預設落在這一年所在的頁

const CalendarIcon = () => (
  <svg className="ml-dp-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </svg>
)

const Chevron = ({ dir }: { dir: 'l' | 'r' }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" className="ml-dp-chev">
    <path d={dir === 'l' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
  </svg>
)

export default function DatePicker({ value, onChange, min, max, testid, label = '選擇出生日期' }: Props) {
  const minP = parseIso(min)!
  const maxP = parseIso(max)!
  const sel = parseIso(value)
  const todayIso = (() => {
    const d = new Date()
    return toIso(d.getFullYear(), d.getMonth() + 1, d.getDate())
  })()

  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>('year')
  const [viewYear, setViewYear] = useState(DEFAULT_YEAR)
  const [viewMonth, setViewMonth] = useState(1)
  const [pageStart, setPageStart] = useState(0)
  // 方向鍵移動中的焦點格（年／月畫面是年或月，日畫面是日）；null = 用預設格
  const [cursor, setCursor] = useState<number | null>(null)

  const wrapRef = useRef<HTMLDivElement>(null)
  const fieldRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const focusPending = useRef(false)

  const close = (restoreFocus: boolean) => {
    setOpen(false)
    if (restoreFocus) fieldRef.current?.focus()
  }

  const openPanel = () => {
    if (sel) {
      setView('day')
      setViewYear(sel.y)
      setViewMonth(sel.m)
    } else {
      const y = Math.min(Math.max(DEFAULT_YEAR, minP.y), maxP.y)
      setView('year')
      setViewYear(y)
      setPageStart(yearPageStart(y, minP.y))
    }
    setCursor(null)
    focusPending.current = true
    setOpen(true)
  }

  // 點面板外關閉
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => { document.removeEventListener('pointerdown', onDown) }
  }, [open])

  // 畫面切換或方向鍵移動後，把焦點交給 roving 那一格
  useLayoutEffect(() => {
    if (!open || !focusPending.current) return
    focusPending.current = false
    panelRef.current?.querySelector<HTMLElement>('[data-roving="true"]')?.focus()
  })

  const goView = (v: View) => {
    // 回年畫面時翻到目前所在年份那一頁（從日／月畫面切回來時 pageStart 還沒設過）
    if (v === 'year') setPageStart(yearPageStart(viewYear, minP.y))
    setView(v)
    setCursor(null)
    focusPending.current = true
  }

  // 預設焦點格
  const dayCount = daysInMonth(viewYear, viewMonth)
  const dayEnabled = (d: number) => inRange(toIso(viewYear, viewMonth, d), min, max)
  const firstEnabledDay = () => {
    for (let d = 1; d <= dayCount; d++) if (dayEnabled(d)) return d
    return 1
  }
  const rovingDay = cursor ?? (sel && sel.y === viewYear && sel.m === viewMonth ? sel.d : firstEnabledDay())
  const years = Array.from({ length: 12 }, (_, i) => pageStart + i)
  const yearEnabled = (y: number) => y >= minP.y && y <= maxP.y
  const rovingYear = cursor ?? (sel && years.includes(sel.y) ? sel.y : years.includes(DEFAULT_YEAR) && yearEnabled(DEFAULT_YEAR) ? DEFAULT_YEAR : years.find(yearEnabled) ?? years[0])
  const monthEnabled = (m: number) => monthInRange(viewYear, m, min, max)
  const rovingMonth = cursor ?? (sel && sel.y === viewYear ? sel.m : Array.from({ length: 12 }, (_, i) => i + 1).find(monthEnabled) ?? 1)

  // 方向鍵：Esc 在外層處理；這裡只管格子間移動
  const onGridKey = (e: KeyboardEvent) => {
    const step: Record<string, number> = view === 'day'
      ? { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
      : { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -4, ArrowDown: 4 }
    const delta = step[e.key]
    if (delta === undefined) return
    e.preventDefault()
    focusPending.current = true
    if (view === 'day') {
      // 用 d + delta 換算成實際日期，跨月自動換月
      const idx = new Date(viewYear, viewMonth - 1, rovingDay + delta)
      const ny = idx.getFullYear(), nm = idx.getMonth() + 1, nd = idx.getDate()
      if (!inRange(toIso(ny, nm, nd), min, max)) return
      setViewYear(ny)
      setViewMonth(nm)
      setCursor(nd)
    } else if (view === 'month') {
      const n = rovingMonth + delta
      if (n >= 1 && n <= 12 && monthEnabled(n)) setCursor(n)
    } else {
      const n = rovingYear + delta
      if (years.includes(n) && yearEnabled(n)) setCursor(n)
    }
  }

  // 翻頁：年畫面 ±12 年、月畫面 ±1 年、日畫面 ±1 月
  const prevMonth = shiftMonth(viewYear, viewMonth, -1)
  const nextMonth = shiftMonth(viewYear, viewMonth, 1)
  const prevDisabled = view === 'day'
    ? !monthInRange(prevMonth.y, prevMonth.m, min, max)
    : view === 'month' ? viewYear - 1 < minP.y : pageStart - 1 < minP.y
  const nextDisabled = view === 'day'
    ? !monthInRange(nextMonth.y, nextMonth.m, min, max)
    : view === 'month' ? viewYear + 1 > maxP.y : pageStart + 12 > maxP.y
  const flip = (dir: -1 | 1) => {
    setCursor(null)
    if (view === 'day') {
      const n = dir < 0 ? prevMonth : nextMonth
      setViewYear(n.y)
      setViewMonth(n.m)
    } else if (view === 'month') setViewYear(viewYear + dir)
    else setPageStart(pageStart + dir * 12)
  }

  const pickDay = (d: number) => {
    onChange(toIso(viewYear, viewMonth, d))
    close(true)
  }

  const lead = firstWeekday(viewYear, viewMonth)

  return (
    <div
      className="ml-dp"
      ref={wrapRef}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) { e.stopPropagation(); close(true) }
      }}
    >
      <button
        type="button"
        ref={fieldRef}
        className="ml-dp-field"
        data-testid={testid}
        data-value={value}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? close(false) : openPanel())}
      >
        <span className={value ? 'ml-dp-text' : 'ml-dp-text ml-dp-empty'}>{value ? formatDisplay(value) : '選擇日期'}</span>
        <CalendarIcon />
      </button>

      {open && (
        <div className="ml-dp-panel" role="dialog" aria-label={label} data-testid="ml-dp-panel" data-view={view} ref={panelRef}>
          <div className="ml-dp-head">
            <button type="button" className="ml-dp-nav" data-testid="ml-dp-prev" aria-label="上一頁" disabled={prevDisabled} onClick={() => flip(-1)}>
              <Chevron dir="l" />
            </button>
            <div className="ml-dp-title">
              {view === 'year' && <span data-testid="ml-dp-title">{`${pageStart} – ${pageStart + 11}`}</span>}
              {view !== 'year' && (
                <button type="button" className="ml-dp-tbtn" data-testid="ml-dp-year" onClick={() => goView('year')}>
                  {viewYear} 年
                </button>
              )}
              {view === 'day' && (
                <button type="button" className="ml-dp-tbtn" data-testid="ml-dp-month" onClick={() => goView('month')}>
                  {viewMonth} 月
                </button>
              )}
            </div>
            <button type="button" className="ml-dp-nav" data-testid="ml-dp-next" aria-label="下一頁" disabled={nextDisabled} onClick={() => flip(1)}>
              <Chevron dir="r" />
            </button>
          </div>

          {view === 'year' && (
            <div className="ml-dp-grid ml-dp-grid4" onKeyDown={onGridKey}>
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  className="ml-dp-cell"
                  data-testid={`ml-dp-y-${y}`}
                  aria-label={`${y} 年`}
                  aria-pressed={sel?.y === y}
                  disabled={!yearEnabled(y)}
                  tabIndex={y === rovingYear ? 0 : -1}
                  data-roving={y === rovingYear}
                  onClick={() => {
                    setViewYear(y)
                    goView('month')
                  }}
                >
                  {y}
                </button>
              ))}
            </div>
          )}

          {view === 'month' && (
            <div className="ml-dp-grid ml-dp-grid4" onKeyDown={onGridKey}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <button
                  key={m}
                  type="button"
                  className="ml-dp-cell"
                  data-testid={`ml-dp-m-${m}`}
                  aria-label={`${viewYear} 年 ${m} 月`}
                  aria-pressed={sel?.y === viewYear && sel.m === m}
                  disabled={!monthEnabled(m)}
                  tabIndex={m === rovingMonth ? 0 : -1}
                  data-roving={m === rovingMonth}
                  onClick={() => {
                    setViewMonth(m)
                    goView('day')
                  }}
                >
                  {m} 月
                </button>
              ))}
            </div>
          )}

          {view === 'day' && (
            <>
              <div className="ml-dp-week" aria-hidden="true">
                {WEEK.map((w) => <span key={w}>{w}</span>)}
              </div>
              <div className="ml-dp-grid ml-dp-grid7" onKeyDown={onGridKey}>
                {Array.from({ length: lead }, (_, i) => <span key={`pad${i}`} aria-hidden="true" />)}
                {Array.from({ length: dayCount }, (_, i) => i + 1).map((d) => {
                  const iso = toIso(viewYear, viewMonth, d)
                  return (
                    <button
                      key={d}
                      type="button"
                      className={iso === todayIso ? 'ml-dp-cell ml-dp-today' : 'ml-dp-cell'}
                      data-testid={`ml-dp-d-${d}`}
                      aria-label={`${viewYear} 年 ${viewMonth} 月 ${d} 日`}
                      aria-pressed={iso === value}
                      disabled={!dayEnabled(d)}
                      tabIndex={d === rovingDay ? 0 : -1}
                      data-roving={d === rovingDay}
                      onClick={() => pickDay(d)}
                    >
                      {d}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          <div className="ml-dp-foot">
            <button
              type="button"
              className="ml-dp-clear"
              data-testid="ml-dp-clear"
              onClick={() => {
                onChange('')
                close(true)
              }}
            >
              清除
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
