import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

// 對外文案不拿「算得準」當賣點：這些字眼一出現就紅燈
const REPO = join(__dirname, '..', '..', '..')

export const BANNED = ['保證', '一定準', '百分之百準', '100%準', '100% 準', '神準', '鐵口直斷']

// 否定說法允許（免聲明會寫「不保證預測結果」）：掃之前先拿掉這些片語
export const NEGATED = /(?:不|無法|不能|並不|沒辦法)保證|不一定準/g

// 例外清單：{ file: 相對專案根目錄的路徑, word: 允許出現的禁用字, reason: 為什麼可以 }
// 沒有充分理由不要加；每一筆都要寫理由
export const EXCEPTIONS: { file: string; word: string; reason: string }[] = [
  { file: 'src/mingli/ai.ts', word: '保證', reason: '這是擋 AI 回覆用的絕對化字眼規則（ABSOLUTE_RE），不是對外文案' },
]

export function findBanned(text: string): string[] {
  const cleaned = text.replace(NEGATED, '')
  return BANNED.filter((w) => cleaned.includes(w))
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) return f === '__tests__' ? [] : walk(p)
    return /\.tsx?$/.test(f) ? [p] : []
  })
}

function targets(): string[] {
  const cards = join(REPO, 'functions', 'gemini-proxy', 'cards')
  return [
    ...walk(join(REPO, 'src', 'mingli')),
    join(REPO, 'index.html'),
    join(REPO, 'vite.config.ts'),
    ...readdirSync(cards).filter((f) => f.endsWith('.json')).map((f) => join(cards, f)),
  ]
}

describe('對外文案禁用字', () => {
  it('掃描器本身有效：禁用字抓得到、否定說法放行', () => {
    expect(findBanned('我們保證準確')).toEqual(['保證'])
    expect(findBanned('這是神準的鐵口直斷')).toEqual(['神準', '鐵口直斷'])
    expect(findBanned('命理內容僅供參考，不保證預測結果')).toEqual([])
    expect(findBanned('不一定準，也無法保證')).toEqual([])
  })

  it('檢查範圍有東西可掃（防路徑寫錯變成空掃）', () => {
    const list = targets()
    expect(list.length).toBeGreaterThan(20)
    expect(list.some((f) => f.endsWith('index.html'))).toBe(true)
    expect(list.some((f) => f.endsWith('tarot.json'))).toBe(true)
  })

  it('src/mingli、index.html、vite.config.ts、知識卡都沒有禁用字', () => {
    const hits: string[] = []
    for (const f of targets()) {
      const r = relative(REPO, f)
      for (const w of findBanned(readFileSync(f, 'utf8'))) {
        if (EXCEPTIONS.some((e) => e.file === r && e.word === w && e.reason.trim())) continue
        hits.push(`${r} 出現「${w}」`)
      }
    }
    expect(hits).toEqual([])
  })

  it('例外清單每一筆都有理由', () => {
    for (const e of EXCEPTIONS) expect(e.reason.trim().length).toBeGreaterThan(0)
  })
})

describe('路由：隱私與免責頁', () => {
  const app = readFileSync(join(REPO, 'src', 'mingli', 'MingliApp.tsx'), 'utf8')
  it('KNOWN_PATHS 與 switch 都有 /privacy、/terms（沒有才會被導回首頁）', () => {
    const known = app.match(/const KNOWN_PATHS = \[([^\]]*)\]/)?.[1] ?? ''
    for (const p of ['/privacy', '/terms']) {
      expect(known).toContain(`'${p}'`)
      expect(app).toContain(`case '${p}':`)
    }
  })
})
