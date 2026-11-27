import { beforeEach, describe, expect, it, vi } from 'vitest'
import { comboFacts, validateAiReading } from '../ai'
import type { AiReading } from '../ai'

// 用記憶體 Map 假裝 IndexedDB
const store = new Map<string, unknown>()
vi.mock('idb-keyval', () => ({
  get: async (k: string) => store.get(k),
  set: async (k: string, v: unknown) => { store.set(k, v) },
  del: async (k: string) => { store.delete(k) },
}))
const {
  RECORDS_KEY, RECORDS_MAX, TRACKED_MAX, clearRecords, comboCandidates, comboPair, deleteRecord, loadRecords, normQuestion, saveRecord, upsert,
} = await import('../storage/records')
type Rec = Awaited<ReturnType<typeof loadRecords>>[number]
const { comboContext, comboPath } = await import('../ui/recordText')

const NOW = Date.UTC(2026, 10, 25, 6, 0, 0)
const DAY = 24 * 3600 * 1000
const rec = (over: Partial<Rec> = {}): Rec => ({
  id: 'meihua-1', kind: 'meihua', at: NOW, question: '要不要換工作？', title: '雷地豫 → 天地否', level: '吉', tone: '吉',
  facts: {}, reading: null, verdict: '可以動', followups: [], ...over,
})

beforeEach(() => store.clear())

describe('紀錄存取', () => {
  it('存了讀得回來，新的在前', async () => {
    await saveRecord(rec({ id: 'a', at: NOW - 1000 }))
    await saveRecord(rec({ id: 'b', at: NOW }))
    expect((await loadRecords()).map((r) => r.id)).toEqual(['b', 'a'])
  })
  it('同一筆再存是更新，不會多一筆', async () => {
    await saveRecord(rec({ id: 'a', verdict: '舊' }))
    await saveRecord(rec({ id: 'a', verdict: '新' }))
    const all = await loadRecords()
    expect(all).toHaveLength(1)
    expect(all[0].verdict).toBe('新')
  })
  it('連續存不互相蓋掉（排隊寫）', async () => {
    await Promise.all([1, 2, 3, 4, 5].map((i) => saveRecord(rec({ id: `r${i}`, at: NOW + i }))))
    expect(await loadRecords()).toHaveLength(5)
  })
  it(`最多 ${RECORDS_MAX} 筆，第 ${RECORDS_MAX + 1} 筆進來丟最舊的`, () => {
    let list: Rec[] = []
    for (let i = 0; i < RECORDS_MAX + 1; i++) list = upsert(list, rec({ id: `r${i}`, at: NOW + i }))
    expect(list).toHaveLength(RECORDS_MAX)
    expect(list.some((r) => r.id === 'r0')).toBe(false)
    expect(list[0].id).toBe(`r${RECORDS_MAX}`)
  })
  it(`有預測的另外算上限：一般紀錄擠爆 ${RECORDS_MAX} 筆，舊的有預測、填過結果的都還在`, () => {
    const pred = (id: string, at: number, outcome?: Rec['outcome']): Rec => rec({
      id, at, outcome,
      reading: { verdict: '可以', tone: '吉', paragraphs: [], prediction: { claim: '一個月內有消息', dueDate: '2026-12-20' } },
    })
    let list: Rec[] = [pred('old-pending', NOW - 60 * DAY), pred('old-done', NOW - 80 * DAY, { result: 'hit', at: NOW })]
    for (let i = 0; i < RECORDS_MAX + 20; i++) list = upsert(list, rec({ id: `p${i}`, at: NOW + i }))
    expect(list.filter((r) => r.id.startsWith('p'))).toHaveLength(RECORDS_MAX)
    expect(list.map((r) => r.id)).toEqual(expect.arrayContaining(['old-pending', 'old-done']))
    expect(list.find((r) => r.id === 'old-done')?.outcome?.result).toBe('hit')
  })
  it(`有預測的超過 ${TRACKED_MAX} 筆才丟它們之中最舊的`, () => {
    let list: Rec[] = []
    for (let i = 0; i < TRACKED_MAX + 1; i++) {
      list = upsert(list, rec({ id: `t${i}`, at: NOW + i, reading: { verdict: '可以', tone: '吉', paragraphs: [], prediction: { claim: '有消息', dueDate: '2026-12-20' } } }))
    }
    expect(list).toHaveLength(TRACKED_MAX)
    expect(list.some((r) => r.id === 't0')).toBe(false)
  })
  it('裝置裡已經超過上限的舊資料，讀出來也照同樣規則修剪', async () => {
    store.set(RECORDS_KEY, Array.from({ length: RECORDS_MAX + 5 }, (_, i) => rec({ id: `x${i}`, at: NOW + i })))
    const all = await loadRecords()
    expect(all).toHaveLength(RECORDS_MAX)
    expect(all.some((r) => r.id === 'x0')).toBe(false)
  })
  it('單筆刪、全部刪', async () => {
    await saveRecord(rec({ id: 'a' }))
    await saveRecord(rec({ id: 'b', at: NOW + 1 }))
    await deleteRecord('a')
    expect((await loadRecords()).map((r) => r.id)).toEqual(['b'])
    await clearRecords()
    expect(await loadRecords()).toEqual([])
  })
  it('舊版合併紀錄（沒有 combo）：來源在用來源、不在從標題拆；補的值只給畫面用，存檔不寫回', async () => {
    const m = rec({ id: 'm', kind: 'meihua', title: '雷地豫 → 天地否', level: '吉' })
    const t = rec({ id: 't', kind: 'tarot', title: '教皇 正位', question: '換工作好嗎' })
    const c = rec({ id: 'c', kind: 'combo', title: '舊梅花｜舊塔羅', level: '平', sources: ['m', 't'], context: '主管很煩；塔羅那次問的是「換工作好嗎」' })
    store.set(RECORDS_KEY, [m, t, c])
    const got = (await loadRecords()).find((r) => r.id === 'c')
    expect(got?.combo).toEqual({ meihuaTitle: '雷地豫 → 天地否', meihuaLevel: '吉', tarotTitle: '教皇 正位', tarotQuestion: '換工作好嗎' })
    await deleteRecord('t')
    const after = (await loadRecords()).find((r) => r.id === 'c')
    // 塔羅來源刪掉：題目不從近況反推，當成跟合併的題目相同
    expect(after?.combo).toEqual({ meihuaTitle: '雷地豫 → 天地否', meihuaLevel: '吉', tarotTitle: '舊塔羅', tarotQuestion: '要不要換工作？' })
    expect((store.get(RECORDS_KEY) as Rec[]).find((r) => r.id === 'c')?.combo).toBeUndefined()
  })
  it('combo 欄位壞掉（空物件）照樣補好，不會把原資料洗掉', async () => {
    const bad = { ...rec({ id: 'c', kind: 'combo', title: '甲｜乙' }), combo: { future: 1 } }
    store.set(RECORDS_KEY, [bad])
    expect((await loadRecords())[0].combo?.tarotTitle).toBe('乙')
    await saveRecord(rec({ id: 'x', at: NOW + 1 }))
    expect((store.get(RECORDS_KEY) as Rec[]).find((r) => r.id === 'c')?.combo).toEqual({ future: 1 })
  })
  it('壞掉的資料不讀進來', async () => {
    store.set(RECORDS_KEY, [rec({ id: 'ok' }), { id: 'bad' }, null, 'x'])
    expect((await loadRecords()).map((r) => r.id)).toEqual(['ok'])
  })
})

describe('合併配對', () => {
  const from = rec({ id: 'm0', kind: 'meihua', question: '要不要換工作？' })
  const list = [
    from,
    rec({ id: 't-new-other', kind: 'tarot', at: NOW - 1000, question: '他還喜歡我嗎' }),
    rec({ id: 't-same', kind: 'tarot', at: NOW - 2 * DAY, question: ' 要不要 換工作 ' }),
    rec({ id: 't-old', kind: 'tarot', at: NOW - 7 * DAY - 1, question: '要不要換工作' }),
    rec({ id: 'm-other', kind: 'meihua', at: NOW - 10 }),
    rec({ id: 'c', kind: 'combo', at: NOW - 10 }),
  ]
  it('題目比對忽略空白與標點', () => {
    expect(normQuestion(' 要不要，換工作？ ')).toBe(normQuestion('要不要換工作'))
    expect(normQuestion('要不要換工作')).not.toBe(normQuestion('要不要換房子'))
  })
  it('只列另一種算法、7 天內；同一題排最前，其餘新的在前', () => {
    const got = comboCandidates(list, from, NOW)
    expect(got.map((x) => x.rec.id)).toEqual(['t-same', 't-new-other'])
    expect(got.map((x) => x.same)).toEqual([true, false])
  })
  it('剛好 7 天還算，超過一毫秒就不算', () => {
    const edge = [rec({ id: 't7', kind: 'tarot', at: NOW - 7 * DAY })]
    expect(comboCandidates(edge, from, NOW)).toHaveLength(1)
    expect(comboCandidates(edge, from, NOW + 1)).toHaveLength(0)
  })
  it('從塔羅找梅花也行；合併紀錄本身不能再合併', () => {
    const t = rec({ id: 't', kind: 'tarot' })
    expect(comboCandidates(list, t, NOW).map((x) => x.rec.id)).toEqual(['m0', 'm-other'])
    expect(comboCandidates(list, rec({ kind: 'combo' }), NOW)).toEqual([])
  })
  it('配成 [梅花, 塔羅]，同種不能配', () => {
    const m = rec({ id: 'm', kind: 'meihua' })
    const t = rec({ id: 't', kind: 'tarot' })
    expect(comboPair(t, m)?.map((r) => r.id)).toEqual(['m', 't'])
    expect(comboPair(m, m)).toBeNull()
    expect(comboPath(t, m)).toBe('/combo?m=m&t=t')
    expect(comboPath(m, m)).toBeNull()
  })
  it('題目不同時把塔羅的題目放進近況；相同就不放', () => {
    const m = rec({ kind: 'meihua', question: '要不要換工作', context: '主管很煩' })
    expect(comboContext(m, rec({ kind: 'tarot', question: '要不要換工作？' }))).toBe('主管很煩')
    expect(comboContext(m, rec({ kind: 'tarot', question: '換工作好嗎' }))).toBe('塔羅那次問的是「換工作好嗎」；主管很煩')
    expect(comboContext(rec({ question: 'a' }), rec({ kind: 'tarot', question: 'a' }))).toBeUndefined()
  })
  it('近況很長時，塔羅的題目還是完整送出（被截的是近況尾巴）', () => {
    const long = '很'.repeat(290)
    const got = comboContext(rec({ question: 'a', context: long }), rec({ kind: 'tarot', question: '新工作會比較好嗎' })) ?? ''
    expect(got.startsWith('塔羅那次問的是「新工作會比較好嗎」')).toBe(true)
    expect([...got].length).toBe(300)
  })
})

describe('合併解讀前端檢查', () => {
  const facts = comboFacts(
    { main: { name: '雷地豫' }, mutual: { name: '水山蹇' }, changed: { name: '天地否' }, movingLine: 4 },
    { cards: [{ name: '教皇', orientation: '正位' }, { name: '正義', orientation: '逆位' }, { name: '星星', orientation: '正位' }] },
  )
  const card = { id: 'c', title: '卡', source: '來源' }
  const make = (text: string): AiReading => ({
    verdict: '可以換', tone: '吉',
    paragraphs: [{ title: '答案', text, basis: ['梅花：本卦雷地豫'], cards: [card] }],
    prediction: { claim: '一個月內有面試', dueDate: '2026-12-20' },
  })
  const ok = (text: string) => validateAiReading('combo', facts, '吉', make(text)) !== null
  it('兩邊出現的卦與牌都可以提', () => {
    expect(ok('雷地豫九四爻動，「教皇」正位、「正義」逆位，四爻提醒')).toBe(true)
  })
  it('提到沒出現的卦或牌要擋', () => {
    expect(ok('看起來像乾為天')).toBe(false)
    expect(ok('「愚者」正位')).toBe(false)
  })
  it('梅花只能提動爻、塔羅正逆位要一致', () => {
    expect(ok('初爻')).toBe(false)
    expect(ok('「正義」正位')).toBe(false)
  })
})
