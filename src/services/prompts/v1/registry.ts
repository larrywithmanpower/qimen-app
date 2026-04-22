import { BASE_PROMPT } from './base';
import { LOVE_CONTEXT } from './contexts/love';
import { CAREER_CONTEXT } from './contexts/career';
import { INVEST_CONTEXT } from './contexts/invest';

const CONTEXT_MAP: Record<string, Record<string, string>> = {
  v1: {
    love: LOVE_CONTEXT,
    career: CAREER_CONTEXT,
    invest: INVEST_CONTEXT,
  },
};

export function getContextByKey(contextKey: string): string {
  return CONTEXT_MAP['v1'][contextKey] ?? '';
}

export function getPrompt(contextKey: string, version = 'v1'): string {
  const versionMap = CONTEXT_MAP[version] ?? CONTEXT_MAP['v1'];
  const contextContent = versionMap[contextKey] ?? '';
  const contextSection = contextContent
    ? `\n### 情境補充\n${contextContent}\n`
    : '';
  return `${BASE_PROMPT}${contextSection}`;
}
