import { describe, it, expect, vi, beforeEach } from 'vitest';

// 假的 SDK：不碰網路，只回固定的 API 回應
let apiResponse;
let lastArgs;
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: async (args) => { lastArgs = args; return apiResponse; } };
  },
}));

const { callClaude } = await import('./claude.js');
const { READING_TOOL, FOLLOWUP_SCHEMA } = await import('./prompt.js');

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = 'test-key-not-real';
});

describe('callClaude 回傳 { reading, usage, model }', () => {
  it('usage 原樣取 API 回應的四個欄位', async () => {
    apiResponse = {
      model: 'claude-sonnet-5-5',
      content: [{ type: 'text', text: '{"verdict":"好"}' }],
      usage: { input_tokens: 123, output_tokens: 45, cache_creation_input_tokens: 6, cache_read_input_tokens: 7 },
    };
    expect(await callClaude('s', 'u')).toEqual({
      reading: { verdict: '好' },
      usage: { input_tokens: 123, output_tokens: 45, cache_creation_input_tokens: 6, cache_read_input_tokens: 7 },
      model: 'claude-sonnet-5-5',
    });
  });
  it('沒有快取欄位（或是 null）算 0', async () => {
    apiResponse = {
      model: 'claude-sonnet-5-5',
      content: [{ type: 'text', text: '{}' }],
      usage: { input_tokens: 10, output_tokens: 2, cache_creation_input_tokens: null },
    };
    expect((await callClaude('s', 'u')).usage).toEqual({ input_tokens: 10, output_tokens: 2, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 });
  });
  it('JSON 解析失敗：reading 是 undefined，但 usage 仍回報', async () => {
    apiResponse = { model: 'claude-sonnet-5-5', content: [{ type: 'text', text: '不是 JSON' }], usage: { input_tokens: 9, output_tokens: 8 } };
    const out = await callClaude('s', 'u');
    expect(out.reading).toBeUndefined();
    expect(out.usage.input_tokens).toBe(9);
  });
  it('沒傳 schema 用解讀的；傳了就換成傳入的', async () => {
    apiResponse = { model: 'm', content: [{ type: 'text', text: '{}' }], usage: {} };
    await callClaude('s', 'u');
    expect(lastArgs.output_config.format.schema).toBe(READING_TOOL.input_schema);
    await callClaude('s', 'u', FOLLOWUP_SCHEMA);
    expect(lastArgs.output_config.format.schema).toBe(FOLLOWUP_SCHEMA);
  });
});
