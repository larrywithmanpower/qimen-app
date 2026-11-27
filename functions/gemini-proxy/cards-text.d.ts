// cards-text.js 的型別宣告（前端今日一牌也用同一份讀法）
export interface KnowledgeCard { id: string; title: string; source: string; when: Record<string, string | number>; text: string }
export const CONDITION_KEYS: Record<'tarot' | 'meihua' | 'ziwei', Record<string, string>>
export function parseCardsText(text: string, kind: 'tarot' | 'meihua' | 'ziwei'): { version: number; kind: string; cards: KnowledgeCard[] }
