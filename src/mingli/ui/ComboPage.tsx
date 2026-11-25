// 梅花＋塔羅合併解讀：網址帶兩筆紀錄 id（m＝梅花、t＝塔羅），送 AI 合起來看；同一組合併過就直接顯示，不再扣額度
import { useEffect, useState } from 'react'
import './records.css'
import { clipQuestion, comboFacts, proxyUrl } from '../ai'
import { isComboInfo, loadRecords, normQuestion } from '../storage/records'
import type { ComboInfo, ReadingRecord } from '../storage/records'
import { AiHelpLine, AiLimitLine, AiLoading, AiReadingView, AiRefusalView } from './AiReadingView'
import { setRealm } from './fx'
import { useAiReading } from './useAiReading'
import { useSaveRecord } from './useSaveRecord'
import { comboContext } from './recordText'

type Loaded =
  | { status: 'loading' }
  | { status: 'missing' }
  // done＝合併過的那筆；有它就算來源紀錄刪掉了也照樣顯示。沒有 done 時 m、t 一定都在
  | { status: 'ok'; m?: ReadingRecord; t?: ReadingRecord; done: ReadingRecord | null }

export default function ComboPage({ params }: { params: URLSearchParams }) {
  const mId = params.get('m') ?? ''
  const tId = params.get('t') ?? ''
  const [loaded, setLoaded] = useState<Loaded>({ status: 'loading' })

  useEffect(() => { setRealm('east') }, [])
  useEffect(() => {
    let alive = true
    loadRecords().then((all) => {
      if (!alive) return
      const m = all.find((r) => r.id === mId && r.kind === 'meihua')
      const t = all.find((r) => r.id === tId && r.kind === 'tarot')
      const done = all.find((r) => r.kind === 'combo' && r.reading && r.sources?.[0] === mId && r.sources?.[1] === tId) ?? null
      setLoaded(done || (m && t) ? { status: 'ok', m, t, done } : { status: 'missing' })
    })
    return () => { alive = false }
  }, [mId, tId])

  const ok = loaded.status === 'ok' ? loaded : null
  // 還沒合併過、兩筆來源都在：這次要送 AI
  const pair = ok && !ok.done && ok.m && ok.t ? { m: ok.m, t: ok.t } : null
  const facts = pair ? comboFacts(pair.m.facts, pair.t.facts) : null
  const context = pair ? comboContext(pair.m, pair.t) : undefined
  const pairInfo = (m: ReadingRecord, t: ReadingRecord): ComboInfo => ({ meihuaTitle: m.title, meihuaLevel: m.level, tarotTitle: t.title, tarotQuestion: t.question })
  // 已經合併過的就不送；吉凶以梅花為主
  const ai = useAiReading(
    pair && facts ? { kind: 'combo', question: clipQuestion(pair.m.question), facts, tone: pair.m.tone, context } : null,
    `${mId}|${tId}`,
  )
  const savedId = useSaveRecord({
    kind: 'combo',
    key: pair ? `${mId}|${tId}` : null,
    ready: ai.status === 'ok',
    question: pair?.m.question ?? '',
    context,
    title: pair ? `${pair.m.title}｜${pair.t.title}` : '',
    level: pair?.m.level ?? '',
    tone: pair?.m.tone ?? '平',
    facts,
    reading: ai.status === 'ok' ? ai.reading : null,
    verdict: '',
    followups: [],
    sources: pair ? [pair.m.id, pair.t.id] : undefined,
    combo: pair ? pairInfo(pair.m, pair.t) : undefined,
  })

  const reading = ok?.done?.reading ?? (ai.status === 'ok' ? ai.reading : null)
  // 標題列：合併紀錄有存就用存的（來源刪掉也一樣）→ 兩筆來源都在就用來源 → 舊版合併紀錄（2026-11-25 前沒有 combo 欄位）從「梅花｜塔羅」標題拆
  const legacy = (d: ReadingRecord): ComboInfo => {
    const [meihuaTitle = '', tarotTitle = ''] = d.title.split('｜')
    return { meihuaTitle, meihuaLevel: d.level, tarotTitle, tarotQuestion: d.question }
  }
  const done = ok?.done
  const info = done && isComboInfo(done.combo) ? done.combo : ok?.m && ok.t ? pairInfo(ok.m, ok.t) : done ? legacy(done) : null
  const question = done?.question ?? pair?.m.question ?? ''

  return (
    <section className="ml-view ml-combo-page" data-testid="ml-combo-page" data-record={ok?.done?.id ?? savedId ?? ''}>
      <span className="ml-combo-sub">梅花＋塔羅・合併解讀</span>
      {loaded.status === 'missing' && (
        <div className="ml-combo-missing" data-testid="ml-combo-missing">
          <p>找不到這兩筆紀錄，可能已經刪掉了，或是在別台裝置算的（紀錄只存在算的那台裝置）。</p>
          <a className="ml-ghost" href="#/records">看我的紀錄</a>
        </div>
      )}
      {ok && (
        <>
          <h1 className="ml-combo-title" data-testid="ml-combo-question">{question}</h1>
          <div className="ml-combo-sources">
            <a className="ml-combo-src" href="#/records" data-testid="ml-combo-src-m">
              <span className="ml-rec-tag">梅花</span>{info?.meihuaTitle}・{info?.meihuaLevel}
            </a>
            <a className="ml-combo-src" href="#/records" data-testid="ml-combo-src-t">
              <span className="ml-rec-tag">塔羅</span>{info?.tarotTitle}
            </a>
          </div>
          {info && normQuestion(question) !== normQuestion(info.tarotQuestion) && (
            <p className="ml-combo-diff" data-testid="ml-combo-diff">塔羅那次問的是「{info.tarotQuestion}」</p>
          )}
          {reading && <AiReadingView reading={reading} />}
          {!reading && proxyUrl() === '' && <p className="ml-ai-help" data-testid="ml-combo-noai">合併解讀要用 AI，這個環境沒有接 AI。</p>}
          {!reading && ai.status === 'loading' && <AiLoading />}
          {!reading && ai.status === 'refused' && <AiRefusalView refusal={ai.refusal} />}
          {!reading && ai.status === 'fail' && (
            <>
              {ai.limited ? <AiLimitLine /> : <p className="ml-ai-help" data-testid="ml-combo-fail">合併解讀暫時沒辦法完成，稍後重新整理再試一次。</p>}
              <AiHelpLine />
            </>
          )}
        </>
      )}
    </section>
  )
}
