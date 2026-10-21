import { useState } from 'react'
import './question.css'
import { SAMPLE_QUESTION } from './session'

export const NEED_QUESTION = '先寫下你想問的事'
export const MAX_QUESTION_LEN = 200

interface Props {
  question: string
  // 還沒開始抽牌／起卦才能改
  canEdit: boolean
  // 標題用各頁自己的 class（字級不同）
  titleClass: string
  onCommit: (q: string) => void
}

// 問題標題＋「改問題」：沒有問題時一進來就是輸入框，範例問題只當 placeholder
export default function QuestionBar({ question, canEdit, titleClass, onCommit }: Props) {
  const [editing, setEditing] = useState(question === '')
  const [draft, setDraft] = useState(question)

  const confirm = () => {
    const q = draft.trim()
    if (!q) return
    setEditing(false)
    onCommit(q)
  }
  const cancel = () => {
    if (!question) return
    setDraft(question)
    setEditing(false)
  }

  if (editing && (canEdit || !question)) {
    return (
      <div className="ml-qedit" data-testid="ml-question-edit">
        <input
          className="ml-qedit-input"
          data-testid="ml-question-input"
          aria-label="你想問的事"
          placeholder={`例：${SAMPLE_QUESTION}`}
          maxLength={MAX_QUESTION_LEN}
          autoComplete="off"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return
            if (e.key === 'Enter') confirm()
            else if (e.key === 'Escape') cancel()
          }}
        />
        <div className="ml-qedit-actions">
          <button type="button" className="ml-ghost" data-testid="ml-question-ok" disabled={!draft.trim()} onClick={confirm}>確定</button>
          {question && <button type="button" className="ml-ghost" data-testid="ml-question-cancel" onClick={cancel}>取消</button>}
        </div>
        {!question && <p className="ml-qedit-need" data-testid="ml-question-need" role="status">{NEED_QUESTION}</p>}
      </div>
    )
  }

  return (
    <div className="ml-qrow">
      <h1 className={titleClass}>{question}</h1>
      {canEdit && (
        <button
          type="button"
          className="ml-ghost ml-qedit-btn"
          data-testid="ml-edit-question"
          onClick={() => { setDraft(question); setEditing(true) }}
        >
          改問題
        </button>
      )}
    </div>
  )
}
