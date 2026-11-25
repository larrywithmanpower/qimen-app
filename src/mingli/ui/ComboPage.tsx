// 梅花＋塔羅合併解讀：網址帶兩筆紀錄 id（m＝梅花、t＝塔羅），送 AI 合起來看；同一組合併過就直接顯示，不再扣額度
import { useEffect, useState } from 'react'
import './records.css'
import { clipQuestion, comboFacts, proxyUrl } from '../ai'
import { loadRecords, normQuestion } from '../storage/records'
import type { ReadingRecord } from '../storage/records'
import { AiHelpLine, AiLimitLine, AiLoading, AiReadingView, AiRefusalView } from './AiReadingView'
import { setRealm } from './fx'
import { useAiReading } from './useAiReading'
import { useSaveRecord } from './useSaveRecord'
import { comboContext } from './recordText'

type Loaded =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'ok'; m: ReadingRecord; t: ReadingRecord; done: ReadingRecord | null }

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
      if (!m || !t) {
        setLoaded({ status: 'missing' })
        return
      }
      const done = all.find((r) => r.kind === 'combo' && r.reading && r.sources?.[0] === m.id && r.sources?.[1] === t.id) ?? null
      setLoaded({ status: 'ok', m, t, done })
    })
    return () => { alive = false }
  }, [mId, tId])

  const pair = loaded.status === 'ok' ? loaded : null
  const facts = pair ? comboFacts(pair.m.facts, pair.t.facts) : null
  const context = pair ? comboContext(pair.m, pair.t) : undefined
  // 已經合併過的就不送；吉凶以梅花為主
  const ai = useAiReading(
    pair && !pair.done && facts ? { kind: 'combo', question: clipQuestion(pair.m.question), facts, tone: pair.m.tone, context } : null,
    `${mId}|${tId}`,
  )
  const savedId = useSaveRecord({
    kind: 'combo',
    key: pair && !pair.done ? `${mId}|${tId}` : null,
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
  })

  const reading = pair?.done?.reading ?? (ai.status === 'ok' ? ai.reading : null)

  return (
    <section className="ml-view ml-combo-page" data-testid="ml-combo-page" data-record={pair?.done?.id ?? savedId ?? ''}>
      <span className="ml-combo-sub">梅花＋塔羅・合併解讀</span>
      {loaded.status === 'missing' && (
        <div className="ml-combo-missing" data-testid="ml-combo-missing">
          <p>找不到這兩筆紀錄，可能已經刪掉了，或是在別台裝置算的（紀錄只存在算的那台裝置）。</p>
          <a className="ml-ghost" href="#/records">看我的紀錄</a>
        </div>
      )}
      {pair && (
        <>
          <h1 className="ml-combo-title" data-testid="ml-combo-question">{pair.m.question}</h1>
          <div className="ml-combo-sources">
            <a className="ml-combo-src" href="#/records" data-testid="ml-combo-src-m">
              <span className="ml-rec-tag">梅花</span>{pair.m.title}・{pair.m.level}
            </a>
            <a className="ml-combo-src" href="#/records" data-testid="ml-combo-src-t">
              <span className="ml-rec-tag">塔羅</span>{pair.t.title}
            </a>
          </div>
          {normQuestion(pair.m.question) !== normQuestion(pair.t.question) && (
            <p className="ml-combo-diff" data-testid="ml-combo-diff">塔羅那次問的是「{pair.t.question}」</p>
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
