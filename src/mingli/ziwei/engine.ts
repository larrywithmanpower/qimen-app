// 紫微斗數排盤：包裝 iztro，所有流派設定寫死在 ZIWEI_CONFIG
import { astro } from 'iztro'

// 全部用預設值，但明寫出來，避免日後套件改預設而盤跟著變
export const ZIWEI_CONFIG = {
  yearDivide: 'normal',
  horoscopeDivide: 'normal',
  ageDivide: 'normal',
  // 晚子時已在 buildChart 自己換成隔天早子時，不依賴 iztro 的 forward
  dayDivide: 'forward',
  algorithm: 'default',
} as const

// 閏月一律照本月排（不把閏月後半個月算下個月）；公認排盤網站與梅花「閏月用原月數」都這樣算
export const ZIWEI_FIX_LEAP = false

export type Gender = '男' | '女'

// 十四主星（繁體，與 iztro zh-TW 輸出一致）
export const MAJOR_STAR_NAMES = [
  '紫微', '天機', '太陽', '武曲', '天同', '廉貞', '天府',
  '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍',
] as const

export interface ZiweiStar {
  name: string
  mutagen?: string
}

export interface ZiweiPalace {
  name: string
  branch: string
  stem: string
  majorStars: ZiweiStar[]
  minorStars: ZiweiStar[]
  decadalStart: number
  isSoul: boolean
  isBody: boolean
}

export interface ZiweiFacts {
  palaces: ZiweiPalace[]
  soulBranch: string
  bodyBranch: string
  fiveElementsClass: string
  soul: string
  body: string
  lunarDate: string
  chineseDate: string
  lunar: { month: number; day: number; leap: boolean }
}

export interface ChartInput {
  solarDate: string // YYYY-MM-DD
  timeIndex: number // 0～12
  gender: Gender
}

// 小時（0～23）轉時辰序號：0 早子、1～2 丑 … 21～22 亥、23 晚子
export function timeIndexOf(hour: number): number {
  if (hour === 23) return 12
  if (hour === 0) return 0
  return Math.floor((hour + 1) / 2)
}

const toStar = (s: { name: string; mutagen?: string }): ZiweiStar =>
  s.mutagen ? { name: s.name, mutagen: s.mutagen } : { name: s.name }

// 輔星排序：帶化的排最前面（格子只顯示前幾顆時不會被藏掉），其餘維持原順序
export function sortMinorStars(stars: ZiweiStar[]): ZiweiStar[] {
  return [...stars.filter((s) => s.mutagen), ...stars.filter((s) => !s.mutagen)]
}

// 公曆日期加一天（YYYY-MM-DD），用 UTC 算避免時區與跨月跨年問題
function nextDay(solarDate: string): string {
  const [y, m, d] = solarDate.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)
}

const make = (solarDate: string, timeIndex: number, gender: Gender) =>
  astro.withOptions({
    type: 'solar',
    dateStr: solarDate,
    timeIndex,
    gender,
    language: 'zh-TW',
    fixLeap: ZIWEI_FIX_LEAP,
    config: { ...ZIWEI_CONFIG },
  })

export function buildChart({ solarDate, timeIndex, gender }: ChartInput): ZiweiFacts {
  // 晚子時算隔天：直接用隔天早子時排盤（盤、農曆、干支全來自它），不把 12 傳給 iztro
  const chart = timeIndex === 12 ? make(nextDay(solarDate), 0, gender) : make(solarDate, timeIndex, gender)
  const lunar = chart.rawDates.lunarDate
  const palaces: ZiweiPalace[] = chart.palaces.map((p) => ({
    name: p.name,
    branch: p.earthlyBranch,
    stem: p.heavenlyStem,
    majorStars: p.majorStars.map(toStar),
    minorStars: p.minorStars.map(toStar),
    decadalStart: p.decadal.range[0],
    isSoul: p.earthlyBranch === chart.earthlyBranchOfSoulPalace,
    isBody: p.isBodyPalace,
  }))
  return {
    palaces,
    soulBranch: chart.earthlyBranchOfSoulPalace,
    bodyBranch: chart.earthlyBranchOfBodyPalace,
    fiveElementsClass: chart.fiveElementsClass,
    soul: chart.soul,
    body: chart.body,
    lunarDate: chart.lunarDate,
    chineseDate: chart.chineseDate,
    lunar: { month: lunar.lunarMonth, day: lunar.lunarDay, leap: lunar.isLeap },
  }
}

// 不知時辰：13 個時辰序號全排出來
export function candidates(solarDate: string, gender: Gender): ZiweiFacts[] {
  return Array.from({ length: 13 }, (_, timeIndex) => buildChart({ solarDate, timeIndex, gender }))
}

export interface StarPositions {
  soul: string
  body: string
  stars: Record<string, string>
}

// 給對答案用：命宮、身宮、十四主星各落在哪個地支
export function starPositions(facts: ZiweiFacts): StarPositions {
  const stars: Record<string, string> = {}
  for (const palace of facts.palaces) {
    for (const star of palace.majorStars) stars[star.name] = palace.branch
  }
  return { soul: facts.soulBranch, body: facts.bodyBranch, stars }
}
