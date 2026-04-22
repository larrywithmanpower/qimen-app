import { LOVE_CONTEXT } from './contexts/love';
import { CAREER_CONTEXT } from './contexts/career';
import { INVEST_CONTEXT } from './contexts/invest';

const CONTEXT_MAP: Record<string, string> = {
  love: LOVE_CONTEXT,
  career: CAREER_CONTEXT,
  invest: INVEST_CONTEXT,
};

export function getContextByKey(contextKey: string): string {
  return CONTEXT_MAP[contextKey] ?? '';
}
