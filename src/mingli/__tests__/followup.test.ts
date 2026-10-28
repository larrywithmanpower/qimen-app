import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildHistory, fetchFollowup, validateFollowup, ziweiFacts } from '../ai'
import type { AiReading, ThreadEntry } from '../ai'
import { buildChart, horoscope } from '../ziwei/engine'

// 用記憶體 Map 假裝 IndexedDB
const store = new Map<string, unknown>()
vi.mock('idb-keyval', () => ({
  get: async (k: string) => store.get(k),
  set: async (k: string, v: unknown) => { store.set(k, v) },
  del: async (k: string) => { store.delete(k) },
  keys: async () => [...store.keys()],
}))
const { FOLLOWUP_MAX, capThread, clearThread, clearThreadsOf, loadThread, saveThread, threadKey } = await import('../storage/followup')

const chart = buildChart({ solarDate: '1990-07-05', timeIndex: 4, gender: '男' })
const hs = horoscope({ solarDate: '1990-07-05', timeIndex: 4, gender: '男' }, '2026-10-21')
const facts = ziweiFacts(chart, hs, 'yearly')
const star = chart.palaces.flatMap((p) => p.majorStars)[0].name
const CARD = { id: 'c1', title: '卡一', source: '來源' }

const reply = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch
const run = (fetchImpl: typeof fetch) =>
  fetchFollowup({ question: '那明年呢', facts, focus: 'yearly', history: [{ q: 'a', a: 'b' }] }, { url: 'http://x', fetchImpl })

describe('fetchFollowup', () => {
  it('answer 與 cards 解析正確，notice 一併帶回', async () => {
    const f = { action: 'answer', text: `看到${star}`, basis: ['依據甲'], cards: [CARD] }
    expect(await run(reply({ followup: f, notice: ['medical'] }))).toEqual({ ...f, notice: ['medical'] })
    const c = { action: 'cards', text: '慢慢來', basis: [], cards: [CARD] }
    expect(await run(reply({ followup: c }))).toEqual(c)
  })
  it('recompute 與 refuse', async () => {
    const r = { action: 'recompute', text: '先切到明年', target: { focus: 'yearly', date: '2027-01-01' } }
    expect(await run(reply({ followup: r }))).toEqual(r)
    expect(await run(reply({ followup: { action: 'refuse', text: '這題不回答' } }))).toEqual({ action: 'refuse', text: '這題不回答' })
  })
  it('refusal 原樣回傳', async () => {
    expect(await run(reply({ refusal: { kind: 'selfharm', message: '1925' } }))).toEqual({ refusal: { kind: 'selfharm', message: '1925' } })
    expect(await run(reply({ refusal: { kind: 'x', message: '1925' } }))).toBeNull()
  })
  it('請求內容：mode、history 截斷、tone 固定平', async () => {
    const fetchImpl = reply({ followup: { action: 'refuse', text: 'x' } })
    await fetchFollowup({ question: 'q'.repeat(300), facts, focus: 'yearly', history: [{ q: 'q'.repeat(300), a: 'a'.repeat(900) }] }, { url: 'http://x', fetchImpl })
    const body = JSON.parse((vi.mocked(fetchImpl).mock.calls[0][1] as RequestInit).body as string)
    expect(body.kind).toBe('ziwei')
    expect(body.mode).toBe('followup')
    expect(body.tone).toBe('平')
    expect(body.focus).toBe('yearly')
    expect(body.question).toHaveLength(200)
    expect(body.history[0].q).toHaveLength(200)
    expect(body.history[0].a).toHaveLength(600)
  })
  it('壞格式、非 200、越界星名、絕對化字眼、recompute 日期或層錯 → null', async () => {
    const bad: unknown[] = [
      { followup: { action: 'answer', text: '', basis: [], cards: [] } },
      { followup: { action: 'answer', text: 'x', basis: [''], cards: [] } },
      { followup: { action: 'answer', text: 'x', basis: [], cards: [{ id: 'c' }] } },
      { followup: { action: 'cards', text: 'x', basis: [], cards: [] } },
      { followup: { action: 'weird', text: 'x' } },
      { followup: { action: 'answer', text: '這件事一定會成功', basis: [], cards: [CARD] } },
      { followup: { action: 'answer', text: 'x', basis: ['保證有好事'], cards: [CARD] } },
      { followup: { action: 'recompute', text: 'x', target: { focus: 'yearly', date: '2027-02-30' } } },
      { followup: { action: 'recompute', text: 'x', target: { focus: 'natal', date: '2027-01-01' } } },
      { followup: { action: 'recompute', text: 'x', target: { focus: 'yearly', date: '2027/01/01' } } },
      {},
    ]
    for (const b of bad) expect(await run(reply(b)), JSON.stringify(b)).toBeNull()
    expect(await run(reply({ followup: { action: 'refuse', text: 'x' } }, 500))).toBeNull()
    expect(await run(reply({ error: 'x' }, 429))).toEqual({ limited: true })
    expect(await run(vi.fn(async () => { throw new Error('net') }) as unknown as typeof fetch)).toBeNull()
  })
  it('星名不在 facts 裡 → null（用只有一顆星的假 facts）', () => {
    const small = { palaces: [{ majorStars: [{ name: '紫微' }], minorStars: [] }] }
    const mk = (text: string) => ({ action: 'answer', text, basis: [], cards: [CARD] })
    expect(validateFollowup(small, mk('紫微坐命'))).not.toBeNull()
    expect(validateFollowup(small, mk('天機坐命'))).toBeNull()
    expect(validateFollowup(small, { ...mk('紫微'), basis: ['天機'] })).toBeNull()
  })
})

const reading = (verdict: string, texts: string[]): AiReading => ({
  verdict, tone: '平', paragraphs: texts.map((t) => ({ title: 't', text: t, basis: ['b'], cards: [CARD] })), prediction: { claim: 'c', dueDate: '2099-01-01' },
})
const rd = (q: string, v = '一句話', paras = ['甲段', '乙段']): ThreadEntry => ({ type: 'reading', q, layer: 'natal', date: '2026-10-21', reading: reading(v, paras) })
const fu = (q: string, text: string): ThreadEntry => ({ type: 'followup', q, layer: 'natal', date: '2026-10-21', result: { action: 'refuse', text } })

describe('buildHistory', () => {
  it('reading：空問題寫「整體運勢」，a 是一句話加各段文字', () => {
    expect(buildHistory([rd('')])).toEqual([{ q: '整體運勢', a: '一句話\n甲段\n乙段' }])
    expect(buildHistory([rd('今年如何')])[0].q).toBe('今年如何')
  })
  it('followup：a 是回答文字（recompute 是那句說明）', () => {
    const rc: ThreadEntry = { type: 'followup', q: 'Q', layer: 'natal', date: '2026-10-21', result: { action: 'recompute', text: '切到明年', target: { focus: 'yearly', date: '2027-01-01' } } }
    expect(buildHistory([rc])).toEqual([{ q: 'Q', a: '切到明年' }])
  })
  it('只取最後 8 筆，舊的在前', () => {
    const all = [rd('r0'), ...Array.from({ length: 11 }, (_, i) => fu(`q${i}`, `a${i}`))]
    const h = buildHistory(all)
    expect(h).toHaveLength(8)
    expect(h[0].q).toBe('q3')
    expect(h[7].q).toBe('q10')
  })
  it('q 截 200、a 截 600', () => {
    const h = buildHistory([fu('q'.repeat(300), 'a'.repeat(900)), rd('r'.repeat(250), 'v', ['x'.repeat(700)])])
    expect(h[0].q).toHaveLength(200)
    expect(h[0].a).toHaveLength(600)
    expect(h[1].q).toHaveLength(200)
    expect(h[1].a).toHaveLength(600)
  })
})

describe('本機對話紀錄', () => {
  beforeEach(() => store.clear())
  it('存了再讀得回來；不同盤互不影響', async () => {
    const k1 = threadKey('1990-07-05', 4, '男')
    const k2 = threadKey('1990-07-05', 5, '男')
    await saveThread(k1, [rd('a'), fu('b', 'c')])
    expect(await loadThread(k1)).toEqual([rd('a'), fu('b', 'c')])
    expect(await loadThread(k2)).toEqual([])
  })
  it('最多留 30 筆，丟最舊的', async () => {
    const k = threadKey('1990-07-05', 4, '男')
    const many = Array.from({ length: 35 }, (_, i) => fu(`q${i}`, 'a'))
    await saveThread(k, many)
    const got = await loadThread(k)
    expect(got).toHaveLength(FOLLOWUP_MAX)
    expect(got[0].q).toBe('q5')
    expect(capThread(many)[29].q).toBe('q34')
  })
  it('壞資料讀成空', async () => {
    store.set('ml-followup:x', [{ type: 'nope' }, 3])
    expect(await loadThread('ml-followup:x')).toEqual([])
  })
  it('clearThread 清單張盤；clearThreadsOf 清同生辰所有時辰，不動別人的', async () => {
    const a = threadKey('1990-07-05', 4, '男')
    const b = threadKey('1990-07-05', 7, '男')
    const other = threadKey('1991-01-01', 4, '男')
    for (const k of [a, b, other]) await saveThread(k, [fu('q', 'a')])
    await clearThread(a)
    expect(await loadThread(a)).toEqual([])
    expect(await loadThread(b)).toHaveLength(1)
    await clearThreadsOf({ solarDate: '1990-07-05', gender: '男' })
    expect(await loadThread(b)).toEqual([])
    expect(await loadThread(other)).toHaveLength(1)
  })
})
