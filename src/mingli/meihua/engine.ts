// 梅花易數排盤引擎：純函式，不碰 DOM
import { Solar } from 'lunar-javascript'

export type Trigram = '乾' | '兌' | '離' | '震' | '巽' | '坎' | '艮' | '坤'
export type Element = '金' | '木' | '水' | '火' | '土'
export type Relation = '用生體' | '體剋用' | '比和' | '體生用' | '用剋體'
export type Tone = '吉' | '平' | '凶'
export type Level = '大吉' | '吉' | '小凶' | '凶'

// 先天數：1～8 對應乾兌離震巽坎艮坤
const TRIGRAM_BY_NUM: Trigram[] = ['乾', '兌', '離', '震', '巽', '坎', '艮', '坤']

// 三爻由下往上，1 = 陽
const TRIGRAM_LINES: Record<Trigram, [number, number, number]> = {
  乾: [1, 1, 1],
  兌: [1, 1, 0],
  離: [1, 0, 1],
  震: [1, 0, 0],
  巽: [0, 1, 1],
  坎: [0, 1, 0],
  艮: [0, 0, 1],
  坤: [0, 0, 0],
}

const TRIGRAM_ELEMENT: Record<Trigram, Element> = {
  乾: '金',
  兌: '金',
  離: '火',
  震: '木',
  巽: '木',
  坎: '水',
  艮: '土',
  坤: '土',
}

// 八卦象（組卦名用）
const TRIGRAM_IMAGE: Record<Trigram, string> = {
  乾: '天',
  兌: '澤',
  離: '火',
  震: '雷',
  巽: '風',
  坎: '水',
  艮: '山',
  坤: '地',
}

// 64 卦名：列＝上卦、欄＝下卦，順序都是 乾兌離震巽坎艮坤
const HEXAGRAM_NAMES: string[][] = [
  ['乾為天', '天澤履', '天火同人', '天雷無妄', '天風姤', '天水訟', '天山遯', '天地否'],
  ['澤天夬', '兌為澤', '澤火革', '澤雷隨', '澤風大過', '澤水困', '澤山咸', '澤地萃'],
  ['火天大有', '火澤睽', '離為火', '火雷噬嗑', '火風鼎', '火水未濟', '火山旅', '火地晉'],
  ['雷天大壯', '雷澤歸妹', '雷火豐', '震為雷', '雷風恆', '雷水解', '雷山小過', '雷地豫'],
  ['風天小畜', '風澤中孚', '風火家人', '風雷益', '巽為風', '風水渙', '風山漸', '風地觀'],
  ['水天需', '水澤節', '水火既濟', '水雷屯', '水風井', '坎為水', '水山蹇', '水地比'],
  ['山天大畜', '山澤損', '山火賁', '山雷頤', '山風蠱', '山水蒙', '艮為山', '山地剝'],
  ['地天泰', '地澤臨', '地火明夷', '地雷復', '地風升', '地水師', '地山謙', '坤為地'],
]

const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

const SHENG: Record<Element, Element> = { 金: '水', 水: '木', 木: '火', 火: '土', 土: '金' }
const KE: Record<Element, Element> = { 金: '木', 木: '土', 土: '水', 水: '火', 火: '金' }

// 餘數規則：整除時取除數本身
const remainder = (n: number, k: number) => n % k || k

const trigramOf = (n: number): Trigram => TRIGRAM_BY_NUM[remainder(n, 8) - 1]

const trigramFromLines = (lines: number[]): Trigram => {
  const found = TRIGRAM_BY_NUM.find((t) => TRIGRAM_LINES[t].every((v, i) => v === lines[i]))
  if (!found) throw new Error('無法由爻組出八卦')
  return found
}

export const hexagramName = (upper: Trigram, lower: Trigram): string =>
  HEXAGRAM_NAMES[TRIGRAM_BY_NUM.indexOf(upper)][TRIGRAM_BY_NUM.indexOf(lower)]

export interface SubHexagram {
  upper: Trigram
  lower: Trigram
  name: string
}

export interface MeihuaInput {
  method: 'lunar' | 'numbers'
  // 時間起卦才有
  yearZhi?: number
  month?: number
  day?: number
  hourZhi?: number
  // 報數起卦才有
  a?: number
  b?: number
  // 各個總數
  upperTotal: number
  lowerTotal: number
  movingTotal: number
}

export interface MeihuaResult {
  input: MeihuaInput
  upper: Trigram
  lower: Trigram
  name: string
  // 六爻由下往上，1 = 陽
  lines: number[]
  moving: number
  mutual: SubHexagram
  changed: SubHexagram
  ti: Trigram
  yong: Trigram
  tiElement: Element
  yongElement: Element
  relation: Relation
  tone: Tone
  level: Level
}

const RELATION_TONE: Record<Relation, { tone: Tone; level: Level }> = {
  用生體: { tone: '吉', level: '大吉' },
  體剋用: { tone: '吉', level: '吉' },
  比和: { tone: '吉', level: '吉' },
  體生用: { tone: '平', level: '小凶' },
  用剋體: { tone: '凶', level: '凶' },
}

const relationOf = (ti: Element, yong: Element): Relation => {
  if (ti === yong) return '比和'
  if (SHENG[yong] === ti) return '用生體'
  if (SHENG[ti] === yong) return '體生用'
  if (KE[ti] === yong) return '體剋用'
  return '用剋體'
}

// 由上下卦與動爻組出完整結果
const build = (input: MeihuaInput, upper: Trigram, lower: Trigram, moving: number): MeihuaResult => {
  const lines = [...TRIGRAM_LINES[lower], ...TRIGRAM_LINES[upper]]
  // 互卦：下互取 2、3、4 爻，上互取 3、4、5 爻
  const mutualLower = trigramFromLines(lines.slice(1, 4))
  const mutualUpper = trigramFromLines(lines.slice(2, 5))
  // 變卦：動爻陰陽對調
  const changedLines = lines.map((v, i) => (i === moving - 1 ? 1 - v : v))
  const changedLower = trigramFromLines(changedLines.slice(0, 3))
  const changedUpper = trigramFromLines(changedLines.slice(3, 6))
  // 體用：動爻所在的卦為用，另一卦為體
  const yongIsLower = moving <= 3
  const ti = yongIsLower ? upper : lower
  const yong = yongIsLower ? lower : upper
  const tiElement = TRIGRAM_ELEMENT[ti]
  const yongElement = TRIGRAM_ELEMENT[yong]
  const relation = relationOf(tiElement, yongElement)
  return {
    input,
    upper,
    lower,
    name: hexagramName(upper, lower),
    lines,
    moving,
    mutual: { upper: mutualUpper, lower: mutualLower, name: hexagramName(mutualUpper, mutualLower) },
    changed: { upper: changedUpper, lower: changedLower, name: hexagramName(changedUpper, changedLower) },
    ti,
    yong,
    tiElement,
    yongElement,
    relation,
    ...RELATION_TONE[relation],
  }
}

export interface LunarNumbers {
  yearZhi: number
  month: number
  day: number
  hourZhi: number
}

// 時間起卦：年支數＋月＋日 取上卦；再加時支數取下卦與動爻
export const castByLunar = ({ yearZhi, month, day, hourZhi }: LunarNumbers): MeihuaResult => {
  const upperTotal = yearZhi + month + day
  const lowerTotal = upperTotal + hourZhi
  return build(
    { method: 'lunar', yearZhi, month, day, hourZhi, upperTotal, lowerTotal, movingTotal: lowerTotal },
    trigramOf(upperTotal),
    trigramOf(lowerTotal),
    remainder(lowerTotal, 6),
  )
}

// 報數起卦：預設不加時支，addHour 打開才把時支數加進動爻
export const castByNumbers = (
  a: number,
  b: number,
  opts: { addHour?: boolean; hourZhi?: number } = {},
): MeihuaResult => {
  const movingTotal = a + b + (opts.addHour ? (opts.hourZhi ?? 0) : 0)
  return build(
    {
      method: 'numbers',
      a,
      b,
      hourZhi: opts.addHour ? opts.hourZhi : undefined,
      upperTotal: a,
      lowerTotal: b,
      movingTotal,
    },
    trigramOf(a),
    trigramOf(b),
    remainder(movingTotal, 6),
  )
}

export interface LunarNumbersOfDate extends LunarNumbers {
  isLeapMonth: boolean
}

// 西曆時間 → 農曆數字：23 點起算隔天（月、日、年支都用隔天），時支為子
export const lunarNumbersOf = (date: Date): LunarNumbersOfDate => {
  const hour = date.getHours()
  const base = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  if (hour >= 23) base.setDate(base.getDate() + 1)
  const lunar = Solar.fromYmdHms(base.getFullYear(), base.getMonth() + 1, base.getDate(), 12, 0, 0).getLunar()
  const rawMonth: number = lunar.getMonth()
  return {
    yearZhi: ZHI.indexOf(lunar.getYearZhi()) + 1,
    // 閏月 lunar-javascript 回負數，取原月數
    month: Math.abs(rawMonth),
    day: lunar.getDay(),
    hourZhi: hour >= 23 ? 1 : Math.floor((hour + 1) / 2) + 1,
    isLeapMonth: rawMonth < 0,
  }
}

export const castByTime = (date: Date): MeihuaResult => {
  const { yearZhi, month, day, hourZhi } = lunarNumbersOf(date)
  return castByLunar({ yearZhi, month, day, hourZhi })
}

export interface TemplateParagraph {
  title: string
  text: string
  basis: string
}

export interface TemplateReading {
  verdict: string
  tone: Tone
  paragraphs: TemplateParagraph[]
}

const RELATION_TEXT: Record<Relation, { verdict: string; control: string; end: string }> = {
  用生體: {
    verdict: '外在條件在幫你，順著做就有成果',
    control: '對方與環境的力量正在補給你，主動權在你手上，只要穩穩接住就好',
    end: '後續有人或機會從旁協助，結果偏向你期待的方向',
  },
  體剋用: {
    verdict: '你有主導權，花點力氣就能做成',
    control: '你這邊的力量大過事情本身，能掌握節奏，但需要實際出手',
    end: '結果大致在你控制之內，付出多少會得到相應的回報',
  },
  比和: {
    verdict: '雙方勢均力敵，穩定而順暢',
    control: '你和事情的力量相當，沒有誰壓過誰，慢慢磨合就能談出共識',
    end: '結果平穩落地，不會有大起大落',
  },
  體生用: {
    verdict: '你付出比較多，得先有耗損的心理準備',
    control: '你的力量在往事情那邊流，容易累，掌握度偏低，要留意自己的體力與資源',
    end: '最後能成，但過程消耗較大，建議先設好停損點',
  },
  用剋體: {
    verdict: '外在阻力偏大，現在不宜硬碰',
    control: '事情的力量壓過你，自己不太能控場，宜先退一步、等條件改變',
    end: '照目前走法結果偏不理想，調整做法或延後時機會好得多',
  },
}

// 五行生剋的簡寫，例如「木剋金」
const elementBasis = (r: MeihuaResult): string => {
  const { tiElement: t, yongElement: y } = r
  if (r.relation === '用生體') return `${y}生${t}`
  if (r.relation === '體剋用') return `${t}剋${y}`
  if (r.relation === '體生用') return `${t}生${y}`
  if (r.relation === '用剋體') return `${y}剋${t}`
  return `${t}${y}比和`
}

// 範本解讀：依生剋與卦名組句，尚未接 AI
export const templateReading = (result: MeihuaResult): TemplateReading => {
  const text = RELATION_TEXT[result.relation]
  return {
    verdict: text.verdict,
    tone: result.tone,
    paragraphs: [
      {
        title: '這件事現在的樣子',
        text: `本卦是「${result.name}」，上為${TRIGRAM_IMAGE[result.upper]}、下為${TRIGRAM_IMAGE[result.lower]}，這是事情目前的樣貌；中間的互卦是「${result.mutual.name}」，代表過程裡藏著的細節。`,
        basis: `本卦 ${result.name}`,
      },
      {
        title: '你能不能掌握',
        text: `${text.control}。體卦${result.ti}屬${result.tiElement}，用卦${result.yong}屬${result.yongElement}，關係是「${result.relation}」。`,
        basis: `體用 ${elementBasis(result)}`,
      },
      {
        title: '最後會怎樣',
        text: `${text.end}。變卦是「${result.changed.name}」，第 ${result.moving} 爻是變動的關鍵點。`,
        basis: `變卦 ${result.changed.name}・${result.moving}爻動`,
      },
    ],
  }
}
