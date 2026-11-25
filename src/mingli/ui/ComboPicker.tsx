// 「和塔羅／梅花合併解讀」：點開列出 7 天內另一種算法的紀錄，挑一筆就進合併解讀頁
import { useState } from 'react'
import './records.css'
import { comboCandidates, COMBO_DAYS, loadRecords } from '../storage/records'
import type { ReadingRecord } from '../storage/records'
import { goTo } from './route'
import { updateSession } from './session'
import { comboPath, KIND_NAME, shortTime } from './recordText'

export default function ComboPicker({ fromId }: { fromId: string | null }) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<{ from: ReadingRecord; list: { rec: ReadingRecord; same: boolean }[] } | null>(null)
  if (!fromId) return null
  const kindOf = fromId.startsWith('meihua') ? 'meihua' : 'tarot'
  const other = kindOf === 'meihua' ? 'tarot' : 'meihua'

  const toggle = async () => {
    if (open) {
      setOpen(false)
      return
    }
    const all = await loadRecords()
    const from = all.find((r) => r.id === fromId)
    setState(from ? { from, list: comboCandidates(all, from) } : null)
    setOpen(true)
  }
  // 沒有另一邊的紀錄：帶著同一個問題去算
  const goCast = () => {
    if (state) updateSession({ question: state.from.question, context: state.from.context ?? '', method: other })
    goTo(`/${other}`)
  }

  return (
    <div className="ml-combo" data-testid="ml-combo">
      <button type="button" className="ml-ghost ml-combo-btn" data-testid="ml-combo-open" aria-expanded={open} onClick={toggle}>
        和{KIND_NAME[other]}合併解讀
      </button>
      {open && state && (
        <div className="ml-combo-panel" data-testid="ml-combo-panel">
          {state.list.length === 0 ? (
            <>
              <p className="ml-combo-empty" data-testid="ml-combo-empty">最近 {COMBO_DAYS} 天沒有{KIND_NAME[other]}紀錄。先用同一個問題{other === 'tarot' ? '抽一次塔羅' : '起一卦梅花'}，再回來合併。</p>
              <button type="button" className="ml-ghost" data-testid="ml-combo-go" onClick={goCast}>去{other === 'tarot' ? '抽塔羅' : '起梅花'}</button>
            </>
          ) : (
            <>
              <p className="ml-combo-hint">選一筆{KIND_NAME[other]}紀錄跟這次合起來看（最近 {COMBO_DAYS} 天）</p>
              <ul className="ml-combo-list">
                {state.list.map(({ rec, same }) => (
                  <li key={rec.id}>
                    <button type="button" className="ml-combo-item" data-testid="ml-combo-item" data-same={same} onClick={() => goTo(comboPath(state.from, rec))}>
                      <span className="ml-combo-q">{rec.question}</span>
                      <span className="ml-combo-meta">
                        {same && <span className="ml-rec-tag" data-testid="ml-combo-same">同一題</span>}
                        <span>{shortTime(rec.at)}</span>
                        <span>{rec.title}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}
