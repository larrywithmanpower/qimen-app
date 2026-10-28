// 紫微追問的對話紀錄只存在這台裝置的 IndexedDB，一張盤一串，不送任何網路請求
import { del, get, keys, set } from 'idb-keyval'
import type { ThreadEntry } from '../ai'
import type { Birth } from './birth'

export const FOLLOWUP_MAX = 30
const PREFIX = 'ml-followup:'

// 盤的 key：生辰（西曆日期＋時辰＋性別）算出來；不知時辰的候選盤用選到的時辰
export const threadKey = (solarDate: string, timeIndex: number, gender: string) => `${PREFIX}${solarDate}|${gender}|${timeIndex}`

// 超過 30 筆丟最舊的
export const capThread = (entries: readonly ThreadEntry[]): ThreadEntry[] => entries.slice(-FOLLOWUP_MAX)

const isEntry = (v: unknown): v is ThreadEntry => {
  const e = v as ThreadEntry | undefined
  if (!e || typeof e.q !== 'string' || typeof e.layer !== 'string' || typeof e.date !== 'string') return false
  if (e.type === 'reading') return typeof e.reading === 'object' && e.reading !== null
  if (e.type === 'followup') return typeof e.result === 'object' && e.result !== null
  return false
}

// 無痕模式等情況 IndexedDB 可能拒絕存取，讀不到就當作沒有紀錄
export async function loadThread(key: string): Promise<ThreadEntry[]> {
  try {
    const v = await get(key)
    return Array.isArray(v) ? capThread(v.filter(isEntry)) : []
  } catch {
    return []
  }
}

export async function saveThread(key: string, entries: readonly ThreadEntry[]): Promise<void> {
  try {
    await set(key, capThread(entries))
  } catch {
    // 存不進去就只在這次畫面使用
  }
}

export async function clearThread(key: string): Promise<void> {
  try {
    await del(key)
  } catch {
    // 沒有可清的東西
  }
}

// 清生辰時一起清：這組生辰底下所有時辰的對話（不知時辰的 13 張候選盤各一串）
export async function clearThreadsOf(birth: Pick<Birth, 'solarDate' | 'gender'>): Promise<void> {
  try {
    const prefix = `${PREFIX}${birth.solarDate}|${birth.gender}|`
    const all = await keys()
    await Promise.all(all.filter((k) => typeof k === 'string' && k.startsWith(prefix)).map((k) => del(k)))
  } catch {
    // 沒有可清的東西
  }
}
