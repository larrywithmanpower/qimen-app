// 塔羅引擎：純函式，同一個牌序編號（seed）一定洗出同一副牌
import { CARDS, type TarotCard } from './cards'

export const SEED_RANGE = 100000
export const REVERSED_RATE = 0.35

export interface DeckSlot {
  index: number
  reversed: boolean
}

export interface DrawnCard extends DeckSlot {
  card: TarotCard
}

export type Tone = '吉' | '平' | '凶'

export interface ReadingParagraph {
  title: string
  text: string
  basis: string
}

export interface TemplateReading {
  verdict: string
  tone: Tone
  paragraphs: ReadingParagraph[]
}

export function mulberry32(seed: number): () => number {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// FNV-1a 字串雜湊
export function hashStr(s: string): number {
  let x = 2166136261
  for (const c of s) x = Math.imul(x ^ c.codePointAt(0)!, 16777619)
  return x >>> 0
}

// 問題＋時間 → 牌序編號（0～99999，畫面直接顯示）
export function seedFrom(question: string, time: number): number {
  return ((hashStr(question) ^ time) >>> 0) % SEED_RANGE
}

// 洗牌鈕：LCG 換下一個編號
export function nextSeed(seed: number): number {
  return ((seed * 1664525 + 1013904223) >>> 0) % SEED_RANGE
}

// 先逐張決定逆位，再 Fisher-Yates 洗牌（順序照 demo，不能調換）
export function shuffle(seed: number): DeckSlot[] {
  const r = mulberry32(seed)
  const deck: DeckSlot[] = CARDS.map((_, index) => ({ index, reversed: r() < REVERSED_RATE }))
  for (let k = deck.length - 1; k > 0; k--) {
    const j = Math.floor(r() * (k + 1))
    ;[deck[k], deck[j]] = [deck[j], deck[k]]
  }
  return deck
}

// picks 是使用者在扇形牌堆點的三個位置（0～77，不重複），依序是 過去／現在／接下來
export function drawThree(seed: number, picks: [number, number, number]): [DrawnCard, DrawnCard, DrawnCard] {
  if (new Set(picks).size !== 3 || picks.some((p) => !Number.isInteger(p) || p < 0 || p >= CARDS.length)) {
    throw new Error(`picks 必須是 0～${CARDS.length - 1} 之間三個不重複的整數`)
  }
  const deck = shuffle(seed)
  const one = (pos: number): DrawnCard => ({ ...deck[pos], card: CARDS[deck[pos].index] })
  return [one(picks[0]), one(picks[1]), one(picks[2])]
}

const POSITION_TITLES = ['之前卡在哪', '現在的狀況', '接下來'] as const
const VERDICTS = ['這次先別硬推', '先等等，條件還不夠', '會成，但有一處要補', '順，放手去做'] as const
const TONES: Tone[] = ['凶', '平', '吉', '吉']

// 範例解讀：正位張數定調，每張牌取該正逆位短義
export function templateReading(cards: readonly DrawnCard[]): TemplateReading {
  const up = cards.filter((c) => !c.reversed).length
  return {
    verdict: VERDICTS[up],
    tone: TONES[up],
    paragraphs: cards.map((c, k) => ({
      title: POSITION_TITLES[k],
      text: c.reversed ? c.card.reversed : c.card.upright,
      basis: `第 ${k + 1} 張 ${c.card.zh}${c.reversed ? '逆位' : '正位'}`,
    })),
  }
}
