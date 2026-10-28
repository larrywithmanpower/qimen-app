import { describe, it, expect } from 'vitest'
import { fetchAiReading, fetchSiteStatus, findAbsolute, isAiLimited, isAiRefusal, meihuaFacts, tarotFacts, validateAiReading, ziweiFacts } from '../ai'
import type { AiReading, AiRequest } from '../ai'
import { drawThree, templateReading } from '../tarot/engine'
import { castByNumbers } from '../meihua/engine'
import { buildChart, horoscope } from '../ziwei/engine'

const CARD = { id: 'c-1', title: '測試卡', source: '測試來源' }

const make = (over: Partial<AiReading> & { text?: string } = {}): AiReading => ({
  verdict: '先穩住',
  tone: '吉',
  paragraphs: [{ title: '現在', text: over.text ?? '一般說明', basis: ['依據一條'], cards: [CARD] }],
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
    expect(validateAiReading('tarot', tarot.facts, tarot.tone, { ...base, paragraphs: [{ title: 'a', text: 'b', basis: [], cards: [CARD] }] })).toBeNull()
    expect(validateAiReading('tarot', tarot.facts, tarot.tone, { ...base, paragraphs: [{ title: 'a', text: 'b', basis: [' '], cards: [CARD] }] })).toBeNull()
  })
  it('缺欄位、dueDate 格式錯 → 不過', () => {
    const base = make({ tone: tarot.tone })
    for (const bad of [null, {}, { ...base, verdict: '' }, { ...base, paragraphs: [] }, { ...base, prediction: { claim: 'x', dueDate: '12/01' } }, { ...base, prediction: { claim: 'x', dueDate: '2026-13-01' } }]) {
      expect(validateAiReading('tarot', tarot.facts, tarot.tone, bad)).toBeNull()
    }
  })
})

describe('前端檢查：知識卡 cards', () => {
  const t = () => tarot.tone
  const withCards = (cards: unknown) => ({ ...make({ tone: t() }), paragraphs: [{ title: 'a', text: 'b', basis: ['x'], cards }] })
  it('cards 欄位合法 → 通過並保留', () => {
    const r = validateAiReading('tarot', tarot.facts, t(), withCards([CARD]))
    expect(r?.paragraphs[0].cards).toEqual([CARD])
  })
  it('沒有 cards、空陣列 → 不過', () => {
    expect(validateAiReading('tarot', tarot.facts, t(), { ...make({ tone: t() }), paragraphs: [{ title: 'a', text: 'b', basis: ['x'] }] })).toBeNull()
    expect(validateAiReading('tarot', tarot.facts, t(), withCards([]))).toBeNull()
    expect(validateAiReading('tarot', tarot.facts, t(), withCards('c-1'))).toBeNull()
  })
  it('元素缺 id／title／source 或是空字串、非物件 → 不過', () => {
    for (const bad of [{ title: 't', source: 's' }, { id: 'a', source: 's' }, { id: 'a', title: 't' }, { id: ' ', title: 't', source: 's' }, { id: 'a', title: '', source: 's' }, { id: 'a', title: 't', source: 1 }, 'c-1', null]) {
      expect(validateAiReading('tarot', tarot.facts, t(), withCards([CARD, bad]))).toBeNull()
    }
  })
})

describe('前端檢查：梅花爻位越界', () => {
  const line = mei.moving
  const nameOf = (n: number) => ['初', '二', '三', '四', '五', '上'][n - 1] + '爻'
  const other = (line % 6) + 1
  const ok = (text: string, extra: Partial<AiReading> = {}) => validateAiReading('meihua', meiFacts, mei.tone, make({ tone: mei.tone, text, ...extra })) !== null
  it('提到動爻那一爻 → 通過（兩種寫法）', () => {
    expect(ok(`${nameOf(line)}在動`)).toBe(true)
    expect(ok(`第${line}爻在動`)).toBe(true)
    expect(ok(`第${'一二三四五六'[line - 1]}爻在動`)).toBe(true)
  })
  it('提到別的爻 → 擋下（正文、依據、一句話、預測都查）', () => {
    expect(ok(`${nameOf(other)}有變化`)).toBe(false)
    expect(ok(`第${other}爻有變化`)).toBe(false)
    expect(ok(`第${'一二三四五六'[other - 1]}爻有變化`)).toBe(false)
    expect(validateAiReading('meihua', meiFacts, mei.tone, { ...make({ tone: mei.tone }), paragraphs: [{ title: 'a', text: 'b', basis: [`${nameOf(other)}動`], cards: [CARD] }] })).toBeNull()
    expect(ok('一般說明', { verdict: `${nameOf(other)}為主` })).toBe(false)
    expect(ok('一般說明', { prediction: { claim: `${nameOf(other)}應驗`, dueDate: '2026-12-01' } })).toBe(false)
  })
  it('「六爻」「動爻」「爻辭」不算提到某一爻；提到動爻又多提別爻照擋', () => {
    expect(ok('六爻組成一個卦，動爻的爻辭值得看')).toBe(true)
    expect(ok(`${nameOf(line)}與${nameOf(other)}`)).toBe(false)
  })
  it('第六爻＝上爻：動爻是 6 時通過，不是 6 時擋', () => {
    const f6 = { ...meiFacts, movingLine: 6 }
    const f1 = { ...meiFacts, movingLine: 1 }
    const run = (f: Record<string, unknown>, text: string) => validateAiReading('meihua', f, mei.tone, make({ tone: mei.tone, text })) !== null
    expect(run(f6, '上爻動')).toBe(true)
    expect(run(f6, '第六爻動')).toBe(true)
    expect(run(f1, '上爻動')).toBe(false)
    expect(run(f1, '初爻動')).toBe(true)
  })
})

describe('前端檢查：塔羅正逆位越界', () => {
  const c0 = drawn[0]
  const right = c0.reversed ? '逆位' : '正位'
  const wrong = c0.reversed ? '正位' : '逆位'
  const run = (text: string) => validateAiReading('tarot', tarot.facts, tarot.tone, make({ tone: tarot.tone, text })) !== null
  it('方向和抽到的一致 → 通過（含「」框與不框）', () => {
    expect(run(`${names[0]}${right}代表開始`)).toBe(true)
    expect(run(`「${names[0]}」${right}代表開始`)).toBe(true)
  })
  it('方向相反 → 擋下（含「」框與不框）', () => {
    expect(run(`${names[0]}${wrong}代表開始`)).toBe(false)
    expect(run(`「${names[0]}」${wrong}代表開始`)).toBe(false)
  })
  it('牌名後面沒接正逆位，或另一張牌的方向沒錯 → 不誤擋', () => {
    expect(run(`${names[0]}提醒你慢下來`)).toBe(true)
    const c1 = drawn[1]
    expect(run(`${names[1]}${c1.reversed ? '逆位' : '正位'}、${names[0]}${right}`)).toBe(true)
  })
})

describe('前端檢查：提到盤上沒有的名稱', () => {
  it('塔羅：提到沒抽到的牌 → 不過（正文、依據、一句話都查）', () => {
    const base = make({ tone: tarot.tone })
    expect(validateAiReading('tarot', tarot.facts, tarot.tone, { ...base, paragraphs: [{ title: 'a', text: `會遇到${otherCard}`, basis: ['x'], cards: [CARD] }] })).toBeNull()
    expect(validateAiReading('tarot', tarot.facts, tarot.tone, { ...base, paragraphs: [{ title: 'a', text: 'b', basis: [`${otherCard}正位`], cards: [CARD] }] })).toBeNull()
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
    expect(r && !isAiRefusal(r) && !isAiLimited(r) ? r.verdict : null).toBe('先穩住')
    expect(Object.keys(sent).sort()).toEqual(['facts', 'kind', 'question', 'tone'])
  })
  it('429 → { limited: true }（今天次數用完，畫面要講清楚）', async () => {
    expect(await fetchAiReading(req, { url: 'http://x', fetchImpl: reply(429, { error: 'x' }) })).toEqual({ limited: true })
  })
  it('網路錯誤、500、壞 JSON、檢查沒過 → 都是 null', async () => {
    const cases: typeof fetch[] = [
      (async () => { throw new TypeError('network') }) as typeof fetch,
      reply(500, { error: 'x' }),
      reply(500, good), // 狀態碼不是 200，內容再漂亮也不收
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

describe('內容安全：絕對化字眼（規則要和後端 safety.js 一致）', () => {
  it('抓得到七種', () => {
    for (const w of ['一定', '必定', '絕對', '保證', '百分之百', '100%', '肯定會']) expect(findAbsolute(`這件事${w}成功`), w).toContain(w)
  })
  it('否定與「一定的」不算', () => {
    for (const t of ['不一定會成功', '未必一定順利', '我不保證結果', '不見得一定如此', '有一定的參考價值']) expect(findAbsolute(t), t).toEqual([])
  })
  it('validateAiReading：任何一處含絕對化字眼 → null；否定寫法照過', () => {
    const base = { tone: tarot.tone, text: `第一張是${names[0]}` }
    expect(validateAiReading('tarot', tarot.facts, tarot.tone, make(base))).not.toBeNull()
    expect(validateAiReading('tarot', tarot.facts, tarot.tone, make({ ...base, text: `第一張是${names[0]}，一定成功` }))).toBeNull()
    expect(validateAiReading('tarot', tarot.facts, tarot.tone, make({ ...base, text: `第一張是${names[0]}，不一定馬上有結果` }))).not.toBeNull()
    expect(validateAiReading('tarot', tarot.facts, tarot.tone, { ...make(base), verdict: '保證順利' })).toBeNull()
  })
})

describe('內容安全：refusal 與 notice', () => {
  const req: AiRequest = { kind: 'tarot', question: '問題', facts: tarot.facts, tone: tarot.tone }
  const reply = (body: unknown) => (async () => new Response(JSON.stringify(body), { status: 200 })) as typeof fetch
  it('refusal → 回傳 { refusal }，不是 null', async () => {
    const r = await fetchAiReading(req, { url: 'http://x', fetchImpl: reply({ refusal: { kind: 'selfharm', message: '安心專線 1925' } }) })
    expect(r && isAiRefusal(r)).toBe(true)
    expect(r).toEqual({ refusal: { kind: 'selfharm', message: '安心專線 1925' } })
  })
  it('refusal 格式不對（kind 不認得、message 空）→ null', async () => {
    for (const refusal of [{ kind: 'x', message: 'a' }, { kind: 'death', message: '' }, 'oops']) {
      expect(await fetchAiReading(req, { url: 'http://x', fetchImpl: reply({ refusal }) })).toBeNull()
    }
  })
  it('解讀帶 notice → 保留合法值、丟掉不認得的；沒帶就沒有欄位', () => {
    const raw = make({ tone: tarot.tone, text: `第一張是${names[0]}` }) as unknown as Record<string, unknown>
    expect(validateAiReading('tarot', tarot.facts, tarot.tone, { ...raw, notice: ['medical', 'bogus', 'legal'] })?.notice).toEqual(['medical', 'legal'])
    expect(validateAiReading('tarot', tarot.facts, tarot.tone, raw)).not.toHaveProperty('notice')
  })
})

describe('fetchSiteStatus', () => {
  const reply = (status: number, body: unknown) => (async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })) as typeof fetch
  it('正常回傳狀態，並且用 GET', async () => {
    let method = ''
    const fetchImpl = (async (_u: unknown, init: RequestInit) => { method = String(init.method); return new Response(JSON.stringify({ ai: false, maintenance: true })) }) as typeof fetch
    expect(await fetchSiteStatus({ url: 'http://x', fetchImpl })).toEqual({ ai: false, maintenance: true })
    expect(method).toBe('GET')
  })
  it('沒網址、網路錯誤、非 200、格式不對 → 當作正常，不擋使用者', async () => {
    const ok = { ai: true, maintenance: false }
    expect(await fetchSiteStatus({ url: '' })).toEqual(ok)
    expect(await fetchSiteStatus({ url: 'http://x', fetchImpl: (async () => { throw new TypeError('network') }) as typeof fetch })).toEqual(ok)
    expect(await fetchSiteStatus({ url: 'http://x', fetchImpl: reply(500, { ai: false, maintenance: true }) })).toEqual(ok)
    expect(await fetchSiteStatus({ url: 'http://x', fetchImpl: reply(200, 'not json') })).toEqual(ok)
    expect(await fetchSiteStatus({ url: 'http://x', fetchImpl: reply(200, { ai: 'yes' }) })).toEqual(ok)
  })
})
