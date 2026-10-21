// AI 解讀：組盤面事實 → 送後端代理（Claude）→ 收回後再驗一次。
// 任何一步失敗都回 null，由畫面退回程式範本，不丟錯
import { CARDS } from './tarot/cards'
import type { DrawnCard } from './tarot/engine'
import { hexagramName } from './meihua/engine'
import type { MeihuaResult, Trigram } from './meihua/engine'
import { MAJOR_STAR_NAMES } from './ziwei/engine'
import type { HoroscopeFacts, HoroscopeLayer, ZiweiFacts } from './ziwei/engine'

export type AiKind = 'tarot' | 'meihua' | 'ziwei'
export type AiTone = '吉' | '平' | '凶'

export interface AiRequest {
  kind: AiKind
  question: string
  // 只放排好的盤，不放生日原文、姓名
  facts: Record<string, unknown>
  tone: AiTone
}

export interface AiParagraph {
  title: string
  text: string
  basis: string[]
}

export interface AiReading {
  verdict: string
  tone: AiTone
  paragraphs: AiParagraph[]
  prediction: { claim: string; dueDate: string }
}

// 超過這麼久沒回就退回範本
export const AI_TIMEOUT_MS = 15_000
export const MAX_QUESTION = 200

// 代理網址：正式讀 VITE_GEMINI_PROXY_URL。
// 開發模式（vite dev，含 Playwright）另可在頁面載入前設 window.__MINGLI_AI_URL__ 覆蓋，正式版會被拿掉
export function proxyUrl(): string {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const w = window as unknown as { __MINGLI_AI_URL__?: string }
    if (w.__MINGLI_AI_URL__) return w.__MINGLI_AI_URL__
  }
  return (import.meta.env.VITE_GEMINI_PROXY_URL as string | undefined) ?? ''
}

export const clipQuestion = (q: string) => [...q].slice(0, MAX_QUESTION).join('')

// ───────── 組盤面事實 ─────────

const POSITIONS = ['過去', '現在', '接下來'] as const

export function tarotFacts(cards: readonly DrawnCard[]): Record<string, unknown> {
  return {
    spread: '三張牌陣',
    cards: cards.map((c, k) => ({
      position: POSITIONS[k],
      name: c.card.zh,
      orientation: c.reversed ? '逆位' : '正位',
      keyword: c.reversed ? c.card.reversed : c.card.upright,
    })),
  }
}

export function meihuaFacts(r: MeihuaResult): Record<string, unknown> {
  return {
    main: { name: r.name, upper: r.upper, lower: r.lower },
    mutual: { name: r.mutual.name },
    changed: { name: r.changed.name },
    movingLine: r.moving,
    ti: { trigram: r.ti, element: r.tiElement },
    yong: { trigram: r.yong, element: r.yongElement },
    relation: r.relation,
    level: r.level,
  }
}

const layerFacts = (l: HoroscopeLayer) => ({
  ganzhi: `${l.stem}${l.branch}`,
  soulBranch: l.soulBranch,
  mutagens: l.mutagens.map((m) => ({ star: m.star, mutagen: m.mutagen, branch: m.branch })),
})

// 選了運限層時多帶的資料：日期、各層命宮與四化，以及流年星、歲前、將前的落宮（只放有星的宮，控制長度）
function horoscopeFacts(h: HoroscopeFacts): Record<string, unknown> {
  const yearlyStars: Record<string, string[]> = {}
  for (const [b, names] of Object.entries(h.yearly.stars)) if (names.length) yearlyStars[b] = names
  return {
    date: h.solarDate,
    lunar: `${h.lunar.year}年${h.lunar.month}月${h.lunar.day}日`,
    nominalAge: h.nominalAge,
    decadal: layerFacts(h.decadal),
    age: layerFacts(h.age),
    yearly: layerFacts(h.yearly),
    monthly: layerFacts(h.monthly),
    daily: layerFacts(h.daily),
    yearlyStars,
    suiqian: h.yearly.suiqian,
    jiangqian: h.yearly.jiangqian,
  }
}

// 不放 lunarDate／chineseDate（等於生日原文），只放排好的宮位與星曜；有帶 hs 就多一份 horoscope
export function ziweiFacts(f: ZiweiFacts, hs?: HoroscopeFacts): Record<string, unknown> {
  return {
    ...(hs ? { horoscope: horoscopeFacts(hs) } : {}),
    fiveElementsClass: f.fiveElementsClass,
    soul: f.soul,
    body: f.body,
    soulBranch: f.soulBranch,
    bodyBranch: f.bodyBranch,
    palaces: f.palaces.map((p) => ({
      name: p.name,
      branch: p.branch,
      stem: p.stem,
      isSoul: p.isSoul,
      isBody: p.isBody,
      majorStars: p.majorStars,
      minorStars: p.minorStars,
    })),
  }
}

// ───────── 回傳檢查 ─────────

const TRIGRAMS: Trigram[] = ['乾', '兌', '離', '震', '巽', '坎', '艮', '坤']
const HEXAGRAM_NAME_LIST = TRIGRAMS.flatMap((u) => TRIGRAMS.map((l) => hexagramName(u, l)))
// iztro 的輔星十四顆
// 運限會出現的星：運／流／月／日的魁鉞昌曲祿羊陀馬鸞喜、年解，以及歲前十二、將前十二
const HORO_KINDS = ['魁', '鉞', '昌', '曲', '祿', '羊', '陀', '馬', '鸞', '喜']
export const HOROSCOPE_STAR_NAMES = [
  ...['運', '流', '月', '日'].flatMap((p) => HORO_KINDS.map((k) => `${p}${k}`)),
  '年解',
  '歲建', '晦氣', '喪門', '貫索', '官符', '小耗', '大耗', '龍德', '白虎', '天德', '弔客', '病符',
  '將星', '攀鞍', '歲驛', '息神', '華蓋', '劫煞', '災煞', '天煞', '指背', '咸池', '月煞', '亡神',
]
export const MINOR_STAR_NAMES = [
  '左輔', '右弼', '文昌', '文曲', '天魁', '天鉞', '祿存', '天馬', '擎羊', '陀羅', '火星', '鈴星', '地空', '地劫',
] as const

// 同時是日常用語的牌名／星名：只有用「」框起來才算提到牌
const COMMON_WORDS = new Set(['力量', '正義', '世界', '太陽', '月亮', '星星', '節制', '審判'])

// 由長到短逐字掃描，回傳文字裡提到的名稱（避免「皇后」誤判成「聖杯皇后」的一部分）
function mentionedNames(text: string, names: readonly string[], common: ReadonlySet<string> = new Set()): string[] {
  const sorted = [...new Set(names)].sort((a, b) => b.length - a.length)
  const found: string[] = []
  let i = 0
  while (i < text.length) {
    const hit = sorted.find((n) => text.startsWith(n, i))
    if (!hit) {
      i++
      continue
    }
    const quoted = text[i - 1] === '「' && text[i + hit.length] === '」'
    if (!common.has(hit) || quoted) found.push(hit)
    i += hit.length
  }
  return found
}

type Obj = Record<string, unknown>
const asObj = (v: unknown): Obj => (typeof v === 'object' && v !== null ? (v as Obj) : {})
const asArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const str = (v: unknown): string => (typeof v === 'string' ? v : '')

// facts 裡實際出現的名稱，以及該術數全部可能的名稱
function nameSets(kind: AiKind, facts: Obj): { allowed: Set<string>; universe: readonly string[]; common: ReadonlySet<string> } {
  if (kind === 'tarot') {
    return {
      allowed: new Set(asArr(facts.cards).map((c) => str(asObj(c).name))),
      universe: CARDS.map((c) => c.zh),
      common: COMMON_WORDS,
    }
  }
  if (kind === 'meihua') {
    return {
      allowed: new Set([facts.main, facts.mutual, facts.changed].map((h) => str(asObj(h).name))),
      universe: HEXAGRAM_NAME_LIST,
      common: new Set(),
    }
  }
  const stars = asArr(facts.palaces).flatMap((p) => [...asArr(asObj(p).majorStars), ...asArr(asObj(p).minorStars)])
  // 運限裡的名字：facts.horoscope 內出現的字串（流年星、歲前、將前、各層四化的星）
  const horo = asObj(facts.horoscope)
  const horoNames = new Set<string>()
  const walk = (v: unknown) => {
    if (typeof v === 'string') horoNames.add(v)
    else if (Array.isArray(v)) v.forEach(walk)
    else if (typeof v === 'object' && v !== null) Object.values(v).forEach(walk)
  }
  walk(horo)
  return {
    allowed: new Set([...stars.map((s) => str(asObj(s).name)), ...horoNames]),
    universe: [...MAJOR_STAR_NAMES, ...MINOR_STAR_NAMES, ...HOROSCOPE_STAR_NAMES],
    common: new Set(),
  }
}

const isIsoDate = (s: unknown): s is string => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}
const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0

// 通過回傳整理過的 AiReading，不過回 null
export function validateAiReading(kind: AiKind, facts: Obj, tone: AiTone, raw: unknown): AiReading | null {
  const o = asObj(raw)
  if (!nonEmpty(o.verdict) || o.tone !== tone) return null
  if (!Array.isArray(o.paragraphs) || o.paragraphs.length === 0) return null
  const paragraphs: AiParagraph[] = []
  for (const p of o.paragraphs) {
    const q = asObj(p)
    if (!nonEmpty(q.title) || !nonEmpty(q.text)) return null
    if (!Array.isArray(q.basis) || q.basis.length === 0 || !q.basis.every(nonEmpty)) return null
    paragraphs.push({ title: q.title, text: q.text, basis: q.basis as string[] })
  }
  const pr = asObj(o.prediction)
  if (!nonEmpty(pr.claim) || !isIsoDate(pr.dueDate)) return null
  const reading: AiReading = { verdict: o.verdict, tone, paragraphs, prediction: { claim: pr.claim, dueDate: pr.dueDate } }

  // 提到的牌名／卦名／星名都必須在 facts 裡
  const { allowed, universe, common } = nameSets(kind, facts)
  const text = [reading.verdict, reading.prediction.claim, ...paragraphs.flatMap((p) => [p.title, p.text, ...p.basis])]
    .join('\n')
    .replaceAll('紫微斗數', '')
  if (mentionedNames(text, universe, common).some((n) => !allowed.has(n))) return null
  return reading
}

// ───────── 呼叫代理 ─────────

export interface FetchOptions {
  url?: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
  signal?: AbortSignal
}

// 回傳通過檢查的解讀；沒網址、網路錯誤、非 200、逾時、檢查沒過一律回 null
export async function fetchAiReading(req: AiRequest, opts: FetchOptions = {}): Promise<AiReading | null> {
  const url = opts.url ?? proxyUrl()
  if (!url) return null
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? AI_TIMEOUT_MS)
  opts.signal?.addEventListener('abort', () => ctrl.abort(), { once: true })
  try {
    const res = await (opts.fetchImpl ?? fetch)(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...req, question: clipQuestion(req.question) }),
      signal: ctrl.signal,
    })
    if (res.status !== 200) return null
    return validateAiReading(req.kind, req.facts, req.tone, await res.json())
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
