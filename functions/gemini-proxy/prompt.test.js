import { describe, it, expect } from 'vitest';
import { SYSTEM_PROMPT, buildUserMessage, followupSystemPrompt } from './prompt.js';

// AI 會把提示詞裡的例句當範本照抄（11-09 實測 30 份有 28 份寫「兩週」）：口頭禪只能出現在禁止那一條
const STOCK = ['兩週', '較穩', '辭呈', '先別急'];
const prompts = { 第一次解讀: SYSTEM_PROMPT, 紫微追問: followupSystemPrompt('ziwei'), 塔羅追問: followupSystemPrompt('tarot'), 梅花追問: followupSystemPrompt('meihua') };

describe('提示詞不放會被照抄的口頭禪', () => {
  for (const [name, text] of Object.entries(prompts)) {
    it(`${name}：口頭禪只出現在「不要套用固定句型」那一條`, () => {
      const lines = String(text).split('\n').filter((l) => STOCK.some((w) => l.includes(w)));
      expect(lines.every((l) => l.includes('不要套用固定句型'))).toBe(true);
    });
  }
  it('第一次解讀有禁止口頭禪的規則', () => {
    expect(String(SYSTEM_PROMPT)).toContain('不要套用固定句型');
  });
});

describe('今日一牌的提示', () => {
  const base = { kind: 'tarot', question: '今天要注意什麼？', tone: '吉' };
  it('塔羅 facts 標明今日一牌時多一條單張說明', () => {
    expect(buildUserMessage({ ...base, facts: { spread: '今日一牌', cards: [] } }, '2026-11-27')).toContain('這次是「今日一牌」');
  });
  it('三張牌陣、其他術數不會多這條', () => {
    expect(buildUserMessage({ ...base, facts: { spread: '三張牌陣', cards: [] } }, '2026-11-27')).not.toContain('這次是「今日一牌」');
    expect(buildUserMessage({ ...base, kind: 'meihua', facts: { spread: '今日一牌' } }, '2026-11-27')).not.toContain('這次是「今日一牌」');
  });
});
