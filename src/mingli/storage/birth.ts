// 生辰只存在這台裝置的 IndexedDB，不碰 localStorage、不送任何網路請求
import { del, get, set } from 'idb-keyval'
import type { Gender } from '../ziwei/engine'

export const BIRTH_KEY = 'ml-birth'

export interface Birth {
  solarDate: string // YYYY-MM-DD（西曆）
  timeIndex: number | null // 0～12；null 代表不知道時辰
  gender: Gender
}

const isBirth = (v: unknown): v is Birth => {
  const b = v as Birth | undefined
  return !!b
    && typeof b.solarDate === 'string'
    && (b.timeIndex === null || (Number.isInteger(b.timeIndex) && b.timeIndex >= 0 && b.timeIndex <= 12))
    && (b.gender === '男' || b.gender === '女')
}

// 無痕模式等情況 IndexedDB 可能拒絕存取，讀不到就當作沒存過
export async function loadBirth(): Promise<Birth | null> {
  try {
    const v = await get(BIRTH_KEY)
    return isBirth(v) ? v : null
  } catch {
    return null
  }
}

export async function saveBirth(birth: Birth): Promise<void> {
  try {
    await set(BIRTH_KEY, birth)
  } catch {
    // 存不進去就只在這次畫面使用
  }
}

export async function clearBirth(): Promise<void> {
  try {
    await del(BIRTH_KEY)
  } catch {
    // 沒有可清的東西
  }
}
