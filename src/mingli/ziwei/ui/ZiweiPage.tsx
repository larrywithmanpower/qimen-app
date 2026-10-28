import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import './ziwei.css'
import { setRealm } from '../../ui/fx'
import { clipQuestion, proxyUrl, ziweiFacts } from '../../ai'
import { AiHelpLine, AiLoading, AiReadingView, AiRefusalView } from '../../ui/AiReadingView'
import { useAiReading } from '../../ui/useAiReading'
import { session, updateSession } from '../../ui/session'
import { MAX_QUESTION_LEN } from '../../ui/QuestionBar'
import DatePicker from '../../ui/DatePicker'
import { clearBirth, loadBirth, saveBirth } from '../../storage/birth'
import type { Birth } from '../../storage/birth'
import { buildChart, candidates, horoscope, sortMinorStars } from '../engine'
import type { Gender, HoroscopeFacts, HoroscopeLayer, HoroscopeLayerKey, ZiweiFacts, ZiweiPalace, ZiweiStar } from '../engine'
import { BRANCHES, palaceByBranch, palaceReadout, periodReadout, periodWord } from './readout'
import type { LayerChoice } from './readout'

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

// 分層按鈕：白話名稱＋括號內原名（小限不放按鈕）
const LAYER_CHOICES: LayerChoice[] = ['natal', 'decadal', 'yearly', 'monthly', 'daily']
const LAYER_ORIG: Record<LayerChoice, string> = { natal: '本命', decadal: '大限', yearly: '流年', monthly: '流月', daily: '流日' }
const LAYER_PREFIX: Record<HoroscopeLayerKey, string> = { decadal: '大', age: '小', yearly: '年', monthly: '月', daily: '日' }

// 某宮的三方四正：對宮與左右三合
const surroundOf = (branch: string): string[] => {
  const i = BRANCHES.indexOf(branch as (typeof BRANCHES)[number])
  return [4, 6, 8].map((n) => BRANCHES[(i + n) % 12])
}

const starText = (s: ZiweiStar) => `${s.name}${s.brightness ?? ''}${s.mutagen ? `化${s.mutagen}` : ''}`

function Chart({ facts, gender, sel, onSel, layer, hs }: {
  facts: ZiweiFacts; gender: Gender; sel: string; onSel: (b: string) => void; layer: LayerChoice; hs: HoroscopeFacts | null
}) {
  const yin = yangStems.includes(facts.chineseDate[0]) ? '陽' : '陰'
  const L: HoroscopeLayer | null = hs && layer !== 'natal' ? hs[layer] : null
  const around = sel ? surroundOf(sel) : []
  return (
    <div className="ml-chart" data-testid="ml-chart" data-layer={layer} role="group" aria-label="紫微十二宮命盤">
      {BRANCH_ORDER.map((branch) => {
        const p = palaceByBranch(facts, branch)
        const [row, col] = CELL[branch]
        const lmuts = L ? L.mutagens.filter((m) => m.branch === branch) : []
        const lstars = L ? L.stars[branch] ?? [] : []
        return (
          <button
            key={branch}
            type="button"
            className="ml-palace"
            data-testid="ml-palace"
            data-branch={branch}
            data-stars={p.majorStars.map((s) => s.name).join(',')}
            data-soul={p.isSoul}
            data-origin={p.isOriginal}
            data-layer-soul={L ? L.soulBranch === branch : undefined}
            data-layer-key={L ? layer : undefined}
            data-surround={around.includes(branch)}
            aria-pressed={sel === branch}
            aria-label={`${p.name} ${branch}宮 ${p.majorStars.length ? p.majorStars.map((s) => s.name).join('、') : '無主星'}${L ? ` ${L.palaceNames[branch]}` : ''}`}
            style={{ gridRow: row, gridColumn: col } as CSSProperties}
            onClick={() => onSel(branch)}
          >
            {L && <span className="ml-pa-over" data-testid="ml-pa-over" data-layer={layer}>{L.palaceNames[branch]}</span>}
            <span className="ml-pa-stars">
              {p.majorStars.map((s) => (
                <span className="ml-pa-star" key={s.name}>
                  {s.name}
                  {s.brightness && <span className="ml-pa-br">{s.brightness}</span>}
                  {s.mutagen && <span className="ml-pa-mut">{s.mutagen}</span>}
                </span>
              ))}
            </span>
            {p.minorStars.length > 0 && (
              <span className="ml-pa-minor">
                {sortMinorStars(p.minorStars).slice(0, 2).map((s) => (
                  <span key={s.name}>
                    {s.name}
                    {s.mutagen && <span className="ml-pa-mut">{s.mutagen}</span>}
                    {' '}
                  </span>
                ))}
              </span>
            )}
            {lmuts.length > 0 && (
              <span className="ml-pa-lmuts">
                {lmuts.map((m) => (
                  <span className="ml-pa-lmut" data-layer={layer} data-testid="ml-pa-lmut" key={m.star}>{m.star}{LAYER_PREFIX[layer as HoroscopeLayerKey]}{m.mutagen}</span>
                ))}
              </span>
            )}
            {lstars.length > 0 && <span className="ml-pa-micro ml-pa-lstars" data-layer={layer}>{lstars.slice(0, 3).join(' ')}</span>}
            {p.adjectiveStars.length > 0 && <span className="ml-pa-micro">{p.adjectiveStars.slice(0, 2).join(' ')}</span>}
            <span className="ml-pa-micro">
              {layer === 'yearly' && L?.suiqian && L.jiangqian
                ? `${L.suiqian[branch]} ${L.jiangqian[branch]}`
                : `${p.changsheng12} ${p.boshi12}`}
            </span>
            <span className="ml-pa-foot">
              <span className="ml-pa-name">{p.name}</span>
              <span className="ml-pa-branch">{p.stem}{branch}</span>
            </span>
            {/* 身宮、來因宮標在大限這行右邊，不擠宮名那行 */}
            <span className="ml-pa-micro ml-pa-dec">
              <span>{p.decadalRange[0]}–{p.decadalRange[1]}</span>
              {(p.isBody || p.isOriginal) && (
                <span className="ml-pa-tags">
                  {p.isBody && <span className="ml-pa-tag">身</span>}
                  {p.isOriginal && <span className="ml-pa-tag">因</span>}
                </span>
              )}
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

// 點宮後的完整清單：格子放不下的全列在這裡
function FullList({ p, facts, L, word }: { p: ZiweiPalace; facts: ZiweiFacts; L: HoroscopeLayer | null; word: string }) {
  const around = surroundOf(p.branch)
  const nameAt = (b: string) => `${palaceByBranch(facts, b).name}（${b}）`
  const rows: [string, string][] = [
    ['宮位', `${p.stem}${p.branch}・${p.name}${p.isBody ? '・身宮' : ''}${p.isSoul ? '・命宮' : ''}${p.isOriginal ? '・來因宮' : ''}`],
    ['主星', p.majorStars.length ? p.majorStars.map(starText).join('、') : '無主星'],
    ['輔星', p.minorStars.length ? sortMinorStars(p.minorStars).map(starText).join('、') : '無'],
    ['雜曜', p.adjectiveStars.length ? p.adjectiveStars.join('、') : '無'],
    ['長生十二', p.changsheng12],
    ['博士十二', p.boshi12],
    ['大限', `${p.decadalRange[0]}–${p.decadalRange[1]} 歲`],
    ['小限歲數', p.ages.join('、')],
    ['三方四正', `對宮 ${nameAt(around[1])}；三合 ${nameAt(around[0])}、${nameAt(around[2])}`],
  ]
  if (L) {
    rows.push([`${word}宮名`, L.palaceNames[p.branch]])
    const lm = L.mutagens.filter((m) => m.branch === p.branch)
    rows.push([`${word}四化`, lm.length ? lm.map((m) => `${m.star}化${m.mutagen}`).join('、') : '無'])
    rows.push([`${word}星`, (L.stars[p.branch] ?? []).join('、') || '無'])
    if (L.suiqian && L.jiangqian) {
      rows.push(['流年歲前', L.suiqian[p.branch]])
      rows.push(['流年將前', L.jiangqian[p.branch]])
    }
  }
  return (
    <dl className="ml-pfull" data-testid="ml-palace-full">
      {rows.map(([k, v]) => (
        <div className="ml-pfull-row" key={k}>
          <dt className="ml-pfull-k">{k}</dt>
          <dd className="ml-pfull-v">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

export default function ZiweiPage({ params, testid = 'ml-ziwei' }: { params: URLSearchParams; testid?: string }) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [birth, setBirth] = useState<Birth | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const [sel, setSel] = useState('')
  // 運限：查詢日（預設今天）與目前看哪一層
  const [layer, setLayer] = useState<LayerChoice>('natal')
  const [queryDate, setQueryDate] = useState(todayIso)
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
  // AI 解讀整張命盤：紫微沒有吉凶，tone 固定送「平」；生辰不送，只送排好的盤
  const hs = useMemo(
    () => (birth && timeIndex !== null ? horoscope({ solarDate: birth.solarDate, timeIndex, gender: birth.gender }, queryDate) : null),
    [birth, timeIndex, queryDate],
  )
  // 想問的事（選填）：預設帶別頁問過的，畫面看得到、可改可清；只影響 AI，留空就看整體運勢
  const [ask, setAsk] = useState(session.question)
  const changeAsk = (v: string) => {
    setAsk(v)
    updateSession({ question: v })
  }
  const aiFacts = useMemo(() => (facts ? ziweiFacts(facts, hs ?? undefined, layer) : null), [facts, hs, layer])
  // 今天以外的日期，按鈕與說明改用「那一年」這類說法
  const isToday = queryDate === todayIso()
  const word = (k: LayerChoice) => periodWord(k, isToday)
  // 問題也算進 key：改了問題，已顯示的解讀就清掉、回到按鈕狀態
  const chartKey = aiFacts ? JSON.stringify([ask.trim(), aiFacts]) : ''
  // 按鈕才呼叫：asked[盤] 是這張盤按過幾次（重試會加一）；換盤後沒按過，自然回到按鈕狀態
  const [asked, setAsked] = useState<Record<string, number>>({})
  const askedN = asked[chartKey]
  const ai = useAiReading(
    aiFacts && askedN !== undefined
      ? { kind: 'ziwei', question: clipQuestion(ask.trim()), facts: aiFacts, tone: '平', focus: layer }
      : null,
    `${chartKey}#${askedN ?? 0}`,
  )
  const canAsk = proxyUrl() !== ''
  const detail = useMemo(() => {
    if (!facts || !sel) return null
    if (layer === 'natal' || !hs) return palaceReadout(facts, sel)
    return periodReadout(facts, sel, { key: layer, word: periodWord(layer, isToday), L: hs[layer] })
  }, [facts, sel, layer, hs, isToday])

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
          <div className="ml-field">
            <span className="ml-field-k">出生日期（西曆）</span>
            <DatePicker testid="ml-birth-date" min="1900-01-01" max={todayIso()} value={dateStr} onChange={setDateStr} />
          </div>
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
            {timeIdx === 12 && <p className="ml-z-hint" data-testid="ml-latezi-note">23 點後出生依晚子時算隔天</p>}
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
            <div className="ml-zlayers" data-testid="ml-layerbar">
              <div className="ml-zdate">
                <span className="ml-field-k">想看哪一天的運勢</span>
                <DatePicker testid="ml-query-date" label="選擇查詢日期" min="1900-01-01" max="2100-12-31" value={queryDate} onChange={(v) => setQueryDate(v || todayIso())} />
              </div>
              <div className="ml-zlayer-pills" role="group" aria-label="運限分層">
                {LAYER_CHOICES.map((k) => (
                  <button key={k} type="button" className="ml-zlayer" data-testid={`ml-layer-${k}`} data-layer={k} aria-pressed={layer === k} onClick={() => setLayer(k)}>
                    <span className="ml-zlayer-w">{word(k)}</span>
                    <span className="ml-zlayer-o">（{LAYER_ORIG[k]}）</span>
                  </button>
                ))}
              </div>
              <p className="ml-zlayer-hint" data-testid="ml-layer-hint" data-layer={layer}>
                {layer === 'natal'
                  ? '選「一生」，看這張命盤本來的樣子；選其他按鈕，盤上會標出那段時間的重心落在哪一宮'
                  : `選「${word(layer)}」，盤上會標出${word(layer)}的重心落在哪一宮`}
              </p>
              {hs && layer !== 'natal' && (
                <p className="ml-zlayer-info" data-testid="ml-layer-info" data-layer={layer} data-soul={hs[layer].soulBranch}>
                  {word(layer)}（{LAYER_ORIG[layer]}・{hs[layer].stem}{hs[layer].branch}）的重心在{hs[layer].soulBranch}宮・農曆{hs.lunar.year}年{hs.lunar.month}月{hs.lunar.day}日・虛歲 {hs.nominalAge}
                  {layer === 'decadal' && hs.isChildhood ? '（童限）' : ''}
                </p>
              )}
            </div>
            <Chart facts={facts} gender={birth.gender} sel={sel} onSel={setSel} layer={layer} hs={hs} />
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
                <FullList p={palaceByBranch(facts, sel)} facts={facts} L={hs && layer !== 'natal' ? hs[layer] : null} word={word(layer)} />
                <span className="ml-zbasis" data-testid="ml-basis">依據：{detail.basis}</span>
                <p className="ml-znote">範例說明，正式版由 AI 依星曜規則卡撰寫</p>
              </div>
            )}
            {ai.status === 'loading' && <AiLoading />}
            {ai.status === 'ok' && <AiReadingView reading={ai.reading} />}
            {ai.status === 'refused' && <AiRefusalView refusal={ai.refusal} />}
            {canAsk && (
              <label className="ml-zask">
                <span className="ml-field-k">想問的事（選填）</span>
                <span className="ml-zask-row">
                  <input
                    className="ml-zask-input"
                    data-testid="ml-ziwei-question"
                    placeholder="例：今年適合換工作嗎？留空就看整體運勢"
                    maxLength={MAX_QUESTION_LEN}
                    autoComplete="off"
                    value={ask}
                    onChange={(e) => changeAsk(e.target.value)}
                  />
                  {ask !== '' && (
                    <button type="button" className="ml-ghost ml-zask-clear" data-testid="ml-ziwei-question-clear" onClick={() => changeAsk('')}>清除</button>
                  )}
                </span>
              </label>
            )}
            {canAsk && ai.status !== 'ok' && ai.status !== 'refused' && (
              <>
                {ai.status === 'fail' && <p className="ml-z-hint" data-testid="ml-ai-error" role="status">AI 暫時無法解讀，稍後再試</p>}
                {ai.status === 'fail' && <AiHelpLine />}
                <button
                  type="button"
                  className="ml-ghost"
                  data-testid="ml-ai-ziwei-btn"
                  disabled={ai.status === 'loading'}
                  onClick={() => setAsked((cur) => ({ ...cur, [chartKey]: (cur[chartKey] ?? 0) + 1 }))}
                >
                  AI 解讀這張盤
                </button>
              </>
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
