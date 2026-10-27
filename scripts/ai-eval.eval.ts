// 真 AI 實測（會花錢，不要放進一般測試）：npm run ai-eval
// 環境變數：AI_EVAL_URL（線上代理網址，必填）、AI_EVAL_SUITE（basic／repeat，沒設兩組都跑）
// 依序呼叫、每次間隔 1 秒；報告寫到 qa-reports/ai-eval-<台灣日期>.md
import { mkdirSync, writeFileSync } from 'node:fs'
import { afterAll, describe, expect, it } from 'vitest'
import {
  mentionedLines,
  mentionedOrientations,
  meihuaFacts,
  tarotFacts,
  validateAiReading,
  ziweiFacts,
} from '../src/mingli/ai'
import type { AiFocus, AiKind, AiTone } from '../src/mingli/ai'
import { castByNumbers, templateReading as meihuaTemplate } from '../src/mingli/meihua/engine'
import { drawThree, mulberry32, templateReading as tarotTemplate } from '../src/mingli/tarot/engine'
import { buildChart, horoscope } from '../src/mingli/ziwei/engine'
import { mean, overlapRate, taiwanDate } from './ai-eval-lib.mjs'

const PROXY_URL = process.env.AI_EVAL_URL ?? ''
const SUITE = process.env.AI_EVAL_SUITE ?? ''
const ORIGIN = 'https://mingli-yuxuan.web.app'
const TODAY = '2026-10-27' // 紫微運限的基準日，固定才有可比性
const SEED = 20261027
const COUNT = 20
const REPEAT_TIMES = 3
const PASS_BASIC = COUNT
const PASS_OVERLAP = 0.8

const OFFSET: Record<AiKind, number> = { tarot: 100, meihua: 200, ziwei: 300 }

const wantBasic = !SUITE || SUITE === 'basic'
const wantRepeat = !SUITE || SUITE === 'repeat'

interface Case {
  kind: AiKind
  question: string
  facts: Record<string, unknown>
  tone: AiTone
  focus?: AiFocus
  label: string
}

const QUESTIONS = [
  '這個月適合換工作嗎', '我和他的感情會有進展嗎', '今年財運如何', '要不要搬家', '這個合作該不該接',
  '身體狀況會好轉嗎', '考試能順利通過嗎', '該不該創業', '最近的人際關係怎麼走', '投資這檔要不要出手',
  '家人的關係能緩和嗎', '要不要出國進修', '新專案能順利上線嗎', '單身什麼時候脫離', '這份offer要不要簽',
  '和朋友的誤會能解開嗎', '最近運勢整體如何', '要不要買房', '副業值得投入嗎', '面試會不會有結果',
]

// 固定亂數種子：同一個 SEED 每次產生一模一樣的案例
function makeCases(kind: AiKind, n: number, seedOffset: number): Case[] {
  const rnd = mulberry32(SEED + seedOffset)
  const int = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1))
  const out: Case[] = []
  for (let k = 0; k < n; k++) {
    const question = QUESTIONS[k % QUESTIONS.length]
    if (kind === 'tarot') {
      const picks = new Set<number>()
      while (picks.size < 3) picks.add(int(0, 77))
      const drawn = drawThree(int(1, 99999), [...picks] as [number, number, number])
      out.push({ kind, question, facts: tarotFacts(drawn), tone: tarotTemplate(drawn).tone, label: `塔羅#${k + 1}` })
    } else if (kind === 'meihua') {
      const r = castByNumbers(int(1, 999), int(1, 999))
      out.push({ kind, question, facts: meihuaFacts(r), tone: meihuaTemplate(r).tone, label: `梅花#${k + 1}` })
    } else {
      const input = { solarDate: `${int(1960, 2005)}-${String(int(1, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`, timeIndex: int(0, 12), gender: int(0, 1) ? ('男' as const) : ('女' as const) }
      // 一生／今年／這個月輪流
      const focus = (['natal', 'yearly', 'monthly'] as const)[k % 3]
      const chart = buildChart(input)
      const facts = ziweiFacts(chart, focus === 'natal' ? undefined : horoscope(input, TODAY), focus)
      out.push({ kind, question: k % 2 ? '' : question, facts, tone: '平', focus, label: `紫微#${k + 1}(${focus})` })
    }
  }
  return out
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

interface Outcome {
  ok: boolean
  reason: string
  cardIds: Set<string> | null
}

// 看哪一條檢查沒過（validateAiReading 只回 null，這裡逐條探測給報告用）
function diagnose(c: Case, raw: unknown): string {
  const o = (raw ?? {}) as Record<string, unknown>
  if (o.tone !== c.tone) return `tone 不一致（回 ${String(o.tone)}，要 ${c.tone}）`
  const paras = Array.isArray(o.paragraphs) ? (o.paragraphs as Record<string, unknown>[]) : []
  if (paras.length === 0) return '沒有 paragraphs'
  if (paras.some((p) => !Array.isArray(p.cards) || p.cards.length === 0)) return '有段落沒有 cards'
  if (paras.some((p) => !Array.isArray(p.basis) || p.basis.length === 0)) return '有段落 basis 是空的'
  const text = JSON.stringify(raw)
  if (c.kind === 'meihua') {
    const moving = c.facts.movingLine as number
    const bad = mentionedLines(text).find((n) => n !== moving)
    if (bad !== undefined) return `爻位越界（提到第 ${bad} 爻，動爻是 ${moving}）`
  }
  if (c.kind === 'tarot') {
    const drawn = new Map((c.facts.cards as { name: string; orientation: string }[]).map((x) => [x.name, x.orientation]))
    const bad = mentionedOrientations(text).find((m) => drawn.has(m.name) && drawn.get(m.name) !== m.orientation)
    if (bad) return `正逆位越界（${bad.name}${bad.orientation}）`
  }
  return '名稱越界或欄位格式不對（牌／卦／星名不在盤上、dueDate、cards 欄位等）'
}

async function callOnce(c: Case): Promise<Outcome> {
  let res: Response
  try {
    res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
      body: JSON.stringify({ kind: c.kind, question: c.question, facts: c.facts, tone: c.tone, ...(c.focus ? { focus: c.focus } : {}) }),
    })
  } catch (e) {
    return { ok: false, reason: `連線失敗：${(e as Error).message}`, cardIds: null }
  }
  if (res.status !== 200) return { ok: false, reason: `HTTP ${res.status}`, cardIds: null }
  let json: unknown
  try {
    json = await res.json()
  } catch {
    return { ok: false, reason: '回應不是 JSON', cardIds: null }
  }
  const reading = validateAiReading(c.kind, c.facts, c.tone, json)
  if (!reading) return { ok: false, reason: diagnose(c, json), cardIds: null }
  return { ok: true, reason: '', cardIds: new Set(reading.paragraphs.flatMap((p) => p.cards.map((x) => x.id))) }
}

// ───────── 結果收集與報告 ─────────

const basicResult: Record<string, { pass: number; total: number; fails: string[] }> = {}
const repeatResult: { kind: string; label: string; rate: number; note: string }[] = []

const pct = (x: number) => `${(x * 100).toFixed(1)}%`

function report(): string {
  const lines = [
    `# AI 解讀實測報告 ${taiwanDate()}`,
    '',
    '## 驗收門檻',
    '',
    `- basic：塔羅、梅花、紫微每種 ${PASS_BASIC}/${COUNT} 通過`,
    `- repeat：總平均重疊率 ≥ ${pct(PASS_OVERLAP)}`,
    '',
    `代理：${PROXY_URL ? '（已設定 AI_EVAL_URL）' : '（未設定）'} ｜ 種子：${SEED} ｜ 基準日：${TODAY}`,
    '',
  ]
  if (Object.keys(basicResult).length) {
    lines.push('## basic：每種術數的通過份數', '', '| 術數 | 通過 | 結果 |', '|---|---|---|')
    for (const [k, v] of Object.entries(basicResult)) lines.push(`| ${k} | ${v.pass}/${v.total} | ${v.pass >= PASS_BASIC ? '通過' : '未達標'} |`)
    lines.push('')
    for (const [k, v] of Object.entries(basicResult)) {
      if (!v.fails.length) continue
      lines.push(`### ${k} 不過的原因`, '', ...v.fails.map((f) => `- ${f}`), '')
    }
  }
  if (repeatResult.length) {
    const total = mean(repeatResult.map((r) => r.rate))
    lines.push(`## repeat：同題 ${REPEAT_TIMES} 次的引用卡號重疊率`, '', `總平均：**${pct(total)}**（${total >= PASS_OVERLAP ? '通過' : '未達標'}）`, '')
    for (const kind of [...new Set(repeatResult.map((r) => r.kind))]) {
      const rows = repeatResult.filter((r) => r.kind === kind)
      lines.push(`### ${kind}（平均 ${pct(mean(rows.map((r) => r.rate)))}）`, '', '| 題目 | 重疊率 | 備註 |', '|---|---|---|')
      for (const r of rows) lines.push(`| ${r.label} | ${pct(r.rate)} | ${r.note} |`)
      lines.push('')
    }
  }
  return lines.join('\n')
}

afterAll(() => {
  if (!Object.keys(basicResult).length && !repeatResult.length) return
  mkdirSync('qa-reports', { recursive: true })
  const file = `qa-reports/ai-eval-${taiwanDate()}.md`
  writeFileSync(file, report())
  console.log(`報告已寫到 ${file}`)
})

const KINDS: [AiKind, string][] = [['tarot', '塔羅'], ['meihua', '梅花'], ['ziwei', '紫微']]

describe.skipIf(!PROXY_URL)('AI 實測', () => {
  it.runIf(wantBasic)('basic：三種術數各 20 份', async () => {
    for (const [kind, name] of KINDS) {
      const cases = makeCases(kind, COUNT, OFFSET[kind])
      const rec = { pass: 0, total: cases.length, fails: [] as string[] }
      basicResult[name] = rec
      for (const c of cases) {
        const out = await callOnce(c)
        if (out.ok) rec.pass++
        else rec.fails.push(`${c.label}：${out.reason}`)
        await sleep(1000)
      }
    }
    for (const [, name] of KINDS) expect(basicResult[name].pass).toBeGreaterThanOrEqual(PASS_BASIC)
  })

  it.runIf(wantRepeat)('repeat：塔羅、梅花各 20 題 × 3 次', async () => {
    for (const [kind, name] of KINDS.filter(([k]) => k !== 'ziwei')) {
      for (const c of makeCases(kind, COUNT, 7000 + OFFSET[kind])) {
        const runs: (Set<string> | null)[] = []
        let failed = 0
        for (let t = 0; t < REPEAT_TIMES; t++) {
          const out = await callOnce(c)
          runs.push(out.cardIds)
          if (!out.ok) failed++
          await sleep(1000)
        }
        repeatResult.push({ kind: name, label: `${c.label} ${c.question}`, rate: overlapRate(runs), note: failed ? `${failed} 次失敗（算 0）` : '' })
      }
    }
    expect(mean(repeatResult.map((r) => r.rate))).toBeGreaterThanOrEqual(PASS_OVERLAP)
  })
})
