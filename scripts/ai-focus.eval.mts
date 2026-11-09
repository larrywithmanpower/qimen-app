// 「說到點上」實測（會花錢，不在 npm test 裡）：npx tsx scripts/ai-focus.eval.mts
// 環境變數：AI_EVAL_URL（代理網址，必填）、AI_EVAL_LABEL（報告標籤，例如 before／after）、AI_EVAL_KINDS（tarot,meihua,ziwei，沒設全跑）
// 每種術數兩組：同一張盤問 5 件不同的事、5 張不同的盤問同一件事；看解讀內容有沒有隨問題／盤面拉開
// 結果寫到 qa-reports/ai-focus-<台灣日期>-<標籤>.json（原文）與 .md（指標＋每份一句話）
import { mkdirSync, writeFileSync } from 'node:fs'
import { meihuaFacts, tarotFacts, ziweiFacts } from '../src/mingli/ai'
import type { AiKind } from '../src/mingli/ai'
import { castByNumbers, templateReading as meihuaTemplate } from '../src/mingli/meihua/engine'
import { drawThree, templateReading as tarotTemplate } from '../src/mingli/tarot/engine'
import { buildChart, horoscope } from '../src/mingli/ziwei/engine'
import { jaccard, taiwanDate } from './ai-eval-lib.mjs'

// 兩段文字的相似度：去掉標點空白後，字元二元組集合的 Jaccard
const bigrams = (t: string) => { const s = t.replace(/[\s，。、；：「」『』！？,.!?:;()（）]/g, ''); return Array.from({ length: Math.max(0, s.length - 1) }, (_, i) => s.slice(i, i + 2)) }
const similarity = (a: string, b: string) => jaccard(bigrams(a), bigrams(b))

const URL = process.env.AI_EVAL_URL ?? ''
const LABEL = process.env.AI_EVAL_LABEL ?? 'run'
const KINDS = ((process.env.AI_EVAL_KINDS ?? 'tarot,meihua,ziwei').split(',').map((k) => k.trim())) as AiKind[]
const ORIGIN = 'https://mingli-yuxuan.web.app'
if (!URL) throw new Error('要設 AI_EVAL_URL')

// 五個不同領域的問題（避開醫療、投資、法律，那幾類會加提醒、干擾比較）
const TOPICS = ['我該不該換工作？', '他還喜歡我嗎？', '這個月的財運如何？', '我跟室友的關係要怎麼改善？', '我做的 app 上架會不會成功？']
const SAME_Q = '我該不該換工作？'

type Case = { kind: AiKind; group: 'sameChart' | 'sameQuestion'; question: string; facts: Record<string, unknown>; tone: string; focus?: string; label: string }

function cases(kind: AiKind): Case[] {
  const out: Case[] = []
  if (kind === 'meihua') {
    const one = castByNumbers(12, 34)
    TOPICS.forEach((q) => out.push({ kind, group: 'sameChart', question: q, facts: meihuaFacts(one), tone: meihuaTemplate(one).tone, label: `${one.name}／${q}` }))
    for (const [a, b] of [[3, 5], [7, 2], [11, 40], [20, 9], [6, 6]]) {
      const r = castByNumbers(a, b)
      out.push({ kind, group: 'sameQuestion', question: SAME_Q, facts: meihuaFacts(r), tone: meihuaTemplate(r).tone, label: `${r.name}（${a}、${b}）` })
    }
  } else if (kind === 'tarot') {
    const one = drawThree(4271, [3, 9, 17])
    TOPICS.forEach((q) => out.push({ kind, group: 'sameChart', question: q, facts: tarotFacts(one), tone: tarotTemplate(one).tone, label: `牌序4271／${q}` }))
    for (const seed of [11, 222, 3333, 44444, 55555]) {
      const d = drawThree(seed, [5, 30, 60])
      out.push({ kind, group: 'sameQuestion', question: SAME_Q, facts: tarotFacts(d), tone: tarotTemplate(d).tone, label: `牌序${seed}` })
    }
  } else {
    const TODAY = '2026-11-09'
    const mk = (solarDate: string, timeIndex: number, gender: '男' | '女') => {
      const input = { solarDate, timeIndex, gender }
      return ziweiFacts(buildChart(input), horoscope(input, TODAY), 'yearly')
    }
    const one = mk('1990-05-15', 4, '女')
    TOPICS.forEach((q) => out.push({ kind, group: 'sameChart', question: q, facts: one, tone: '平', focus: 'yearly', label: `1990-05-15／${q}` }))
    for (const [d, t, g] of [['1975-02-03', 1, '男'], ['1984-08-21', 6, '女'], ['1992-11-30', 9, '男'], ['1999-03-12', 2, '女'], ['2003-07-07', 11, '男']] as const) {
      out.push({ kind, group: 'sameQuestion', question: SAME_Q, facts: mk(d, t, g), tone: '平', focus: 'yearly', label: d })
    }
  }
  return out
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const textOf = (o: Record<string, unknown>) =>
  [o.verdict, ...((o.paragraphs as { title: string; text: string }[]) ?? []).flatMap((p) => [p.title, p.text])].join('\n')

const results: (Case & { status: number; reading: Record<string, unknown> | null })[] = []
for (const kind of KINDS) {
  for (const c of cases(kind)) {
    const res = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
      body: JSON.stringify({ kind: c.kind, question: c.question, facts: c.facts, tone: c.tone, ...(c.focus ? { focus: c.focus } : {}) }),
    }).catch(() => null)
    const json = res && res.status === 200 ? ((await res.json()) as Record<string, unknown>) : null
    results.push({ ...c, status: res?.status ?? 0, reading: json })
    console.log(`${res?.status ?? '連線失敗'}  ${c.kind}  ${c.label}`)
    await sleep(1000)
  }
}

// 指標：同一組內兩兩相似度（字元二元組 Jaccard）平均，越低代表越有隨問題／盤面寫出差別
const lines: string[] = [`# 說到點上實測（${LABEL}，${taiwanDate()}）`, '']
for (const kind of KINDS) {
  for (const group of ['sameChart', 'sameQuestion'] as const) {
    const rs = results.filter((r) => r.kind === kind && r.group === group && r.reading)
    const sims: number[] = []
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) sims.push(similarity(textOf(rs[i].reading!), textOf(rs[j].reading!)))
    const avg = sims.length ? sims.reduce((a, b) => a + b, 0) / sims.length : NaN
    lines.push(`## ${kind}・${group === 'sameChart' ? '同一張盤問不同事' : '不同盤問同一件事'}：平均相似度 ${(avg * 100).toFixed(1)}%（${rs.length} 份成功）`, '')
    for (const r of rs) lines.push(`- ${r.label}：${String(r.reading!.verdict)}｜段落：${((r.reading!.paragraphs as { title: string }[]) ?? []).map((p) => p.title).join('／')}`)
    lines.push('')
  }
}
mkdirSync('qa-reports', { recursive: true })
const base = `qa-reports/ai-focus-${taiwanDate()}-${LABEL}`
writeFileSync(`${base}.json`, JSON.stringify(results, null, 2))
writeFileSync(`${base}.md`, lines.join('\n'))
console.log(lines.join('\n'))
