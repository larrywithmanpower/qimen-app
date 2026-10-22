import { describe, it, expect } from 'vitest'
import { fetchAiReading, meihuaFacts, tarotFacts, validateAiReading, ziweiFacts } from '../ai'
import type { AiReading, AiRequest } from '../ai'
import { drawThree, templateReading } from '../tarot/engine'
import { castByNumbers } from '../meihua/engine'
import { buildChart, horoscope } from '../ziwei/engine'

const make = (over: Partial<AiReading> & { text?: string } = {}): AiReading => ({
  verdict: '先穩住',
  tone: '吉',
  paragraphs: [{ title: '現在', text: over.text ?? '一般說明', basis: ['依據一條'] }],
  prediction: { claim: '三週內有消息', dueDate: '2026-12-01' },
  ...over,
})

// 固定抽法：愚者等三張
const drawn = drawThree(4321, [3, 9, 17])
const tarot = { facts: tarotFacts(drawn), tone: templateReading(drawn).tone }
const names = drawn.map((c) => c.card.zh)
const otherCard = ['權杖王牌', '聖杯二', '寶劍十', '死神', '高塔'].find((n) => !names.includes(n))!

const mei = castByNumbers(12, 34)
const meiFacts = meihuaFacts(mei)

const chart = buildChart({ solarDate: '1990-07-05', timeIndex: 4, gender: '男' })
const ziFacts = ziweiFacts(chart)
const hsFacts = horoscope({ solarDate: '1990-07-05', timeIndex: 4, gender: '男' }, '2026-10-21')
const ziHsFacts = ziweiFacts(chart, hsFacts, 'yearly')

describe('前端檢查：結構', () => {
  it('正常的解讀通過', () => {
    expect(validateAiReading('tarot', tarot.facts, tarot.tone, make({ tone: tarot.tone, text: `第一張是${names[0]}` }))).not.toBeNull()
  })
  it('tone 和請求不一致 → 不過', () => {
    expect(validateAiReading('tarot', tarot.facts, tarot.tone, make({ tone: tarot.tone === '凶' ? '吉' : '凶' }))).toBeNull()
  })
  it('basis 空陣列或含空字串 → 不過', () => {
    const base = make({ tone: tarot.tone })
    expect(validateAiReading('tarot', tarot.facts, tarot.tone, { ...base, paragraphs: [{ title: 'a', text: 'b', basis: [] }] })).toBeNull()
    expect(validateAiReading('tarot', tarot.facts, tarot.tone, { ...base, paragraphs: [{ title: 'a', text: 'b', basis: [' '] }] })).toBeNull()
  })
  it('缺欄位、dueDate 格式錯 → 不過', () => {
    const base = make({ tone: tarot.tone })
    for (const bad of [null, {}, { ...base, verdict: '' }, { ...base, paragraphs: [] }, { ...base, prediction: { claim: 'x', dueDate: '12/01' } }, { ...base, prediction: { claim: 'x', dueDate: '2026-13-01' } }]) {
      expect(validateAiReading('tarot', tarot.facts, tarot.tone, bad)).toBeNull()
    }
  })
})

describe('前端檢查：提到盤上沒有的名稱', () => {
  it('塔羅：提到沒抽到的牌 → 不過（正文、依據、一句話都查）', () => {
    const base = make({ tone: tarot.tone })
    expect(validateAiReading('tarot', tarot.facts, tarot.tone, { ...base, paragraphs: [{ title: 'a', text: `會遇到${otherCard}`, basis: ['x'] }] })).toBeNull()
    expect(validateAiReading('tarot', tarot.facts, tarot.tone, { ...base, paragraphs: [{ title: 'a', text: 'b', basis: [`${otherCard}正位`] }] })).toBeNull()
    expect(validateAiReading('tarot', tarot.facts, tarot.tone, { ...base, verdict: `像${otherCard}` })).toBeNull()
  })
  it('塔羅：日常詞「世界」沒框起來不誤判，框起來當牌名就擋', () => {
    const f = tarotFacts(drawThree(4321, [3, 9, 17]))
    const t = tarot.tone
    expect(validateAiReading('tarot', f, t, make({ tone: t, text: '這個世界很大' }))).not.toBeNull()
    expect(validateAiReading('tarot', f, t, make({ tone: t, text: '抽到「世界」這張' }))).toBeNull()
  })
  it('塔羅：抽到的是「聖杯皇后」時，單說「皇后」（大牌）要擋', () => {
    const f = { cards: [{ name: '聖杯皇后' }] }
    expect(validateAiReading('tarot', f, '吉', make({ text: '聖杯皇后很溫柔' }))).not.toBeNull()
    expect(validateAiReading('tarot', f, '吉', make({ text: '皇后很溫柔' }))).toBeNull()
  })
  it('梅花：提到不是本卦／互卦／變卦的卦名 → 不過；用 facts 裡的卦名通過', () => {
    const own = [mei.name, mei.mutual.name, mei.changed.name]
    const other = ['乾為天', '坤為地', '水火既濟', '火水未濟'].find((n) => !own.includes(n))!
    expect(validateAiReading('meihua', meiFacts, mei.tone, make({ tone: mei.tone, text: `本卦${mei.name}，互卦${mei.mutual.name}` }))).not.toBeNull()
    expect(validateAiReading('meihua', meiFacts, mei.tone, make({ tone: mei.tone, text: `像${other}` }))).toBeNull()
  })
  it('紫微：提到盤上沒有的主星、輔星 → 不過；「紫微斗數」四字不算星名', () => {
    // 真實命盤十四主星都會出現，所以用只有天機＋左輔的小盤
    const small = { palaces: [{ majorStars: [{ name: '天機' }], minorStars: [{ name: '左輔' }] }] }
    const ok = (text: string) => validateAiReading('ziwei', small, '平', make({ tone: '平', text })) !== null
    expect(ok('命宮有天機，輔星左輔')).toBe(true)
    expect(ok('命宮有七殺')).toBe(false)
    expect(ok('輔星有文昌')).toBe(false)
    expect(ok('紫微斗數裡的天機')).toBe(true)
    // 真實命盤：用盤上的星通過
    const star = chart.palaces.flatMap((p) => p.majorStars)[0].name
    expect(validateAiReading('ziwei', ziFacts, '平', make({ tone: '平', text: `看到${star}` }))).not.toBeNull()
  })
})

describe('隱私：facts 不含生日', () => {
  it('紫微 facts 沒有農曆／干支日期，也沒有生日字串', () => {
    const json = JSON.stringify(ziFacts)
    expect(json).not.toContain(chart.lunarDate)
    expect(json).not.toContain(chart.chineseDate)
    expect(json).not.toContain('1990')
  })
})

describe('fetchAiReading 失敗一律回 null（畫面退回範本）', () => {
  const req: AiRequest = { kind: 'tarot', question: '問題', facts: tarot.facts, tone: tarot.tone }
  const good = make({ tone: tarot.tone, text: `第一張是${names[0]}` })
  const reply = (status: number, body: unknown) => (async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })) as typeof fetch

  it('沒網址 → null，且不呼叫 fetch', async () => {
    let called = false
    const r = await fetchAiReading(req, { url: '', fetchImpl: (async () => { called = true; return new Response() }) as typeof fetch })
    expect(r).toBeNull()
    expect(called).toBe(false)
  })
  it('成功 → 回傳解讀，並且送出的是結構化請求', async () => {
    let sent: Record<string, unknown> = {}
    const r = await fetchAiReading(req, {
      url: 'http://x',
      fetchImpl: (async (_u: unknown, init: RequestInit) => { sent = JSON.parse(String(init.body)); return new Response(JSON.stringify(good)) }) as typeof fetch,
    })
    expect(r?.verdict).toBe('先穩住')
    expect(Object.keys(sent).sort()).toEqual(['facts', 'kind', 'question', 'tone'])
  })
  it('網路錯誤、500、429、壞 JSON、檢查沒過 → 都是 null', async () => {
    const cases: typeof fetch[] = [
      (async () => { throw new TypeError('network') }) as typeof fetch,
      reply(500, { error: 'x' }),
      reply(500, good), // 狀態碼不是 200，內容再漂亮也不收
      reply(429, { error: 'x' }),
      reply(200, 'not json'),
      reply(200, make({ tone: tarot.tone === '凶' ? '吉' : '凶' })),
      reply(200, make({ tone: tarot.tone, text: `會遇到${otherCard}` })),
    ]
    for (const fetchImpl of cases) expect(await fetchAiReading(req, { url: 'http://x', fetchImpl })).toBeNull()
  })
  it('逾時 → null', async () => {
    const hang = ((_u: unknown, init: RequestInit) => new Promise((_, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
    })) as typeof fetch
    expect(await fetchAiReading(req, { url: 'http://x', fetchImpl: hang, timeoutMs: 30 })).toBeNull()
  })
})

describe('紫微運限 facts', () => {
  it('選了運限層才帶 horoscope，沒選不帶', () => {
    expect(ziFacts).not.toHaveProperty('horoscope')
    const h = ziHsFacts.horoscope as Record<string, unknown>
    expect(h).toBeTruthy()
    expect(h.date).toBe('2026-10-21')
    for (const k of ['decadal', 'yearly']) expect(h).toHaveProperty(k)
  })
  it('JSON 長度小於 8000 字元', () => {
    expect(JSON.stringify(ziHsFacts).length).toBeLessThan(8000)
  })
  it('流年星、歲前、將前：facts 內有的通過，facts 沒有的擋下', () => {
    const h = ziHsFacts.horoscope as { layerStars?: Record<string, string[]>; suiqian?: Record<string, string>; jiangqian?: Record<string, string> }
    const star = Object.values(h.layerStars ?? {}).flat().find((n) => /^流[昌曲祿羊陀魁鉞]$/.test(n))!
    expect(star).toBeTruthy()
    expect(validateAiReading('ziwei', ziHsFacts, '平', make({ tone: '平', text: `今年${star}落在這宮` }))).not.toBeNull()
    const sq = Object.values(h.suiqian ?? {})[0]
    expect(validateAiReading('ziwei', ziHsFacts, '平', make({ tone: '平', text: `歲前十二神的${sq}` }))).not.toBeNull()
    // 沒帶運限時，同一顆流年星就是盤上沒有的名稱
    expect(validateAiReading('ziwei', ziFacts, '平', make({ tone: '平', text: `今年${star}落在這宮` }))).toBeNull()
    // 沒帶運限時，歲前十二神的名稱也算盤上沒有
    expect(validateAiReading('ziwei', ziFacts, '平', make({ tone: '平', text: `流年遇${sq}` }))).toBeNull()
  })
})

describe('紫微 facts 只帶選中的那一層', () => {
  const horo = (focus: 'natal' | 'decadal' | 'yearly' | 'monthly' | 'daily') => ziweiFacts(chart, hsFacts, focus).horoscope as Record<string, unknown> | undefined
  const layers = ['decadal', 'age', 'yearly', 'monthly', 'daily']
  const has = (h: Record<string, unknown>) => layers.filter((k) => k in h)

  it('一生（natal）：不帶運限', () => {
    expect(horo('natal')).toBeUndefined()
  })
  it('今年：只有流年，加大限當背景；沒有流月、流日、小限', () => {
    const h = horo('yearly')!
    expect(h.focus).toBe('yearly')
    expect(has(h).sort()).toEqual(['decadal', 'yearly'])
    expect(h.suiqian).toBeTruthy()
  })
  it('這個月／今天：各只帶自己加大限背景；不帶流年', () => {
    expect(has(horo('monthly')!).sort()).toEqual(['decadal', 'monthly'])
    expect(has(horo('daily')!).sort()).toEqual(['daily', 'decadal'])
    expect(horo('monthly')!.suiqian).toBeUndefined()
  })
  it('這十年：只有大限一份', () => {
    expect(has(horo('decadal')!)).toEqual(['decadal'])
  })
  it('每一層帶的命宮與四化等於 engine', () => {
    for (const k of ['decadal', 'yearly', 'monthly', 'daily'] as const) {
      const l = (horo(k) as Record<string, { soulBranch: string; mutagens: { star: string; mutagen: string; branch: string }[] }>)[k]
      expect(l.soulBranch).toBe(hsFacts[k].soulBranch)
      expect(l.mutagens).toEqual(hsFacts[k].mutagens.map((m) => ({ star: m.star, mutagen: m.mutagen, branch: m.branch })))
    }
  })
  it('每一層的 JSON 都小於 8000 字元', () => {
    for (const k of ['decadal', 'yearly', 'monthly', 'daily'] as const) expect(JSON.stringify(ziweiFacts(chart, hsFacts, k)).length).toBeLessThan(8000)
  })
  it('fetchAiReading 的請求 body 帶 focus', async () => {
    let sent: Record<string, unknown> = {}
    const fetchImpl = (async (_u: unknown, init: { body: string }) => {
      sent = JSON.parse(init.body)
      return { status: 500, json: async () => ({}) }
    }) as unknown as typeof fetch
    await fetchAiReading({ kind: 'ziwei', question: '', facts: ziweiFacts(chart, hsFacts, 'monthly'), tone: '平', focus: 'monthly' }, { url: 'http://x', fetchImpl })
    expect(sent.focus).toBe('monthly')
  })
})
