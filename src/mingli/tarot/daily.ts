// 今日一牌：同一台裝置、同一個台灣日期固定同一張；台灣時間 00:00 換新。只用本機資料，不呼叫 AI
import { CARDS } from './cards'
import type { DrawnCard, Tone } from './engine'
import { hashStr, mulberry32, REVERSED_RATE } from './engine'

const DEVICE_KEY = 'ml-device'

// 台灣日期（準度追蹤也用同一份）
export { taiwanDate } from '../ui/dateMath'

// 這台裝置的隨機代號（只存本機、不送出去）；存不了就用這次開頁的代號
let memoryId = ''
export function deviceId(): string {
  try {
    const saved = localStorage.getItem(DEVICE_KEY)
    if (saved) return saved
    const id = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, id)
    return id
  } catch {
    memoryId ||= crypto.randomUUID()
    return memoryId
  }
}

// 裝置代號＋日期 → 一張牌與正逆位（同樣的輸入永遠同一張）
export function dailyCard(device: string, date: string): DrawnCard {
  const r = mulberry32(hashStr(`${device}|${date}`))
  const index = Math.floor(r() * CARDS.length)
  return { index, reversed: r() < REVERSED_RATE, card: CARDS[index] }
}

// 今日一牌只當當天的提醒，一律定「平」：只看正逆位會把高塔、死神正位也定成吉，AI 會被迫往好的寫
export const dailyTone: (c: DrawnCard) => Tone = () => '平'

// 送 AI 詳細解讀用的盤面
export function dailyFacts(c: DrawnCard): Record<string, unknown> {
  return {
    spread: '今日一牌',
    cards: [{ position: '今天', name: c.card.zh, orientation: c.reversed ? '逆位' : '正位', keyword: c.reversed ? c.card.reversed : c.card.upright }],
  }
}

// AI 詳細解讀固定問這一題（今日一牌沒有使用者輸入的問題）
export const DAILY_QUESTION = '今天要注意什麼？'

// 知識卡編號：T＋兩位數牌序＋正／逆（跟後端 cards/tarot.json 一致）
export const dailyCardId = (c: DrawnCard) => `T${String(c.index).padStart(2, '0')}${c.reversed ? '逆' : '正'}`
