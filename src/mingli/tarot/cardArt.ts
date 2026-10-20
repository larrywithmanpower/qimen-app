// 塔羅牌面與牌背：水墨插畫 webp，放在 public/mingli/tarot/
// Playwright 測試在 Node 裡只用 cardFile，那邊沒有 import.meta.env
const BASE = import.meta.env?.BASE_URL

// 小牌花色依牌序排列：權杖、聖杯、寶劍、錢幣，每組 14 張（A、2～10、侍者、騎士、皇后、國王）
const MINOR_SUITS = ['wands', 'cups', 'swords', 'pentacles'] as const

const pad2 = (n: number) => String(n).padStart(2, '0')

/** 牌的檔名（不含副檔名），例如 major-00、wands-01 */
export function cardFile(index: number): string {
  if (index < 22) return `major-${pad2(index)}`
  const m = index - 22
  return `${MINOR_SUITS[Math.floor(m / 14)]}-${pad2((m % 14) + 1)}`
}

export const faceSrc = (index: number): string => `${BASE}mingli/tarot/${cardFile(index)}.webp`
export const BACK_SRC = `${BASE}mingli/tarot/back.webp`
export const BACK_SM_SRC = `${BASE}mingli/tarot/back-sm.webp`
