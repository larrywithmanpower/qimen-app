// 我的紀錄：梅花、塔羅、合併解讀，新的在前；只存在這台裝置，可單筆刪、全部刪
import { useEffect, useState } from 'react'
import './records.css'
import { proxyUrl } from '../ai'
import { clearRecords, deleteRecord, loadRecords, RECORDS_MAX, TRACKED_MAX } from '../storage/records'
import type { ReadingRecord } from '../storage/records'
import { AiReadingView } from './AiReadingView'
import ComboPicker from './ComboPicker'
import { comboPathOf, KIND_NAME, shortTime } from './recordText'
import { setRealm } from './fx'
import { predictionOf } from '../storage/accuracy'

const OUTCOME_NAME = { hit: '中', miss: '沒中', unsure: '說不準' } as const

function RecordItem({ rec, onDelete }: { rec: ReadingRecord; onDelete: (id: string) => void }) {
  const [confirm, setConfirm] = useState(false)
  const followups = rec.followups.filter((e) => e.type === 'followup')
  const prediction = predictionOf(rec)
  return (
    <li className="ml-rec" data-testid="ml-rec" data-kind={rec.kind}>
      <details className="ml-rec-box">
        <summary className="ml-rec-sum">
          <span className="ml-rec-meta">
            <span className="ml-rec-tag">{KIND_NAME[rec.kind]}</span>
            <span>{shortTime(rec.at)}</span>
            {rec.level && <span>{rec.level}</span>}
          </span>
          <span className="ml-rec-q" data-testid="ml-rec-q">{rec.question}</span>
          <span className="ml-rec-title">{rec.title}</span>
          <span className="ml-rec-verdict" data-testid="ml-rec-verdict">{rec.verdict}</span>
        </summary>
        <div className="ml-rec-body">
          {rec.reading ? <AiReadingView reading={rec.reading} /> : <p className="ml-rec-note">這筆沒有 AI 解讀，只留下範例解讀的一句話。</p>}
          {prediction && (
            <p className="ml-rec-note" data-testid="ml-rec-prediction">
              可以對答案的預測：{prediction.claim}（{prediction.dueDate} 到期{rec.outcome ? `・已對：${OUTCOME_NAME[rec.outcome.result]}` : ''}）
            </p>
          )}
          {followups.length > 0 && (
            <div className="ml-rec-follow" data-testid="ml-rec-follow">
              {followups.map((e, k) => (
                <div className="ml-rec-turn" key={k}>
                  <p className="ml-rec-turn-q">{e.q}</p>
                  {e.type === 'followup' && <p className="ml-rec-turn-a">{e.result.text}</p>}
                </div>
              ))}
            </div>
          )}
          <div className="ml-rec-tools">
            {rec.kind !== 'combo' && proxyUrl() !== '' && <ComboPicker fromId={rec.id} kind={rec.kind} />}
            {rec.kind === 'combo' && rec.sources && <a className="ml-ghost" data-testid="ml-rec-open-combo" href={`#${comboPathOf(rec.sources[0], rec.sources[1])}`}>打開合併解讀</a>}
            {confirm ? (
              <span className="ml-rec-confirm">
                <button type="button" className="ml-ghost ml-rec-danger" data-testid="ml-rec-del-yes" onClick={() => onDelete(rec.id)}>確定刪除</button>
                <button type="button" className="ml-ghost" onClick={() => setConfirm(false)}>取消</button>
              </span>
            ) : (
              <button type="button" className="ml-ghost" data-testid="ml-rec-del" onClick={() => setConfirm(true)}>刪除這筆</button>
            )}
          </div>
        </div>
      </details>
    </li>
  )
}

export default function RecordsPage() {
  const [list, setList] = useState<ReadingRecord[] | null>(null)
  const [confirmAll, setConfirmAll] = useState(false)

  useEffect(() => { setRealm('east') }, [])
  useEffect(() => {
    let alive = true
    loadRecords().then((v) => { if (alive) setList(v) })
    return () => { alive = false }
  }, [])

  const remove = async (id: string) => {
    await deleteRecord(id)
    setList(await loadRecords())
  }
  const removeAll = async () => {
    await clearRecords()
    setConfirmAll(false)
    setList([])
  }

  return (
    <section className="ml-view ml-records" data-testid="ml-records">
      <h1 className="ml-page-title">紀錄</h1>
      <p className="ml-page-line">算過的梅花、塔羅和合併解讀會自動收在這裡，只存在這台裝置、不會上傳；換瀏覽器或清除網站資料就會不見。最多留 {RECORDS_MAX} 筆；附預測、可以回來對答案的另外最多留 {TRACKED_MAX} 筆。</p>
      {list && list.length === 0 && (
        <div className="ml-rec-empty" data-testid="ml-rec-empty">
          <p>還沒有紀錄。</p>
          <span className="ml-rec-go">
            <a className="ml-ghost" href="#/meihua">起一卦梅花</a>
            <a className="ml-ghost" href="#/tarot">抽塔羅</a>
          </span>
        </div>
      )}
      {list && list.length > 0 && (
        <>
          <ul className="ml-rec-list" data-testid="ml-rec-list">
            {list.map((r) => <RecordItem key={r.id} rec={r} onDelete={remove} />)}
          </ul>
          <div className="ml-rec-all">
            <span className="ml-rec-count" data-testid="ml-rec-count">共 {list.length} 筆</span>
            {confirmAll ? (
              <span className="ml-rec-confirm">
                <button type="button" className="ml-ghost ml-rec-danger" data-testid="ml-rec-clear-yes" onClick={removeAll}>確定全部刪除</button>
                <button type="button" className="ml-ghost" onClick={() => setConfirmAll(false)}>取消</button>
              </span>
            ) : (
              <button type="button" className="ml-ghost" data-testid="ml-rec-clear" onClick={() => setConfirmAll(true)}>全部刪除</button>
            )}
          </div>
        </>
      )}
    </section>
  )
}
