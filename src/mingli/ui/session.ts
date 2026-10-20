// 首頁填的問題與選的算法，換頁後還要帶著走
export type Method = 'tarot' | 'meihua' | 'ziwei'

export const SAMPLE_QUESTION = '這週提的企劃會不會過？'

export const session: { question: string; method: Method } = {
  question: '',
  method: 'tarot',
}
