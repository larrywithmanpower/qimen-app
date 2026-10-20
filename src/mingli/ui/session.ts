// 首頁填的問題與選的算法，換頁後還要帶著走
export type Method = 'tarot' | 'meihua' | 'ziwei'

export const SAMPLE_QUESTION = '這週提的企劃會不會過？'

export const session: { question: string; method: Method } = {
  question: '',
  method: 'tarot',
}

// 更新首頁帶過去的問題與算法（元件裡不直接改匯入的物件）
export function updateSession(patch: Partial<typeof session>) {
  Object.assign(session, patch)
}
