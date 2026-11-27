// 準度：AI 解讀附的預測到期後回來對答案（中／沒中／說不準），分術數、分題目類型算命中率；只存在這台裝置
import { useEffect, useState } from 'react'
import './records.css'
import './accuracy.css'
import { loadRecords, setOutcome } from '../storage/records'
import type { OutcomeResult, ReadingRecord, RecordKind } from '../storage/records'
import { accuracyStats, answeredList, dueList, MIN_JUDGED, pendingList, TOPICS } from '../storage/accuracy'
import type { Tally, Tracked } from '../storage/accuracy'
import { taiwanDate } from './dateMath'
import { setRealm } from './fx'
import { KIND_NAME } from './recordText'

const RESULT_NAME: Record<OutcomeResult, string> = { hit: '中', miss: '沒中', unsure: '說不準' }
const KINDS: RecordKind[] = ['meihua', 'tarot', 'combo']
const shortDate = (iso: string) => { const [, m, d] = iso.split('-').map(Number); return `${m}/${d}` }

function DueItem({ t, onAnswer }: { t: Tracked; onAnswer: (id: string, r: OutcomeResult) => void }) {
  return (
    <li className="ml-acc-item" data-testid="ml-acc-due" data-id={t.rec.id}>
      <span className="ml-acc-meta"><span className="ml-rec-tag">{KIND_NAME[t.rec.kind]}</span>{shortDate(t.prediction.dueDate)} 到期</span>
      <span className="ml-acc-q">{t.rec.question}</span>
      <span className="ml-acc-claim" data-testid="ml-acc-claim">預測：{t.prediction.claim}</span>
      <span className="ml-acc-btns" role="group" aria-label="這個預測準不準">
        {(['hit', 'miss', 'unsure'] as const).map((r) => (
          <button key={r} type="button" className="ml-ghost ml-acc-btn" data-testid={`ml-acc-${r}`} onClick={() => onAnswer(t.rec.id, r)}>{RESULT_NAME[r]}</button>
        ))}
      </span>
    </li>
  )
}

function Rate({ t }: { t: Tally }) {
  return t.rate === null
    ? <span className="ml-acc-wait">{t.judged === 0 ? '還沒有' : `還差 ${MIN_JUDGED - t.judged} 筆`}</span>
    : <span className="ml-acc-pct">{t.rate}%</span>
}

function StatRows({ title, rows, testid }: { title: string; rows: [string, Tally][]; testid: string }) {
  return (
    <div className="ml-acc-table" data-testid={testid}>
      <h3 className="ml-acc-sub">{title}</h3>
      <ul className="ml-acc-rows">
        {rows.map(([name, t]) => (
          <li className="ml-acc-row" key={name} data-testid="ml-acc-row" data-name={name} data-rate={t.rate ?? ''}>
            <span className="ml-acc-name">{name}</span>
            <span className="ml-acc-nums">中 {t.hit}・沒中 {t.miss}・說不準 {t.unsure}</span>
            <Rate t={t} />
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function AccuracyPage() {
  const [list, setList] = useState<ReadingRecord[] | null>(null)
  const today = taiwanDate()

  useEffect(() => { setRealm('east') }, [])
  useEffect(() => {
    let alive = true
    loadRecords().then((v) => { if (alive) setList(v) })
    return () => { alive = false }
  }, [])

  const answer = async (id: string, r: OutcomeResult) => {
    await setOutcome(id, r)
    setList(await loadRecords())
  }

  const due = list ? dueList(list, today) : []
  const pending = list ? pendingList(list, today) : []
  const answered = list ? answeredList(list) : []
  const stats = list ? accuracyStats(list) : null
  const empty = list !== null && due.length + pending.length + answered.length === 0

  return (
    <section className="ml-view ml-acc" data-testid="ml-accuracy">
      <h1 className="ml-page-title">準度</h1>
      <p className="ml-acc-lead">AI 解讀會附一句之後對得起來的預測。到期後回來勾「中、沒中、說不準」，這裡幫你算每種算法準不準。紀錄只存在這台裝置。</p>

      {empty && (
        <div className="ml-acc-empty" data-testid="ml-acc-empty">
          <p>還沒有可以對答案的預測。用梅花或塔羅問一件事，AI 解讀完會附一句預測，到期就會出現在這裡。</p>
          <p>範例解讀（沒接上 AI 時）沒有預測，不會列進來。</p>
          <span className="ml-acc-go"><a className="ml-ghost ml-acc-golink" href="#/meihua">用梅花問</a><a className="ml-ghost ml-acc-golink" href="#/tarot">用塔羅問</a></span>
        </div>
      )}

      {due.length > 0 && (
        <div className="ml-acc-block">
          <h2 className="ml-acc-h">到期了，準不準？</h2>
          <ul className="ml-acc-list">{due.map((t) => <DueItem key={t.rec.id} t={t} onAnswer={answer} />)}</ul>
        </div>
      )}

      {stats && answered.length > 0 && (
        <div className="ml-acc-block" data-testid="ml-acc-stats">
          <h2 className="ml-acc-h">命中率</h2>
          <p className="ml-acc-total" data-testid="ml-acc-total">
            全部 <Rate t={stats.all} />
            <span className="ml-acc-nums">中 {stats.all.hit}・沒中 {stats.all.miss}・說不準 {stats.all.unsure}</span>
          </p>
          <p className="ml-acc-rule">中＋沒中滿 {MIN_JUDGED} 筆才算百分比；「說不準」不算進去。</p>
          <StatRows title="分算法" testid="ml-acc-bykind" rows={KINDS.map((k) => [KIND_NAME[k], stats.byKind[k]])} />
          <StatRows title="分題目類型" testid="ml-acc-bytopic" rows={TOPICS.map((k) => [k, stats.byTopic[k]])} />
        </div>
      )}

      {pending.length > 0 && (
        <div className="ml-acc-block">
          <h2 className="ml-acc-h">還沒到期</h2>
          <ul className="ml-acc-list">
            {pending.map((t) => (
              <li className="ml-acc-item" key={t.rec.id} data-testid="ml-acc-pending">
                <span className="ml-acc-meta"><span className="ml-rec-tag">{KIND_NAME[t.rec.kind]}</span>{shortDate(t.prediction.dueDate)} 到期</span>
                <span className="ml-acc-q">{t.rec.question}</span>
                <span className="ml-acc-claim">預測：{t.prediction.claim}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {answered.length > 0 && (
        <details className="ml-acc-block ml-acc-done" data-testid="ml-acc-done">
          <summary className="ml-acc-h ml-acc-donesum">對過的（{answered.length} 筆）</summary>
          <ul className="ml-acc-list">
            {answered.map((t) => (
              <li className="ml-acc-item" key={t.rec.id} data-testid="ml-acc-answered" data-result={t.rec.outcome?.result}>
                <span className="ml-acc-meta"><span className="ml-rec-tag">{KIND_NAME[t.rec.kind]}</span>{RESULT_NAME[t.rec.outcome!.result]}</span>
                <span className="ml-acc-q">{t.rec.question}</span>
                <span className="ml-acc-claim">預測：{t.prediction.claim}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
