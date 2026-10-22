#!/usr/bin/env node
// AI 成本報表：用 gcloud 的登入權杖讀 Firestore ai_calls，依真實 token 用量算成本
// 用法：npm run ai-cost -- [--month 2026-10] [--from 2026-10-01 --to 2026-10-31] [--rate 32.5]
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { DEFAULT_RATE, renderReport } from './ai-cost-lib.mjs'

const PROJECT = 'qimen-app-487007'

function arg(name) {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

function findGcloud() {
  try {
    execFileSync('gcloud', ['--version'], { stdio: 'ignore' })
    return 'gcloud'
  } catch {
    const fallback = join(homedir(), '.local/opt/google-cloud-sdk/bin/gcloud')
    if (existsSync(fallback)) return fallback
    throw new Error('找不到 gcloud（PATH 與 ~/.local/opt/google-cloud-sdk/bin/gcloud 都沒有）')
  }
}

const taiwanToday = () => new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10)

function range() {
  const month = arg('month')
  let from = arg('from')
  let to = arg('to')
  if (month) {
    if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('--month 格式是 YYYY-MM')
    const [y, m] = month.split('-').map(Number)
    from = `${month}-01`
    to = `${month}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`
  } else if (!from && !to) {
    const m = taiwanToday().slice(0, 7)
    const [y, mm] = m.split('-').map(Number)
    from = `${m}-01`
    to = `${m}-${String(new Date(Date.UTC(y, mm, 0)).getUTCDate()).padStart(2, '0')}`
  }
  from ??= '2000-01-01'
  to ??= '2999-12-31'
  for (const d of [from, to]) if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new Error('--from / --to 格式是 YYYY-MM-DD')
  return { from, to }
}

// Firestore REST 的欄位值轉成一般值
function decode(v) {
  if ('stringValue' in v) return v.stringValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return v.doubleValue
  if ('timestampValue' in v) return v.timestampValue
  if ('nullValue' in v) return null
  if ('booleanValue' in v) return v.booleanValue
  return undefined
}

async function fetchRows(token, from, to) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`
  const rows = []
  const LIMIT = 1000
  for (let offset = 0; ; offset += LIMIT) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-goog-user-project': PROJECT },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'ai_calls' }],
          where: {
            compositeFilter: {
              op: 'AND',
              filters: [
                { fieldFilter: { field: { fieldPath: 'date' }, op: 'GREATER_THAN_OR_EQUAL', value: { stringValue: from } } },
                { fieldFilter: { field: { fieldPath: 'date' }, op: 'LESS_THAN_OR_EQUAL', value: { stringValue: to } } },
              ],
            },
          },
          orderBy: [{ field: { fieldPath: 'date' }, direction: 'ASCENDING' }],
          limit: LIMIT,
          offset,
        },
      }),
    })
    if (!res.ok) throw new Error(`Firestore 讀取失敗 ${res.status}：${(await res.text()).slice(0, 300)}`)
    const docs = (await res.json()).filter((r) => r.document)
    for (const { document } of docs) {
      rows.push(Object.fromEntries(Object.entries(document.fields ?? {}).map(([k, v]) => [k, decode(v)])))
    }
    if (docs.length < LIMIT) return rows
  }
}

async function main() {
  const { from, to } = range()
  const rate = arg('rate') ? Number(arg('rate')) : DEFAULT_RATE
  if (!(rate > 0)) throw new Error('--rate 要是正數')
  const token = execFileSync(findGcloud(), ['auth', 'print-access-token'], { encoding: 'utf8' }).trim()
  const rows = await fetchRows(token, from, to)
  console.log(renderReport({ rows, from, to, rate }))
}

main().catch((e) => {
  console.error(`錯誤：${e.message}`)
  process.exit(1)
})
