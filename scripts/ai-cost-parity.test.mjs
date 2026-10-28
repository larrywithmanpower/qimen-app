import { describe, it, expect } from 'vitest';
import { PRICES as BACKEND_PRICES } from '../functions/gemini-proxy/cost.js';
import { PRICES } from './ai-cost-lib.mjs';

// 後端函式單獨部署，單價自己放一份；兩邊必須完全相同
describe('單價表一致', () => {
  it('後端 PRICES 與 scripts/ai-cost-lib.mjs 完全相同', () => {
    expect(BACKEND_PRICES).toEqual(PRICES);
  });
});
