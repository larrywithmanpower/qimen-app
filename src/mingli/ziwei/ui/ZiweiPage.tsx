import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import './ziwei.css'
import { setRealm } from '../../ui/fx'
import { clearBirth, loadBirth, saveBirth } from '../../storage/birth'
import type { Birth } from '../../storage/birth'
import { buildChart, candidates } from '../engine'
import type { Gender, ZiweiFacts } from '../engine'
import { palaceByBranch, palaceReadout } from './readout'

type Phase = 'loading' | 'form' | 'chart' | 'candidates'

// 時辰 0～12：早子、丑 … 亥、晚子
const TIMES = [
  ['早子', '0–1'], ['丑', '1–3'], ['寅', '3–5'], ['卯', '5–7'], ['辰', '7–9'], ['巳', '9–11'], ['午', '11–13'],
  ['未', '13–15'], ['申', '15–17'], ['酉', '17–19'], ['戌', '19–21'], ['亥', '21–23'], ['晚子', '23–24'],
] as const

// 宮格 4×4：外圈十二宮的地支位置 [列, 欄]
const CELL: Record<string, [number, number]> = {
  巳: [1, 1], 午: [1, 2], 未: [1, 3], 申: [1, 4],
  辰: [2, 1], 酉: [2, 4],
  卯: [3, 1], 戌: [3, 4],
  寅: [4, 1], 丑: [4, 2], 子: [4, 3], 亥: [4, 4],
}
const BRANCH_ORDER = Object.keys(CELL)

const yangStems = '甲丙戊庚壬'

const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const validDate = (s: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return y >= 1900 && dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d && s <= todayIso()
}

// 網址帶參數（測試用）：?d=1990-07-05&t=4&g=男，t 可為 unknown
function birthFromParams(params: URLSearchParams): Birth | null {
  const d = params.get('d')
  const t = params.get('t')
  const g = params.get('g')
  if (!d || !validDate(d) || (g !== '男' && g !== '女')) return null
  if (t === 'unknown') return { solarDate: d, timeIndex: null, gender: g }
  const n = t === null || t === '' ? NaN : Number(t)
  return Number.isInteger(n) && n >= 0 && n <= 12 ? { solarDate: d, timeIndex: n, gender: g } : null
}

const soulStars = (f: ZiweiFacts) => {
  const p = f.palaces.find((x) => x.isSoul)
  return p && p.majorStars.length ? p.majorStars.map((s) => s.name).join('、') : '空宮'
}

function LockIcon() {
  return (
    <svg className="ml-lock" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3M12 14.5v2.5" />
    </svg>
  )
}

function Chart({ facts, gender, sel, onSel }: { facts: ZiweiFacts; gender: Gender; sel: string; onSel: (b: string) => void }) {
  const yin = yangStems.includes(facts.chineseDate[0]) ? '陽' : '陰'
  return (
    <div className="ml-chart" data-testid="ml-chart" role="group" aria-label="紫微十二宮命盤">
      {BRANCH_ORDER.map((branch) => {
        const p = palaceByBranch(facts, branch)
        const [row, col] = CELL[branch]
        return (
          <button
            key={branch}
            type="button"
            className="ml-palace"
            data-testid="ml-palace"
            data-branch={branch}
            data-stars={p.majorStars.map((s) => s.name).join(',')}
            data-soul={p.isSoul}
            aria-pressed={sel === branch}
            aria-label={`${p.name} ${branch}宮 ${p.majorStars.length ? p.majorStars.map((s) => s.name).join('、') : '無主星'}`}
            style={{ gridRow: row, gridColumn: col } as CSSProperties}
            onClick={() => onSel(branch)}
          >
            <span className="ml-pa-stars">
              {p.majorStars.map((s) => (
                <span className="ml-pa-star" key={s.name}>
                  {s.name}
                  {s.mutagen && <span className="ml-pa-mut">{s.mutagen}</span>}
                </span>
              ))}
            </span>
            {p.minorStars.length > 0 && <span className="ml-pa-minor">{p.minorStars.slice(0, 2).join(' ')}</span>}
            <span className="ml-pa-foot">
              <span className="ml-pa-name">{p.name}{p.isBody ? '・身' : ''}</span>
              <span className="ml-pa-branch">{branch}</span>
            </span>
          </button>
        )
      })}
      <div className="ml-zcenter">
        <div className="ml-zc-title">{yin}{gender}・{facts.fiveElementsClass}</div>
        <div className="ml-zc-line" data-testid="ml-soul">命主 {facts.soul}・身主 {facts.body}</div>
        <div className="ml-zc-line">{facts.lunarDate.replace('闰', '閏')}</div>
      </div>
    </div>
  )
}

export default function ZiweiPage({ params, testid = 'ml-ziwei' }: { params: URLSearchParams; testid?: string }) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [birth, setBirth] = useState<Birth | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const [sel, setSel] = useState('')
  // 表單欄位
  const [dateStr, setDateStr] = useState('')
  const [timeIdx, setTimeIdx] = useState<number | 'unknown' | null>(null)
  const [gender, setGender] = useState<Gender | null>(null)

  const show = (b: Birth) => {
    setBirth(b)
    setPicked(null)
    if (b.timeIndex === null) {
      setPhase('candidates')
    } else {
      setSel(buildChart({ solarDate: b.solarDate, timeIndex: b.timeIndex, gender: b.gender }).soulBranch)
      setPhase('chart')
    }
  }

  useEffect(() => {
    setRealm('east')
    let alive = true
    const given = birthFromParams(params)
    if (given) {
      // 帶參數時只在畫面上用，不寫進儲存
      show(given)
    } else {
      loadBirth().then((b) => {
        if (!alive) return
        if (b) show(b)
        else setPhase('form')
      })
    }
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cands = useMemo(
    () => (phase === 'candidates' && birth ? candidates(birth.solarDate, birth.gender) : []),
    [phase, birth],
  )
  const timeIndex = birth ? (birth.timeIndex ?? picked) : null
  const facts = useMemo(
    () => (birth && timeIndex !== null ? buildChart({ solarDate: birth.solarDate, timeIndex, gender: birth.gender }) : null),
    [birth, timeIndex],
  )
  const detail = useMemo(() => (facts && sel ? palaceReadout(facts, sel) : null), [facts, sel])

  const canMake = validDate(dateStr) && timeIdx !== null && gender !== null
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canMake || timeIdx === null || gender === null) return
    const b: Birth = { solarDate: dateStr, timeIndex: timeIdx === 'unknown' ? null : timeIdx, gender }
    await saveBirth(b)
    show(b)
    window.scrollTo(0, 0)
  }

  const redo = () => {
    if (birth) {
      setDateStr(birth.solarDate)
      setTimeIdx(birth.timeIndex === null ? 'unknown' : birth.timeIndex)
      setGender(birth.gender)
    }
    setPicked(null)
    setPhase('form')
  }
  const clear = async () => {
    await clearBirth()
    setBirth(null)
    setPicked(null)
    setDateStr('')
    setTimeIdx(null)
    setGender(null)
    setPhase('form')
  }
  const pickCandidate = (i: number) => {
    setPicked(i)
    setSel(cands[i].soulBranch)
    window.scrollTo(0, 0)
  }

  if (phase === 'loading') return <section className="ml-view ml-ziwei" data-testid={testid} data-phase="loading" />

  const privacy = (
    <p className="ml-privacy" data-testid="ml-privacy-line"><LockIcon />生辰只存在這台裝置，不會上傳</p>
  )

  if (phase === 'form') {
    return (
      <section className="ml-view ml-ziwei" data-testid={testid} data-phase="form">
        <form className="ml-zform" data-testid="ml-birth-form" onSubmit={submit}>
          <div className="ml-zhead">
            <span className="ml-z-sub">紫微斗數・生辰</span>
            <h1 className="ml-z-title">你的生辰</h1>
          </div>
          <label className="ml-field">
            <span className="ml-field-k">出生日期（西曆）</span>
            <input
              data-testid="ml-birth-date"
              type="date"
              min="1900-01-01"
              max={todayIso()}
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
            />
          </label>
          <div className="ml-field" role="group" aria-label="出生時辰">
            <span className="ml-field-k">出生時辰</span>
            <div className="ml-pills">
              {TIMES.map(([name, range], i) => (
                <button
                  key={name}
                  type="button"
                  className="ml-pill"
                  data-testid={`ml-time-${i}`}
                  aria-pressed={timeIdx === i}
                  onClick={() => setTimeIdx(i)}
                >
                  <span className="ml-pill-name">{name}</span>
                  <span className="ml-pill-range">{range}</span>
                </button>
              ))}
              <button
                type="button"
                className="ml-pill ml-pill-wide"
                data-testid="ml-time-unknown"
                aria-pressed={timeIdx === 'unknown'}
                onClick={() => setTimeIdx('unknown')}
              >
                <span className="ml-pill-name">不知道</span>
              </button>
            </div>
          </div>
          <div className="ml-field" role="group" aria-label="性別">
            <span className="ml-field-k">性別</span>
            <div className="ml-pills ml-pills-gender">
              {(['男', '女'] as const).map((g) => (
                <button key={g} type="button" className="ml-pill" data-testid={`ml-gender-${g}`} aria-pressed={gender === g} onClick={() => setGender(g)}>
                  <span className="ml-pill-name">{g}</span>
                </button>
              ))}
            </div>
          </div>
          {privacy}
          <div className="ml-zactions">
            <button type="submit" className="ml-zcta" data-testid="ml-make-chart" disabled={!canMake}>排命盤</button>
          </div>
        </form>
      </section>
    )
  }

  if (phase === 'candidates' && picked === null) {
    return (
      <section className="ml-view ml-ziwei" data-testid={testid} data-phase="candidates">
        <div className="ml-zhead">
          <span className="ml-z-sub">紫微斗數・不知時辰</span>
          <h1 className="ml-z-title">13 張可能的命盤</h1>
          <p className="ml-z-hint">不知道時辰，先把每個時辰的命盤都排出來。點一張，看那個時辰的樣子。</p>
        </div>
        <div className="ml-cands">
          {cands.map((f, i) => (
            <button key={i} type="button" className="ml-cand" data-testid="ml-candidate" data-index={i} onClick={() => pickCandidate(i)}>
              <span className="ml-cand-t">{TIMES[i][0]}時<span className="ml-cand-r">{TIMES[i][1]}</span></span>
              <span className="ml-cand-s">命宮 {soulStars(f)}</span>
            </button>
          ))}
        </div>
        <div className="ml-zactions">
          <button type="button" className="ml-ghost" data-testid="ml-redo" onClick={redo}>重新輸入生辰</button>
          <button type="button" className="ml-ghost" data-testid="ml-clear-birth" onClick={clear}>清除這台裝置上的生辰</button>
        </div>
        {privacy}
      </section>
    )
  }

  // 命盤（已知時辰，或不知時辰但已選一張候選盤）
  return (
    <section className="ml-view ml-ziwei" data-testid={testid} data-phase="chart">
      {facts && birth && (
        <div className="ml-zchart-wrap">
          <div className="ml-zchart-main">
            <div className="ml-zhead ml-zhead-row">
              <div className="ml-zhead-left">
                <span className="ml-z-sub">紫微斗數・命盤{birth.timeIndex === null && picked !== null ? `・假設${TIMES[picked][0]}時` : ''}</span>
                <h1 className="ml-z-title">十二宮</h1>
              </div>
              <span className="ml-z-local">資料只存這台裝置</span>
            </div>
            <Chart facts={facts} gender={birth.gender} sel={sel} onSel={setSel} />
          </div>
          <div className="ml-zside">
            <p className="ml-z-hint ml-z-hint-top">資料只存這台裝置・點任一宮看說明</p>
            {detail && (
              <div className="ml-pdetail" data-testid="ml-palace-detail" data-branch={sel}>
                <div className="ml-pdetail-head">
                  <span className="ml-zseal" data-soul={palaceByBranch(facts, sel).isSoul} aria-hidden="true">{palaceByBranch(facts, sel).name[0]}</span>
                  <h2 className="ml-pdetail-title">{detail.title}</h2>
                </div>
                <div className="ml-pdetail-body">
                  {detail.sentences.map((s, k) => <p className="ml-pdetail-text" key={k}>{s}。</p>)}
                </div>
                <span className="ml-zbasis" data-testid="ml-basis">依據：{detail.basis}</span>
                <p className="ml-znote">範例說明，正式版由 AI 依星曜規則卡撰寫</p>
              </div>
            )}
            <p className="ml-z-hint ml-z-hint-bottom">點任一宮看說明</p>
            <div className="ml-zactions ml-zactions-start">
              {birth.timeIndex === null && (
                <button type="button" className="ml-ghost" data-testid="ml-back-candidates" onClick={() => setPicked(null)}>回到候選清單</button>
              )}
              <button type="button" className="ml-ghost" data-testid="ml-redo" onClick={redo}>重新輸入生辰</button>
              <button type="button" className="ml-ghost" data-testid="ml-clear-birth" onClick={clear}>清除這台裝置上的生辰</button>
            </div>
            {privacy}
          </div>
        </div>
      )}
    </section>
  )
}
