// 範本說明：用規則拼短句，不接 AI。只用命盤事實，不下嚇人的斷語
import { sortMinorStars } from '../engine'
import type { HoroscopeLayer, HoroscopeLayerKey, ZiweiFacts, ZiweiPalace, ZiweiStar } from '../engine'

export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const

// 四化各自的白話意思
const MUTAGEN_TEXT: Record<string, string> = {
  祿: '比較有資源與機會流進來',
  權: '比較有主導力，適合帶頭做決定',
  科: '比較有名聲與貴人幫忙',
  忌: '比較容易在意、放不下，這一面要多留心',
}

// 運限各層的白話說法：今天看「今年」，查別天就變「那一年」
export type LayerChoice = 'natal' | Exclude<HoroscopeLayerKey, 'age'>
const PERIOD_WORD: Record<'natal' | HoroscopeLayerKey, [string, string]> = {
  natal: ['一生', '一生'],
  decadal: ['這十年', '那十年'],
  age: ['小限這年', '小限那年'],
  yearly: ['今年', '那一年'],
  monthly: ['這個月', '那個月'],
  daily: ['今天', '那一天'],
}
export const periodWord = (layer: 'natal' | HoroscopeLayerKey, isToday: boolean) => PERIOD_WORD[layer][isToday ? 0 : 1]

// 運限星（流祿、運羊、月陀…）去掉前綴後的白話意思
const STAR_TEXT: Record<string, string> = {
  祿: '錢財與機會比較順',
  羊: '容易衝動、起衝突，行動前多想一下',
  陀: '事情容易卡住、拖延',
  魁: '有貴人或長輩出手幫忙',
  鉞: '有貴人或長輩出手幫忙',
  昌: '文書、考試、簽約比較有利',
  曲: '才藝、口才、表達比較突出',
  馬: '變動比較多，適合出門或換環境',
  鸞: '人緣與喜事比較旺',
  喜: '人緣與喜事比較旺',
}
const starMeaning = (name: string) => STAR_TEXT[name[name.length - 1]] ?? '帶著這一段時間的變化'
// 重要星：祿羊陀魁鉞（其餘的星只在完整清單裡列）
const KEY_STAR = /[祿羊陀魁鉞]$/

export interface PeriodCtx {
  key: HoroscopeLayerKey
  // 白話時間詞，例如「今年」「那一天」
  word: string
  L: HoroscopeLayer
}

export interface PalaceReadout {
  title: string
  sentences: string[]
  basis: string
}

const starLabel = (s: ZiweiStar) => (s.mutagen ? `${s.name}化${s.mutagen}` : s.name)

const starText = (p: ZiweiPalace) => p.majorStars.map(starLabel).join('、')

const brief = (p: ZiweiPalace) => `${p.name}（${p.majorStars.length ? p.majorStars.map((s) => s.name).join('、') : '無主星'}）`

export function palaceByBranch(facts: ZiweiFacts, branch: string): ZiweiPalace {
  const found = facts.palaces.find((p) => p.branch === branch)
  if (!found) throw new Error(`找不到地支 ${branch} 的宮位`)
  return found
}

export function palaceReadout(facts: ZiweiFacts, branch: string): PalaceReadout {
  const p = palaceByBranch(facts, branch)
  const i = BRANCHES.indexOf(branch as (typeof BRANCHES)[number])
  const at = (n: number) => palaceByBranch(facts, BRANCHES[(i + n) % 12])
  const opposite = at(6)
  const trine = [at(4), at(8)]

  const sentences: string[] = []
  if (p.majorStars.length) {
    sentences.push(`這一宮坐著${starText(p)}`)
  } else if (opposite.majorStars.length) {
    sentences.push(`這一宮沒有主星，要借對宮${opposite.name}的${starText(opposite)}來看`)
  } else {
    sentences.push('這一宮和對宮都沒有主星，主要看三方的宮位')
  }
  // 四化句：主星與輔星帶化的都算
  ;[...p.majorStars, ...p.minorStars].filter((s) => s.mutagen).forEach((s) => {
    sentences.push(`${s.name}化${s.mutagen}：${MUTAGEN_TEXT[s.mutagen!] ?? '帶著這一層變化'}`)
  })
  if (p.minorStars.length) sentences.push(`輔星有${sortMinorStars(p.minorStars).slice(0, 4).map(starLabel).join('、')}`)
  sentences.push(`三方四正看${[opposite, ...trine].map(brief).join('、')}`)

  const majors = p.majorStars.map((s) => (s.mutagen ? `${s.name}＋化${s.mutagen}` : s.name)).join('、')
  return {
    title: `${p.name}・${p.majorStars.length ? starText(p) : '空宮'}`,
    sentences,
    basis: `${p.name} ${majors || '空宮'}；三方四正 ${[opposite, ...trine].map((x) => x.name).join(' ')}`,
  }
}

const mainText = (p: ZiweiPalace) => (p.majorStars.length ? p.majorStars.map((s) => s.name).join('、') : '無主星')

// 選了「這十年／今年／這個月／今天」時的說明：講那段時間的重心、四化、重要星，以及被點的這一宮在那段時間的角色
export function periodReadout(facts: ZiweiFacts, branch: string, ctx: PeriodCtx): PalaceReadout {
  const { word, L } = ctx
  const p = palaceByBranch(facts, branch)
  const over = L.palaceNames[branch]
  const soulP = palaceByBranch(facts, L.soulBranch)
  const nameAt = (b: string) => palaceByBranch(facts, b).name

  const sentences: string[] = []
  // 被點的這一宮
  sentences.push(`${word}，這一宮的疊宮名稱是「${over}」${branch === L.soulBranch ? `，也就是${word}的重心所在` : ''}`)
  const here = L.mutagens.filter((m) => m.branch === branch)
  if (here.length) here.forEach((m) => sentences.push(`${word}${m.star}化${m.mutagen}落在這一宮：${MUTAGEN_TEXT[m.mutagen] ?? '帶著這一層變化'}`))
  else sentences.push(`${word}沒有四化落在這一宮`)
  const starsHere = L.stars[branch] ?? []
  if (starsHere.length) sentences.push(`${word}這一宮有${starsHere.join('、')}：${starMeaning(starsHere[0])}`)

  // 整段時間的總覽
  sentences.push(`整體來看，${word}的重心（命宮）落在本命的「${soulP.name}」（${L.soulBranch}宮），那一宮坐著${mainText(soulP)}`)
  L.mutagens.forEach((m) => {
    sentences.push(`${word}${m.star}化${m.mutagen}落在「${nameAt(m.branch)}」（${m.branch}宮）：${MUTAGEN_TEXT[m.mutagen] ?? '帶著這一層變化'}`)
  })
  for (const [b, names] of Object.entries(L.stars)) {
    for (const n of names.filter((x) => KEY_STAR.test(x))) sentences.push(`${n}在「${nameAt(b)}」（${b}宮）：${starMeaning(n)}`)
  }
  if (ctx.key === 'yearly' && L.suiqian) {
    const b = Object.keys(L.suiqian).find((x) => L.suiqian![x] === '歲建')
    if (b) sentences.push(`歲建在「${nameAt(b)}」（${b}宮）：${word}最先發生、最有存在感的事，多半落在這一宮的事務上`)
  }

  const muts = L.mutagens.map((m) => `${m.star}化${m.mutagen}`).join(' ')
  return {
    title: `${word}看「${p.name}」・${over}`,
    sentences,
    basis: `${word}命宮在${L.soulBranch}宮（本命${soulP.name}）；${muts || '無四化'}；${p.name}疊${over}`,
  }
}
