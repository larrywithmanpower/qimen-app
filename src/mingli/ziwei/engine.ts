// 紫微斗數排盤：包裝 iztro，所有流派設定寫死在 ZIWEI_CONFIG
import { astro, star as iztroStar, util as iztroUtil } from 'iztro'
import { Solar } from 'lunar-javascript'

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
  // 廟旺得利平陷（iztro 的「不」一律顯示成「陷」）
  brightness?: string
}

export interface ZiweiPalace {
  name: string
  branch: string
  stem: string
  majorStars: ZiweiStar[]
  minorStars: ZiweiStar[]
  decadalStart: number
  // 大限歲數範圍（虛歲，含頭尾）
  decadalRange: [number, number]
  // 小限歲數（每 12 年一輪）
  ages: number[]
  // 雜曜（iztro 清單，天傷改名天殤、截路與空亡兩名互換以對齊網站）
  adjectiveStars: string[]
  changsheng12: string
  boshi12: string
  suiqian12: string
  jiangqian12: string
  isSoul: boolean
  isBody: boolean
  // 來因宮：生年天干所在的宮
  isOriginal: boolean
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

// 網站與 iztro 的雜曜名稱差異：天傷＝天殤；截路、空亡的名字在生年干為己庚辛壬癸時與網站相反（30 盤實測：
// 甲乙丙丁戊年兩邊一致，己～癸年整組對調），位置對齊網站，所以這五個年干要把兩個名字互換
const SWAP_STEMS = '己庚辛壬癸'
const adjectiveName = (name: string, yearStem: string) => {
  if (name === '天傷') return '天殤'
  if (SWAP_STEMS.includes(yearStem)) {
    if (name === '截路') return '空亡'
    if (name === '空亡') return '截路'
  }
  return name
}

const brightnessOf = (b?: string) => (b === '不' ? '陷' : b || undefined)

const toStar = (s: { name: string; mutagen?: string; brightness?: string }): ZiweiStar => {
  const out: ZiweiStar = { name: s.name }
  if (s.mutagen) out.mutagen = s.mutagen
  const b = brightnessOf(s.brightness)
  if (b) out.brightness = b
  return out
}

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

// 晚子時算隔天：直接用隔天早子時排盤（盤、農曆、干支全來自它），不把 12 傳給 iztro
const astroOf = ({ solarDate, timeIndex, gender }: ChartInput) =>
  timeIndex === 12 ? make(nextDay(solarDate), 0, gender) : make(solarDate, timeIndex, gender)

export function buildChart(input: ChartInput): ZiweiFacts {
  const chart = astroOf(input)
  const lunar = chart.rawDates.lunarDate
  const palaces: ZiweiPalace[] = chart.palaces.map((p) => ({
    name: p.name,
    branch: p.earthlyBranch,
    stem: p.heavenlyStem,
    majorStars: p.majorStars.map(toStar),
    minorStars: p.minorStars.map(toStar),
    decadalStart: p.decadal.range[0],
    decadalRange: [p.decadal.range[0], p.decadal.range[1]],
    ages: [...p.ages],
    adjectiveStars: p.adjectiveStars.map((a) => adjectiveName(a.name, chart.rawDates.chineseDate.yearly[0])),
    changsheng12: p.changsheng12,
    boshi12: p.boshi12,
    suiqian12: p.suiqian12,
    jiangqian12: p.jiangqian12,
    isOriginal: p.isOriginalPalace,
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

// ───────── 運限：大限、小限、流年、流月、流日 ─────────

export type HoroscopeLayerKey = 'decadal' | 'age' | 'yearly' | 'monthly' | 'daily'

export const LAYER_LABEL: Record<HoroscopeLayerKey, string> = {
  decadal: '大限', age: '小限', yearly: '流年', monthly: '流月', daily: '流日',
}
// 疊宮名稱的開頭字：大命、小命、年命、月命、日命…
const LAYER_PREFIX: Record<HoroscopeLayerKey, string> = { decadal: '大', age: '小', yearly: '年', monthly: '月', daily: '日' }
const MUTAGEN_ORDER = ['祿', '權', '科', '忌'] as const

export interface LayerMutagen {
  star: string
  mutagen: string
  // 該星在本命盤落的宮（地支）
  branch: string
}

export interface HoroscopeLayer {
  layer: HoroscopeLayerKey
  stem: string
  branch: string
  // 該層命宮落的宮（地支）
  soulBranch: string
  // 各宮疊宮名稱，鍵是地支，例如 { 午: '年命', 未: '年兄' }
  palaceNames: Record<string, string>
  mutagens: LayerMutagen[]
  // 該層的星（運祿、流祿、月祿、日祿…），鍵是地支
  stars: Record<string, string[]>
  // 只有流年有：歲前十二、將前十二，鍵是地支
  suiqian?: Record<string, string>
  jiangqian?: Record<string, string>
}

export interface HoroscopeFacts {
  solarDate: string
  // 農曆年月日（閏月照本月，isLeap 只是標示）
  lunar: { year: number; month: number; day: number; isLeap: boolean }
  nominalAge: number
  // 還沒起大限的童限（大限改取童限宮）
  isChildhood: boolean
  decadal: HoroscopeLayer
  age: HoroscopeLayer
  yearly: HoroscopeLayer
  monthly: HoroscopeLayer
  daily: HoroscopeLayer
}

// iztro 的星曜函式吐簡體（語言設定只在建盤當下生效），逐字換回繁體
const TRAD: Record<string, string> = {
  禄: '祿', 鸾: '鸞', 钺: '鉞', 马: '馬', 阴: '陰', 贪: '貪', 机: '機', 阳: '陽', 门: '門', 军: '軍', 杀: '殺', 贞: '貞', 辅: '輔',
}
const trad = (s: string) => s.replace(/[禄鸾钺马阴贪机阳门军杀贞辅]/g, (c) => TRAD[c])

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const BRANCH_LIST = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

// 五虎遁：該年正月（寅月）的天干，之後每月順推；閏月不另算，照本月
export function monthStemBranch(yearStem: string, month: number): { stem: string; branch: string } {
  const start = (STEMS.indexOf(yearStem) % 5) * 2 + 2
  return { stem: STEMS[(start + month - 1) % 10], branch: BRANCH_LIST[(2 + month - 1) % 12] }
}

interface IztroPalaceLike { index: number; earthlyBranch: string }
type StarGrid = Array<Array<{ name: string }>> | undefined

function buildLayer(
  layer: HoroscopeLayerKey,
  soulIndex: number,
  stem: string,
  branch: string,
  palaceNames: string[],
  mutagenStars: string[],
  stars: StarGrid,
  natal: ZiweiFacts,
  chartPalaces: IztroPalaceLike[],
): HoroscopeLayer {
  const branchAt = (i: number) => chartPalaces[i].earthlyBranch
  const natalBranchOf = (star: string) =>
    natal.palaces.find((p) => [...p.majorStars, ...p.minorStars].some((x) => x.name === star))?.branch ?? ''
  const names: Record<string, string> = {}
  const grid: Record<string, string[]> = {}
  chartPalaces.forEach((_, i) => {
    names[branchAt(i)] = LAYER_PREFIX[layer] + palaceNames[i][0]
    grid[branchAt(i)] = (stars?.[i] ?? []).map((x) => trad(x.name))
  })
  return {
    layer,
    stem,
    branch,
    soulBranch: branchAt(soulIndex),
    palaceNames: names,
    mutagens: mutagenStars.map((star, k) => ({ star: trad(star), mutagen: MUTAGEN_ORDER[k], branch: natalBranchOf(trad(star)) })),
    stars: grid,
  }
}

// 某天的運限。閏月整個算本月：流月命宮、流月干、流日都照本月，不用 iztro 內建的「閏月 15 日以後 +1」
export function horoscope(input: ChartInput, date: string): HoroscopeFacts {
  const { timeIndex } = input
  const chart = astroOf(input)
  const h = chart.horoscope(date)
  const natal = buildChart(input)
  const pal = chart.palaces as unknown as IztroPalaceLike[]

  const [y, m, d] = date.split('-').map(Number)
  const lunar = Solar.fromYmd(y, m, d).getLunar()
  const month = Math.abs(lunar.getMonth())
  const day = lunar.getDay()
  const isLeap = lunar.getMonth() < 0

  // 流月命宮（斗君起）：流年地支逆數到生月，再順數到生時，就是正月所在的宮，之後每月一宮
  const birthMonth = chart.rawDates.lunarDate.lunarMonth
  const hourIdx = timeIndex === 12 ? 0 : timeIndex
  const monthlyIndex = iztroUtil.fixIndex(h.yearly.index - birthMonth + hourIdx + month)
  // 流日命宮：從流月命宮起算初一
  const dailyIndex = iztroUtil.fixIndex(monthlyIndex + day - 1)
  const mb = monthStemBranch(h.yearly.heavenlyStem, month)

  const names = (soul: number) => (pal.map((_, i) => ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '僕役', '官祿', '田宅', '福德', '父母'][iztroUtil.fixIndex(soul - i)]))
  const mutagenOf = (stemChar: string) => (iztroUtil.getMutagensByHeavenlyStem(stemChar as never) as string[]).map(trad)

  const decadal = buildLayer('decadal', h.decadal.index, h.decadal.heavenlyStem, h.decadal.earthlyBranch, h.decadal.palaceNames, h.decadal.mutagen, h.decadal.stars, natal, pal)
  const age = buildLayer('age', h.age.index, h.age.heavenlyStem, h.age.earthlyBranch, h.age.palaceNames, h.age.mutagen, undefined, natal, pal)
  const yearly = buildLayer('yearly', h.yearly.index, h.yearly.heavenlyStem, h.yearly.earthlyBranch, h.yearly.palaceNames, h.yearly.mutagen, h.yearly.stars, natal, pal)
  yearly.suiqian = {}
  yearly.jiangqian = {}
  pal.forEach((p, i) => {
    yearly.suiqian![p.earthlyBranch] = h.yearly.yearlyDecStar.suiqian12[i]
    yearly.jiangqian![p.earthlyBranch] = h.yearly.yearlyDecStar.jiangqian12[i]
  })
  const monthly = buildLayer('monthly', monthlyIndex, mb.stem, mb.branch, names(monthlyIndex), mutagenOf(mb.stem), iztroStar.getHoroscopeStar(mb.stem as never, mb.branch as never, 'monthly'), natal, pal)
  const daily = buildLayer('daily', dailyIndex, h.daily.heavenlyStem, h.daily.earthlyBranch, names(dailyIndex), h.daily.mutagen, h.daily.stars, natal, pal)

  return {
    solarDate: date,
    lunar: { year: lunar.getYear(), month, day, isLeap },
    nominalAge: h.age.nominalAge,
    isChildhood: h.decadal.name === '童限',
    decadal, age, yearly, monthly, daily,
  }
}
