import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AiReading } from '../ai'

const store = new Map<string, unknown>()
vi.mock('idb-keyval', () => ({
  get: async (k: string) => store.get(k),
  set: async (k: string, v: unknown) => { store.set(k, v) },
  del: async (k: string) => { store.delete(k) },
}))
const { loadRecords, saveRecord, setOutcome } = await import('../storage/records')
type Rec = Awaited<ReturnType<typeof loadRecords>>[number]
const { accuracyStats, answeredList, dueList, MIN_JUDGED, pendingList, predictionOf, tally, topicOf } = await import('../storage/accuracy')

const NOW = Date.UTC(2026, 10, 27, 4, 0, 0)
const reading = (dueDate: string, claim = '一個月內有面試通知'): AiReading => ({
  verdict: '可以動', tone: '吉', paragraphs: [{ title: '答案', text: '可以', basis: ['依據'], cards: [] }], prediction: { claim, dueDate },
})
let n = 0
const rec = (over: Partial<Rec> = {}): Rec => ({
  id: `r${n++}`, kind: 'meihua', at: NOW, question: '要不要換工作？', title: '雷地豫', level: '吉', tone: '吉',
  facts: {}, reading: reading('2026-12-01'), verdict: '可以動', followups: [], ...over,
})
const done = (result: 'hit' | 'miss' | 'unsure', over: Partial<Rec> = {}) => rec({ ...over, outcome: { result, at: NOW } })

beforeEach(() => { store.clear(); n = 0 })

describe('題目類型', () => {
  it.each([
    ['他還喜歡我嗎？', '感情'], ['跟前任會復合嗎', '感情'],
    ['這個月的財運如何？', '錢'], ['股票要不要賣', '錢'],
    ['我該不該換工作？', '工作'], ['我做的 App 上架會不會成功？', '工作'], ['這週提的企劃會不會過？', '工作'],
    ['我跟室友的關係要怎麼改善？', '人際'], ['跟媽媽吵架怎麼辦', '人際'],
    ['最近我最該注意的是什麼？', '其他'], ['今天要注意什麼？', '其他'],
  ])('「%s」→ %s', (q, t) => { expect(topicOf(q)).toBe(t) })
  it('同時命中多類照 感情 > 錢 > 工作 > 人際', () => {
    expect(topicOf('男友的工作')).toBe('感情')
    expect(topicOf('換工作薪水會變高嗎')).toBe('錢')
    expect(topicOf('受不了同事要不要辭職')).toBe('工作')
  })
})

describe('哪些可以對答案', () => {
  it('有 AI 解讀且預測合法才算；範例解讀、壞掉的日期、空白預測都不算', () => {
    expect(predictionOf(rec())).toEqual({ claim: '一個月內有面試通知', dueDate: '2026-12-01' })
    expect(predictionOf(rec({ reading: null }))).toBeNull()
    expect(predictionOf(rec({ reading: reading('2026-13-01') }))).toBeNull()
    expect(predictionOf(rec({ reading: reading('2026-12-01', '  ') }))).toBeNull()
  })
  it('到期日當天就算到期；前一天還沒；回填過的不再列', () => {
    const list = [rec({ id: 'a', reading: reading('2026-11-27') }), rec({ id: 'b', reading: reading('2026-11-28') }), done('hit', { id: 'c', reading: reading('2026-11-01') })]
    expect(dueList(list, '2026-11-27').map((t) => t.rec.id)).toEqual(['a'])
    expect(pendingList(list, '2026-11-27').map((t) => t.rec.id)).toEqual(['b'])
    expect(dueList(list, '2026-11-26')).toEqual([])
    expect(answeredList(list).map((t) => t.rec.id)).toEqual(['c'])
  })
  it('到期的先到期在前、沒到期的快到期在前', () => {
    const list = [rec({ id: 'late', reading: reading('2026-11-20') }), rec({ id: 'early', reading: reading('2026-11-10') }), rec({ id: 'p2', reading: reading('2027-01-10') }), rec({ id: 'p1', reading: reading('2026-12-10') })]
    expect(dueList(list, '2026-11-27').map((t) => t.rec.id)).toEqual(['early', 'late'])
    expect(pendingList(list, '2026-11-27').map((t) => t.rec.id)).toEqual(['p1', 'p2'])
  })
})

describe('命中率', () => {
  it(`中＋沒中滿 ${MIN_JUDGED} 筆才給百分比；說不準不算`, () => {
    expect(tally([...Array(6).fill('hit'), ...Array(3).fill('miss'), ...Array(5).fill('unsure')]).rate).toBeNull()
    // 7 中 3 沒中 → 70%；再多 5 筆說不準也還是 70%
    expect(tally([...Array(7).fill('hit'), ...Array(3).fill('miss')])).toEqual({ hit: 7, miss: 3, unsure: 0, judged: 10, rate: 70 })
    expect(tally([...Array(7).fill('hit'), ...Array(3).fill('miss'), ...Array(5).fill('unsure')]).rate).toBe(70)
  })
  it('四捨五入到整數（2/3 → 67%）', () => {
    expect(tally([...Array(8).fill('hit'), ...Array(4).fill('miss')]).rate).toBe(67)
  })
  it('分術數、分題目類型的數字跟手算一致；沒回填的不算', () => {
    const list = [
      ...Array.from({ length: 8 }, () => done('hit', { kind: 'meihua', question: '要不要換工作' })),
      ...Array.from({ length: 2 }, () => done('miss', { kind: 'meihua', question: '要不要換工作' })),
      ...Array.from({ length: 3 }, () => done('hit', { kind: 'tarot', question: '他還喜歡我嗎' })),
      ...Array.from({ length: 4 }, () => done('miss', { kind: 'tarot', question: '他還喜歡我嗎' })),
      done('unsure', { kind: 'combo', question: '最近財運' }),
      rec({ kind: 'tarot', question: '他還喜歡我嗎' }),
    ]
    const s = accuracyStats(list)
    expect(s.all).toEqual({ hit: 11, miss: 6, unsure: 1, judged: 17, rate: 65 })
    expect(s.byKind.meihua).toEqual({ hit: 8, miss: 2, unsure: 0, judged: 10, rate: 80 })
    expect(s.byKind.tarot).toEqual({ hit: 3, miss: 4, unsure: 0, judged: 7, rate: null })
    expect(s.byKind.combo).toEqual({ hit: 0, miss: 0, unsure: 1, judged: 0, rate: null })
    expect(s.byTopic.工作.rate).toBe(80)
    expect(s.byTopic.感情).toEqual({ hit: 3, miss: 4, unsure: 0, judged: 7, rate: null })
    expect(s.byTopic.錢.unsure).toBe(1)
    expect(s.byTopic.人際.judged + s.byTopic.其他.judged).toBe(0)
  })
})

describe('回填存檔', () => {
  it('回填後讀得回來；頁面之後再存同一筆不會把結果洗掉', async () => {
    const r = rec({ id: 'x' })
    await saveRecord(r)
    await setOutcome('x', 'miss', NOW + 5)
    expect((await loadRecords())[0].outcome).toEqual({ result: 'miss', at: NOW + 5 })
    await saveRecord({ ...r, verdict: '更新過' })
    const got = (await loadRecords())[0]
    expect(got.verdict).toBe('更新過')
    expect(got.outcome?.result).toBe('miss')
  })
  it('改填一次以最後一次為準；找不到的 id 不會新增', async () => {
    await saveRecord(rec({ id: 'x' }))
    await setOutcome('x', 'hit')
    await setOutcome('x', 'unsure')
    await setOutcome('nope', 'hit')
    const all = await loadRecords()
    expect(all).toHaveLength(1)
    expect(all[0].outcome?.result).toBe('unsure')
  })
})
