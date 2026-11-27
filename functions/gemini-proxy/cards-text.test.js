// 6-5 知識卡文字檔：Boss 改 cards/*.txt 就生效；格式寫錯測試紅燈並指出第幾行
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { loadCards, selectCards } from './cards.js'
import { parseCardsText } from './cards-text.js'
import { buildUserMessage } from './prompt.js'

const read = (k) => readFileSync(new URL(`./cards/${k}.txt`, import.meta.url), 'utf8')
const HEAD = '# 說明\n版本：1\n\n'

describe('三份正式卡片檔', () => {
  it('讀得進來，張數不變（塔羅 156、梅花 461、紫微 48）', () => {
    const db = loadCards()
    expect(db.tarot).toHaveLength(156)
    expect(db.meihua).toHaveLength(461)
    expect(db.ziwei).toHaveLength(48)
  })
  it('每張卡的條件寫法都轉得回程式欄位', () => {
    const db = loadCards()
    expect(db.tarot[0]).toMatchObject({ id: 'T00正', when: { card: '愚者', orientation: '正位' } })
    expect(db.meihua.find((c) => c.when.line === 1)?.when).toEqual({ hexagram: '乾為天', line: 1 })
    expect(db.ziwei.some((c) => c.when.focus === 'yearly')).toBe(true)
  })
})

describe('新增一張卡就用得到', () => {
  it('塔羅：在愚者正位多寫一張自訂卡，抽到愚者正位時這張卡會送進 prompt', () => {
    const added = `${read('tarot')}\n[T自訂01] 愚者正位・Boss 補充\n條件：牌=愚者 正逆=正位\n出處：Boss 自己整理\n內容：愚者正位時提醒先把退路想好再出發。\n`
    const db = { ...loadCards(), tarot: parseCardsText(added, 'tarot').cards }
    const facts = { spread: '三張牌陣', cards: [{ position: '過去', name: '愚者', orientation: '正位' }] }
    const selected = selectCards('tarot', facts, undefined, db)
    expect(selected.map((c) => c.id)).toEqual(['T00正', 'T自訂01'])
    const msg = buildUserMessage({ kind: 'tarot', question: '要不要換工作？', facts, tone: '吉', cards: selected }, '2026-11-27')
    expect(msg).toContain('T自訂01｜愚者正位・Boss 補充｜愚者正位時提醒先把退路想好再出發。')
  })
  it('梅花：條件同時寫卦和爻，只有那一爻動時才選到', () => {
    const added = `${read('meihua')}\n[M自訂01] 乾為天初爻補充\n條件：卦=乾為天 爻=1\n出處：Boss\n內容：初爻再補一句。\n`
    const db = { ...loadCards(), meihua: parseCardsText(added, 'meihua').cards }
    const facts = (line) => ({ main: { name: '乾為天' }, mutual: { name: '乾為天' }, changed: { name: '天風姤' }, movingLine: line, ti: { trigram: '乾' }, yong: { trigram: '乾' }, relation: '比和' })
    expect(selectCards('meihua', facts(1), undefined, db).map((c) => c.id)).toContain('M自訂01')
    expect(selectCards('meihua', facts(2), undefined, db).map((c) => c.id)).not.toContain('M自訂01')
  })
})

describe('格式寫錯會擋下並指出第幾行', () => {
  const bad = (body, kind = 'tarot') => () => parseCardsText(HEAD + body, kind)
  it.each([
    ['少了內容', '[A1] 標題\n條件：牌=愚者 正逆=正位\n出處：x\n', /第 4 行的 \[A1\] 少了「內容：」/],
    ['卡號重複', '[A1] 標題\n條件：牌=愚者\n出處：x\n內容：y\n\n[A1] 又一張\n條件：牌=愚者\n出處：x\n內容：y\n', /第 9 行：卡號 A1 重複/],
    ['條件名稱打錯', '[A1] 標題\n條件：牌名=愚者\n出處：x\n內容：y\n', /條件「牌名」不認得，這種卡只能用 牌、正逆/],
    ['條件沒寫等號', '[A1] 標題\n條件：愚者\n出處：x\n內容：y\n', /第 5 行：條件「愚者」要寫成 名稱=值/],
    ['內容是空的', '[A1] 標題\n條件：牌=愚者\n出處：x\n內容：\n', /第 7 行：\[A1\] 的「內容：」是空的/],
    ['同一欄寫兩次', '[A1] 標題\n條件：牌=愚者\n出處：x\n出處：y\n內容：z\n', /第 7 行：\[A1\] 的「出處：」寫了兩次/],
    ['內容換行寫成兩行', '[A1] 標題\n條件：牌=愚者\n出處：x\n內容：第一行\n第二行\n', /第 8 行：看不懂這行/],
    ['卡片外面多一行字', '這行沒有卡號\n', /第 4 行：不在任何一張卡底下/],
  ])('%s', (_n, body, msg) => {
    expect(bad(body)).toThrow(msg)
  })
  it('爻要是 1～6', () => {
    expect(bad('[M1] 標題\n條件：卦=乾為天 爻=7\n出處：x\n內容：y\n', 'meihua')).toThrow(/爻要是 1～6/)
  })
  it('沒寫版本、一張卡都沒有', () => {
    expect(() => parseCardsText('[A1] 標題\n條件：牌=愚者\n出處：x\n內容：y\n', 'tarot')).toThrow(/版本/)
    expect(() => parseCardsText(HEAD, 'tarot')).toThrow(/一張卡都沒有/)
  })
  it('塔羅的條件不能拿去梅花用', () => {
    expect(bad('[A1] 標題\n條件：牌=愚者\n出處：x\n內容：y\n', 'meihua')).toThrow(/只能用 卦、爻、八卦、體用/)
  })
  it('# 說明行和多餘空行都不影響', () => {
    const r = parseCardsText(`${HEAD}# 這張是測試\n\n\n[A1] 標題\n條件：牌=愚者 正逆=逆位\n出處：x\n內容：y\n\n`, 'tarot')
    expect(r.cards).toEqual([{ id: 'A1', title: '標題', source: 'x', when: { card: '愚者', orientation: '逆位' }, text: 'y' }])
  })
})
