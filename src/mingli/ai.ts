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
export type AiFocus = 'natal' | 'decadal' | 'yearly' | 'monthly' | 'daily'

export interface AiRequest {
  kind: AiKind
  question: string
  // 只放排好的盤，不放生日原文、姓名
  facts: Record<string, unknown>
  tone: AiTone
  // 只有紫微會帶：使用者想看哪一段時間（natal＝一生）
  focus?: AiFocus
}

// 該段依據的知識卡（後端查表後附上）
export interface AiCardRef {
  id: string
  title: string
  source: string
}

export interface AiParagraph {
  title: string
  text: string
  basis: string[]
  cards: AiCardRef[]
}

// 問題涉及的敏感話題：解讀最上面要顯示提醒
export type AiNotice = 'medical' | 'investment' | 'legal'
export const AI_NOTICES: readonly AiNotice[] = ['medical', 'investment', 'legal']
export const AI_NOTICE_TEXT: Record<AiNotice, string> = {
  medical: '這題涉及健康，以下只談心態與方向，身體狀況請找醫師',
  investment: '這題涉及投資理財，以下只談心態與方向，買賣決定請諮詢理財顧問',
  legal: '這題涉及法律問題，以下只談心態與方向，具體權益請諮詢律師',
}

export interface AiReading {
  verdict: string
  tone: AiTone
  paragraphs: AiParagraph[]
  prediction: { claim: string; dueDate: string }
  notice?: AiNotice[]
}

// 後端婉拒（問壽命生死、輕生念頭）：不是解讀，畫面直接顯示 message
export interface AiRefusal {
  refusal: { kind: 'death' | 'selfharm'; message: string }
}
export const isAiRefusal = (r: object): r is AiRefusal => 'refusal' in r
// 後端回 429：今天的全站次數用完（跟其他失敗分開，畫面才講得清楚）
export interface AiLimited { limited: true }
export const isAiLimited = (r: object): r is AiLimited => 'limited' in r
export const AI_LIMIT_TEXT = '今天的 AI 次數用完了，台灣時間午夜重置'

// 超過這麼久沒回就退回範本
export const AI_TIMEOUT_MS = 30_000
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

// 選了運限層時多帶的資料：日期，以及「選中那一層」的命宮與四化（大限只在選別層時附上當背景）。
// 流年另帶流年星、歲前、將前的落宮（只放有星的宮，控制長度）；不帶其他層
function horoscopeFacts(h: HoroscopeFacts, focus: Exclude<AiFocus, 'natal'>): Record<string, unknown> {
  const layer = h[focus]
  const stars: Record<string, string[]> = {}
  for (const [b, names] of Object.entries(layer.stars)) if (names.length) stars[b] = names
  return {
    date: h.solarDate,
    lunar: `${h.lunar.year}年${h.lunar.month}月${h.lunar.day}日`,
    nominalAge: h.nominalAge,
    focus,
    ...(focus === 'decadal' ? {} : { decadal: layerFacts(h.decadal) }),
    [focus]: layerFacts(layer),
    layerStars: stars,
    ...(focus === 'yearly' ? { suiqian: h.yearly.suiqian, jiangqian: h.yearly.jiangqian } : {}),
  }
}

// 不放 lunarDate／chineseDate（等於生日原文），只放排好的宮位與星曜；有帶 hs 就多一份 horoscope
export function ziweiFacts(f: ZiweiFacts, hs?: HoroscopeFacts, focus: AiFocus = 'natal'): Record<string, unknown> {
  return {
    ...(hs && focus !== 'natal' ? { horoscope: horoscopeFacts(hs, focus) } : {}),
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

// ───────── 越界檢查：爻位、正逆位 ─────────

const LINE_NUM: Record<string, number> = { 初: 1, 二: 2, 三: 3, 四: 4, 五: 5, 上: 6, 一: 1, 六: 6 }

// 文字裡提到的爻位（1～6）：初爻、二～五爻、上爻、第N爻；「六爻」「動爻」「爻辭」不算
export function mentionedLines(text: string): number[] {
  const found: number[] = []
  for (const m of text.matchAll(/([初二三四五上])爻/g)) found.push(LINE_NUM[m[1]])
  for (const m of text.matchAll(/第\s*([1-6一二三四五六])\s*爻/g)) found.push(LINE_NUM[m[1]] ?? Number(m[1]))
  return found
}

const CARD_ORIENT_RE = new RegExp(`「?(${[...new Set(CARDS.map((c) => c.zh))].sort((a, b) => b.length - a.length).join('|')})」?\\s*(正位|逆位)`, 'g')

// 文字裡「牌名＋正位／逆位」的組合
export function mentionedOrientations(text: string): { name: string; orientation: string }[] {
  return [...text.matchAll(CARD_ORIENT_RE)].map((m) => ({ name: m[1], orientation: m[2] }))
}

// 絕對化字眼：一定、必定、絕對、保證、百分之百、100%、肯定會。規則與後端 functions/gemini-proxy/safety.js 一致，改一邊要改另一邊
const ABSOLUTE_RE = /一定|必定|絕對|保證|百分之百|100[%％]|肯定會/g
// 前面緊接這些字就是否定（不一定、未必一定、不保證、不見得一定）
const NEGATION_TAIL = /(不|未必|不見得|不是|並非|非|無法|沒辦法|難以|不能)$/
// 「一定的」「一定程度」是某個程度的意思，不是絕對
const SOFT_AFTER = /^(的|程度|範圍|限度|水準|數量|比例|機率)/

// 回傳文字裡出現的絕對化字眼（不重複）；被否定的不算
export function findAbsolute(text: string): string[] {
  const found = new Set<string>()
  for (const m of text.matchAll(ABSOLUTE_RE)) {
    const at = m.index ?? 0
    if (NEGATION_TAIL.test(text.slice(Math.max(0, at - 4), at))) continue
    if (m[0] === '一定' && SOFT_AFTER.test(text.slice(at + m[0].length))) continue
    found.add(m[0])
  }
  return [...found]
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
    if (!Array.isArray(q.cards) || q.cards.length === 0) return null
    const cards: AiCardRef[] = []
    for (const c of q.cards) {
      const r = asObj(c)
      if (!nonEmpty(r.id) || !nonEmpty(r.title) || !nonEmpty(r.source)) return null
      cards.push({ id: r.id, title: r.title, source: r.source })
    }
    paragraphs.push({ title: q.title, text: q.text, basis: q.basis as string[], cards })
  }
  const pr = asObj(o.prediction)
  if (!nonEmpty(pr.claim) || !isIsoDate(pr.dueDate)) return null
  const reading: AiReading = { verdict: o.verdict, tone, paragraphs, prediction: { claim: pr.claim, dueDate: pr.dueDate } }
  const notice = asArr(o.notice).filter((n): n is AiNotice => AI_NOTICES.includes(n as AiNotice))
  if (notice.length > 0) reading.notice = [...new Set(notice)]

  // 提到的牌名／卦名／星名都必須在 facts 裡
  const { allowed, universe, common } = nameSets(kind, facts)
  const text = [reading.verdict, reading.prediction.claim, ...paragraphs.flatMap((p) => [p.title, p.text, ...p.basis])]
    .join('\n')
    .replaceAll('紫微斗數', '')
  if (mentionedNames(text, universe, common).some((n) => !allowed.has(n))) return null
  // 絕對化字眼視同檢查沒過
  if (findAbsolute(text).length > 0) return null
  // 梅花：只能提動爻那一爻
  if (kind === 'meihua' && typeof facts.movingLine === 'number') {
    if (mentionedLines(text).some((n) => n !== facts.movingLine)) return null
  }
  // 塔羅：牌名後面接的正逆位要和抽到的一致
  if (kind === 'tarot') {
    const drawn = new Map(asArr(facts.cards).map((c) => [str(asObj(c).name), str(asObj(c).orientation)]))
    if (mentionedOrientations(text).some((m) => drawn.has(m.name) && drawn.get(m.name) !== m.orientation)) return null
  }
  return reading
}

// ───────── 呼叫代理 ─────────

export interface FetchOptions {
  url?: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
  signal?: AbortSignal
}

// 回傳通過檢查的解讀，或後端的婉拒（{ refusal }）；沒網址、網路錯誤、非 200、逾時、檢查沒過一律回 null
export async function fetchAiReading(req: AiRequest, opts: FetchOptions = {}): Promise<AiReading | AiRefusal | AiLimited | null> {
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
    if (res.status === 429) return { limited: true }
    if (res.status !== 200) return null
    const json: unknown = await res.json()
    const rf = asObj(asObj(json).refusal)
    if ('refusal' in asObj(json)) {
      return (rf.kind === 'death' || rf.kind === 'selfharm') && nonEmpty(rf.message) ? { refusal: { kind: rf.kind, message: rf.message } } : null
    }
    return validateAiReading(req.kind, req.facts, req.tone, json)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// ───────── 網站狀態（維護頁用）─────────

export interface SiteStatus {
  ai: boolean
  maintenance: boolean
}

// GET 代理網址拿 AI 開關與維護狀態；沒網址、網路錯誤、非 200、格式不對一律當作正常，不擋使用者
export async function fetchSiteStatus(opts: { url?: string; fetchImpl?: typeof fetch } = {}): Promise<SiteStatus> {
  const fallback: SiteStatus = { ai: true, maintenance: false }
  const url = opts.url ?? proxyUrl()
  if (!url) return fallback
  try {
    const res = await (opts.fetchImpl ?? fetch)(url, { method: 'GET' })
    if (res.status !== 200) return fallback
    const j = asObj(await res.json())
    if (typeof j.ai !== 'boolean' || typeof j.maintenance !== 'boolean') return fallback
    return { ai: j.ai, maintenance: j.maintenance }
  } catch {
    return fallback
  }
}

// ───────── 紫微追問 ─────────

export const MAX_FOLLOWUP_HISTORY = 8
export const MAX_HISTORY_Q = 200
export const MAX_HISTORY_A = 600

export type FollowupFocus = Exclude<AiFocus, 'natal'>
const FOLLOWUP_FOCUS: readonly FollowupFocus[] = ['decadal', 'yearly', 'monthly', 'daily']

export interface FollowupTurn {
  q: string
  a: string
}

export interface FollowupRequest {
  question: string
  facts: Record<string, unknown>
  focus: AiFocus
  history: FollowupTurn[]
}

// 追問的回答：answer／cards 有依據與知識卡；recompute 要前端切到指定層與日期再問一次；refuse 是後端拒答
export type FollowupResult =
  | { action: 'answer' | 'cards'; text: string; basis: string[]; cards: AiCardRef[]; notice?: AiNotice[] }
  | { action: 'recompute'; text: string; target: { focus: FollowupFocus; date: string } }
  | { action: 'refuse'; text: string }

const clipBy = (s: string, n: number) => [...s].slice(0, n).join('')

// 對話串裡的一筆：解讀（按「AI 解讀這張盤」成功的那份）或追問
export type ThreadEntry =
  | { type: 'reading'; q: string; layer: AiFocus; date: string; reading: AiReading }
  | { type: 'followup'; q: string; layer: AiFocus; date: string; result: FollowupResult }

// 取整串最後 8 筆給後端當上下文：reading 的 q 空的寫「整體運勢」、a 是一句話＋各段文字；followup 的 a 是回答（recompute 是那句說明）
export function buildHistory(entries: readonly ThreadEntry[]): FollowupTurn[] {
  return entries.slice(-MAX_FOLLOWUP_HISTORY).map((e) => {
    if (e.type === 'reading') {
      const q = e.q.trim() || '整體運勢'
      const a = [e.reading.verdict, ...e.reading.paragraphs.map((p) => p.text)].join('\n')
      return { q: clipBy(q, MAX_HISTORY_Q), a: clipBy(a, MAX_HISTORY_A) }
    }
    return { q: clipBy(e.q, MAX_HISTORY_Q), a: clipBy(e.result.text, MAX_HISTORY_A) }
  })
}

// 通過回傳整理過的回答，不過回 null
export function validateFollowup(facts: Obj, raw: unknown, notice?: unknown): FollowupResult | null {
  const o = asObj(raw)
  if (!nonEmpty(o.text)) return null
  if (o.action === 'refuse') return { action: 'refuse', text: o.text }
  if (o.action === 'recompute') {
    const t = asObj(o.target)
    if (!FOLLOWUP_FOCUS.includes(t.focus as FollowupFocus) || !isIsoDate(t.date)) return null
    return { action: 'recompute', text: o.text, target: { focus: t.focus as FollowupFocus, date: t.date } }
  }
  if (o.action !== 'answer' && o.action !== 'cards') return null
  if (!Array.isArray(o.basis) || !o.basis.every(nonEmpty)) return null
  if (!Array.isArray(o.cards)) return null
  const cards: AiCardRef[] = []
  for (const c of o.cards) {
    const r = asObj(c)
    if (!nonEmpty(r.id) || !nonEmpty(r.title) || !nonEmpty(r.source)) return null
    cards.push({ id: r.id, title: r.title, source: r.source })
  }
  if (o.action === 'cards' && cards.length === 0) return null
  // 提到的星名都必須在 facts 裡、不可有絕對化字眼
  const { allowed, universe, common } = nameSets('ziwei', facts)
  const text = [o.text, ...(o.basis as string[])].join('\n').replaceAll('紫微斗數', '')
  if (mentionedNames(text, universe, common).some((n) => !allowed.has(n))) return null
  if (findAbsolute(text).length > 0) return null
  const result: FollowupResult = { action: o.action, text: o.text, basis: o.basis as string[], cards }
  const nt = asArr(notice).filter((n): n is AiNotice => AI_NOTICES.includes(n as AiNotice))
  if (nt.length > 0) result.notice = [...new Set(nt)]
  return result
}

// 紫微追問：回傳通過檢查的回答、後端的婉拒（{ refusal }）或 null（沒網址、網路錯誤、非 200、逾時、格式不對、檢查沒過）
export async function fetchFollowup(req: FollowupRequest, opts: FetchOptions = {}): Promise<FollowupResult | AiRefusal | AiLimited | null> {
  const url = opts.url ?? proxyUrl()
  if (!url) return null
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? AI_TIMEOUT_MS)
  opts.signal?.addEventListener('abort', () => ctrl.abort(), { once: true })
  try {
    const history = req.history.slice(-MAX_FOLLOWUP_HISTORY).map((h) => ({ q: clipBy(h.q, MAX_HISTORY_Q), a: clipBy(h.a, MAX_HISTORY_A) }))
    const res = await (opts.fetchImpl ?? fetch)(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'ziwei', mode: 'followup', question: clipQuestion(req.question), facts: req.facts, tone: '平', focus: req.focus, history }),
      signal: ctrl.signal,
    })
    if (res.status === 429) return { limited: true }
    if (res.status !== 200) return null
    const json = asObj(await res.json())
    if ('refusal' in json) {
      const rf = asObj(json.refusal)
      return (rf.kind === 'death' || rf.kind === 'selfharm') && nonEmpty(rf.message) ? { refusal: { kind: rf.kind, message: rf.message } } : null
    }
    return validateFollowup(req.facts, json.followup, json.notice)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
