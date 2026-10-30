import { useState } from 'react'
import './question.css'
import { MAX_CONTEXT } from '../ai'

interface Props {
  value: string
  // 還沒開始抽牌／起卦才能改
  canEdit: boolean
  onChange: (v: string) => void
}

// 補充近況（選填）：讓 AI 解讀扣回使用者的處境；只在這次解讀用，不存
export default function ContextField({ value, canEdit, onChange }: Props) {
  const [open, setOpen] = useState(value !== '')
  if (!canEdit) {
    return value.trim() ? <p className="ml-ctx-view" data-testid="ml-context-view">你的近況：{value.trim()}</p> : null
  }
  if (!open) {
    return (
      <button type="button" className="ml-ghost ml-ctx-open" data-testid="ml-context-open" onClick={() => setOpen(true)}>
        ＋ 補充你的近況（選填）
      </button>
    )
  }
  return (
    <label className="ml-ctx">
      <span className="ml-ctx-k">你的近況（選填）</span>
      <textarea
        className="ml-ctx-input"
        data-testid="ml-context-input"
        rows={3}
        maxLength={MAX_CONTEXT}
        placeholder="例：剛換工作三個月，主管很嚴格，在考慮要不要再換。寫得越具體，解讀越貼近你"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="ml-ctx-hint">
        只用在這次 AI 解讀，不會存下來・{[...value].length}/{MAX_CONTEXT}
      </span>
    </label>
  )
}
