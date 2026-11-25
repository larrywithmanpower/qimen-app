// 占卜紀錄：梅花、塔羅、合併解讀的結果只存在這台裝置的 IndexedDB，不送任何網路請求
import { del, get, set } from 'idb-keyval'
import type { AiReading, AiTone, ThreadEntry } from '../ai'

export const RECORDS_KEY = 'ml-records'
export const RECORDS_MAX = 100
// 合併解讀只挑這幾天內的另一邊紀錄
export const COMBO_DAYS = 7
const DAY_MS = 24 * 3600 * 1000

export type RecordKind = 'meihua' | 'tarot' | 'combo'

export interface ReadingRecord {
  id: string
  kind: RecordKind
  at: number // 算的時間（毫秒）
  question: string
  context?: string
  // 一眼看得出是哪一卦／哪幾張牌，例：「雷地豫 → 天地否」「教皇 正位・正義 逆位・星星 正位」
  title: string
  // 梅花五級吉凶或塔羅吉平凶
  level: string
  tone: AiTone
  // 送 AI 用的盤面；合併解讀要拿兩邊的 facts 組起來
  facts: Record<string, unknown>
  // AI 解讀成功才有；沒有時畫面用 verdict
  reading: AiReading | null
  verdict: string
  // 追問（不含第一筆解讀）
  followups: ThreadEntry[]
  // 合併解讀：[梅花紀錄 id, 塔羅紀錄 id]
  sources?: [string, string]
  // 合併解讀：當時兩邊的標題與塔羅題目（來源刪掉後畫面照樣顯示）
  combo?: { meihuaTitle: string; meihuaLevel: string; tarotTitle: string; tarotQuestion: string }
}

export const newRecordId = (kind: RecordKind, now = Date.now()) => `${kind}-${now}-${Math.random().toString(36).slice(2, 8)}`

const isRecord = (v: unknown): v is ReadingRecord => {
  const r = v as ReadingRecord | undefined
  return !!r
    && typeof r.id === 'string'
    && (r.kind === 'meihua' || r.kind === 'tarot' || r.kind === 'combo')
    && typeof r.at === 'number'
    && typeof r.question === 'string'
    && typeof r.title === 'string'
    && typeof r.verdict === 'string'
    && typeof r.facts === 'object' && r.facts !== null
    && Array.isArray(r.followups)
}

// 新的在前；同 id 取代舊的；超過 100 筆丟最舊的
export function upsert(list: readonly ReadingRecord[], rec: ReadingRecord): ReadingRecord[] {
  const rest = list.filter((r) => r.id !== rec.id)
  return [rec, ...rest].sort((a, b) => b.at - a.at).slice(0, RECORDS_MAX)
}

// 比對題目時忽略空白與標點
export const normQuestion = (q: string) => q.replace(/[\s\p{P}\p{S}]/gu, '').toLowerCase()

// 可以跟 from 合併的另一邊紀錄：7 天內、另一種算法；同一題排最前，其餘新的在前
export function comboCandidates(list: readonly ReadingRecord[], from: ReadingRecord, now = Date.now()): { rec: ReadingRecord; same: boolean }[] {
  if (from.kind === 'combo') return []
  const want: RecordKind = from.kind === 'meihua' ? 'tarot' : 'meihua'
  const q = normQuestion(from.question)
  return list
    .filter((r) => r.kind === want && now - r.at <= COMBO_DAYS * DAY_MS && r.at <= now + 60_000)
    .map((rec) => ({ rec, same: normQuestion(rec.question) === q }))
    .sort((a, b) => Number(b.same) - Number(a.same) || b.rec.at - a.rec.at)
}

// 兩筆紀錄排成 [梅花, 塔羅]；不是一梅花一塔羅回 null
export function comboPair(a: ReadingRecord, b: ReadingRecord): [ReadingRecord, ReadingRecord] | null {
  if (a.kind === 'meihua' && b.kind === 'tarot') return [a, b]
  if (a.kind === 'tarot' && b.kind === 'meihua') return [b, a]
  return null
}

// 無痕模式等情況 IndexedDB 可能拒絕存取，讀不到就當作沒有紀錄
export async function loadRecords(): Promise<ReadingRecord[]> {
  try {
    const v = await get(RECORDS_KEY)
    return Array.isArray(v) ? v.filter(isRecord).sort((a, b) => b.at - a.at).slice(0, RECORDS_MAX) : []
  } catch {
    return []
  }
}

// 同一頁可能連續存好幾次（解讀回來、追問），排隊寫，避免後寫的被先寫的蓋掉
let queue: Promise<unknown> = Promise.resolve()
const serial = <T>(fn: () => Promise<T>): Promise<T> => {
  const next = queue.then(fn, fn)
  queue = next.catch(() => undefined)
  return next
}

export function saveRecord(rec: ReadingRecord): Promise<void> {
  return serial(async () => {
    try {
      await set(RECORDS_KEY, upsert(await loadRecords(), rec))
    } catch {
      // 存不進去就只在這次畫面使用
    }
  })
}

export function deleteRecord(id: string): Promise<void> {
  return serial(async () => {
    try {
      await set(RECORDS_KEY, (await loadRecords()).filter((r) => r.id !== id))
    } catch {
      // 沒有可刪的東西
    }
  })
}

export function clearRecords(): Promise<void> {
  return serial(async () => {
    try {
      await del(RECORDS_KEY)
    } catch {
      // 沒有可清的東西
    }
  })
}
