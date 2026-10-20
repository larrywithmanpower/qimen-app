// 範本說明：用規則拼短句，不接 AI。只用命盤事實，不下嚇人的斷語
import type { ZiweiFacts, ZiweiPalace } from '../engine'

export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const

// 四化各自的白話意思
const MUTAGEN_TEXT: Record<string, string> = {
  祿: '比較有資源與機會流進來',
  權: '比較有主導力，適合帶頭做決定',
  科: '比較有名聲與貴人幫忙',
  忌: '比較容易在意、放不下，這一面要多留心',
}

export interface PalaceReadout {
  title: string
  sentences: string[]
  basis: string
}

const starText = (p: ZiweiPalace) =>
  p.majorStars.map((s) => (s.mutagen ? `${s.name}化${s.mutagen}` : s.name)).join('、')

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
    p.majorStars.filter((s) => s.mutagen).forEach((s) => {
      sentences.push(`${s.name}化${s.mutagen}：${MUTAGEN_TEXT[s.mutagen!] ?? '帶著這一層變化'}`)
    })
  } else if (opposite.majorStars.length) {
    sentences.push(`這一宮沒有主星，要借對宮${opposite.name}的${starText(opposite)}來看`)
  } else {
    sentences.push('這一宮和對宮都沒有主星，主要看三方的宮位')
  }
  if (p.minorStars.length) sentences.push(`輔星有${p.minorStars.slice(0, 4).join('、')}`)
  sentences.push(`三方四正看${[opposite, ...trine].map(brief).join('、')}`)

  const majors = p.majorStars.map((s) => (s.mutagen ? `${s.name}＋化${s.mutagen}` : s.name)).join('、')
  return {
    title: `${p.name}・${p.majorStars.length ? starText(p) : '空宮'}`,
    sentences,
    basis: `${p.name} ${majors || '空宮'}；三方四正 ${[opposite, ...trine].map((x) => x.name).join(' ')}`,
  }
}
