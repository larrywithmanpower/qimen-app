// 梅花＋塔羅合併解讀實測（會花錢，不在 npm test 裡）：AI_EVAL_URL=<代理網址> npx tsx scripts/ai-combo.eval.mts
// 10 題（不同問題 × 不同卦與牌），每份檢查：200、過前端檢查、依據兩邊都有、有講同向或相衝
// 結果寫到 qa-reports/ai-combo-<台灣日期>.json（原文）與 .md（每份一句話＋檢查結果，給人逐份看有沒有正面回答）
import { mkdirSync, writeFileSync } from 'node:fs'
import { comboFacts, meihuaFacts, tarotFacts, validateAiReading } from '../src/mingli/ai'
import type { AiReading } from '../src/mingli/ai'
import { castByNumbers, templateReading as meihuaTemplate } from '../src/mingli/meihua/engine'
import { drawThree } from '../src/mingli/tarot/engine'
import { taiwanDate } from './ai-eval-lib.mjs'

const URL = process.env.AI_EVAL_URL ?? ''
const ORIGIN = 'https://mingli-yuxuan.web.app'
if (!URL) throw new Error('要設 AI_EVAL_URL')

const QUESTIONS = [
  '我該不該換工作？', '他還喜歡我嗎？', '這個月的財運如何？', '我跟室友的關係要怎麼改善？', '我做的 app 上架會不會成功？',
  '要不要搬去台中？', '這次面試會上嗎？', '我該不該跟朋友合夥開店？', '今年適合學新技能嗎？', '跟家人的爭執會和好嗎？',
]
const NUMS = [[3, 5], [7, 2], [11, 40], [20, 9], [6, 6], [12, 34], [27, 8], [4, 19], [15, 1], [9, 33]]
const SEEDS = [11, 222, 3333, 44444, 55555, 4271, 808, 1234, 9876, 31415]
const AT = new Date('2026-11-25T15:00')
const STANCE = /同向|相衝|一致|呼應|相反|矛盾|互相印證|兩邊都|同一個方向|不同調/

const rows: { q: string; title: string; status: number; ok: boolean; bothSides: boolean; stance: boolean; reading?: AiReading; raw?: unknown }[] = []
for (let i = 0; i < QUESTIONS.length; i++) {
  const m = castByNumbers(NUMS[i][0], NUMS[i][1], { at: AT })
  const d = drawThree(SEEDS[i], [5, 30, 60])
  const facts = comboFacts(meihuaFacts(m), tarotFacts(d))
  const tone = meihuaTemplate(m).tone
  const title = `${m.name}→${m.changed.name}（${m.level}）｜${d.map((c) => `${c.card.zh}${c.reversed ? '逆' : '正'}`).join('・')}`
  const res = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: ORIGIN }, body: JSON.stringify({ kind: 'combo', question: QUESTIONS[i], facts, tone }) })
  const raw = res.status === 200 ? await res.json() : await res.text()
  const reading = res.status === 200 ? validateAiReading('combo', facts, tone, raw) : null
  const basis = reading ? reading.paragraphs.flatMap((p) => p.basis) : []
  const text = reading ? [reading.verdict, ...reading.paragraphs.map((p) => `${p.title}${p.text}`)].join('\n') : ''
  rows.push({
    q: QUESTIONS[i], title, status: res.status, ok: !!reading,
    bothSides: basis.some((b) => b.startsWith('梅花')) && basis.some((b) => b.startsWith('塔羅')),
    stance: STANCE.test(text), reading: reading ?? undefined, raw: reading ? undefined : raw,
  })
  console.log(`${i + 1}/10 ${res.status} ${reading ? '過' : '沒過'} ${QUESTIONS[i]}`)
}

mkdirSync('qa-reports', { recursive: true })
const base = `qa-reports/ai-combo-${taiwanDate(Date.now())}`
writeFileSync(`${base}.json`, JSON.stringify(rows, null, 2))
const md = [
  `# 合併解讀實測 ${taiwanDate(Date.now())}`,
  '',
  `過檢查 ${rows.filter((r) => r.ok).length}/10、依據兩邊都有 ${rows.filter((r) => r.bothSides).length}/10、講到同向或相衝 ${rows.filter((r) => r.stance).length}/10`,
  '',
  ...rows.map((r, i) => [
    `## ${i + 1}. ${r.q}`,
    `- 盤面：${r.title}`,
    `- 結果：${r.status}／${r.ok ? '過' : '沒過'}／兩邊依據 ${r.bothSides ? '有' : '缺'}／同向相衝 ${r.stance ? '有' : '缺'}`,
    `- 一句話：${r.reading?.verdict ?? '（無）'}`,
    ...(r.reading?.paragraphs.map((p) => `- 【${p.title}】${p.text}`) ?? []),
    '',
  ].join('\n')),
].join('\n')
writeFileSync(`${base}.md`, md)
console.log(md.split('\n')[2])
