// 準度追蹤（純函式）：AI 解讀附的預測到期後回填中／沒中／說不準，算各術數、各題目類型的命中率
import { parseIso } from '../ui/dateMath'
import type { OutcomeResult, ReadingRecord, RecordKind } from './records'
import { isOutcome } from './records'

// 中＋沒中滿這麼多筆才顯示百分比（「說不準」不算）
export const MIN_JUDGED = 10

export type Topic = '感情' | '工作' | '錢' | '人際' | '其他'
export const TOPICS: readonly Topic[] = ['感情', '工作', '錢', '人際', '其他']

// 依題目關鍵字分類；同時命中多類時照這個順序取第一個
const TOPIC_WORDS: [Exclude<Topic, '其他'>, RegExp][] = [
  ['感情', /感情|喜歡|愛我|戀|交往|對象|復合|分手|曖昧|另一半|伴侶|老公|老婆|男友|女友|男朋友|女朋友|結婚|婚姻|桃花|告白|前任|他還|她還/],
  ['錢', /錢|財|投資|收入|薪|股票|基金|債|存款|花費|理財|買房|房貸|貸款|中獎|樂透/],
  ['工作', /工作|職|面試|升遷|加薪|主管|老闆|公司|轉職|辭|事業|創業|案子|專案|企劃|提案|上架|客戶|業績|考試|錄取|app/i],
  ['人際', /朋友|家人|室友|同學|同事|人際|關係|爸|媽|父|母|小孩|兒子|女兒|兄|弟|姊|姐|妹|鄰居/],
]
export function topicOf(question: string): Topic {
  return TOPIC_WORDS.find(([, re]) => re.test(question))?.[0] ?? '其他'
}

export interface Prediction { claim: string; dueDate: string }

// 有 AI 解讀、附了合法預測的紀錄才能追蹤（範例解讀沒有預測）
export function predictionOf(rec: ReadingRecord): Prediction | null {
  const p = rec.reading?.prediction
  return p && typeof p.claim === 'string' && p.claim.trim() !== '' && typeof p.dueDate === 'string' && parseIso(p.dueDate) !== null ? p : null
}

export interface Tracked { rec: ReadingRecord; prediction: Prediction }

const tracked = (list: readonly ReadingRecord[]): Tracked[] =>
  list.flatMap((rec) => {
    const prediction = predictionOf(rec)
    return prediction ? [{ rec, prediction }] : []
  })

// 到期（到期日當天起）還沒回填的，先到期的在前
export const dueList = (list: readonly ReadingRecord[], today: string): Tracked[] =>
  tracked(list).filter((t) => !isOutcome(t.rec.outcome) && t.prediction.dueDate <= today).sort((a, b) => a.prediction.dueDate.localeCompare(b.prediction.dueDate))

// 還沒到期的，快到期的在前
export const pendingList = (list: readonly ReadingRecord[], today: string): Tracked[] =>
  tracked(list).filter((t) => !isOutcome(t.rec.outcome) && t.prediction.dueDate > today).sort((a, b) => a.prediction.dueDate.localeCompare(b.prediction.dueDate))

// 已回填的，最近填的在前
export const answeredList = (list: readonly ReadingRecord[]): Tracked[] =>
  tracked(list).filter((t) => isOutcome(t.rec.outcome)).sort((a, b) => (b.rec.outcome?.at ?? 0) - (a.rec.outcome?.at ?? 0))

export interface Tally { hit: number; miss: number; unsure: number; judged: number; rate: number | null }

export function tally(results: readonly OutcomeResult[]): Tally {
  const hit = results.filter((r) => r === 'hit').length
  const miss = results.filter((r) => r === 'miss').length
  const judged = hit + miss
  return { hit, miss, unsure: results.length - judged, judged, rate: judged >= MIN_JUDGED ? Math.round((hit / judged) * 100) : null }
}

export interface AccuracyStats { all: Tally; byKind: Record<RecordKind, Tally>; byTopic: Record<Topic, Tally> }

export function accuracyStats(list: readonly ReadingRecord[]): AccuracyStats {
  const done = answeredList(list)
  const pick = (f: (t: Tracked) => boolean) => tally(done.filter(f).map((t) => t.rec.outcome!.result))
  return {
    all: pick(() => true),
    byKind: { meihua: pick((t) => t.rec.kind === 'meihua'), tarot: pick((t) => t.rec.kind === 'tarot'), combo: pick((t) => t.rec.kind === 'combo') },
    byTopic: Object.fromEntries(TOPICS.map((k) => [k, pick((t) => topicOf(t.rec.question) === k)])) as Record<Topic, Tally>,
  }
}
