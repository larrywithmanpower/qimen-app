// 真的 Claude 呼叫（結構化輸出：output_config 指定 JSON schema；Sonnet 5.5 不支援強制指定工具）
import Anthropic from '@anthropic-ai/sdk';
import { MAX_TOKENS, MODEL, READING_TOOL } from './prompt.js';

let client;

export async function callClaude(system, user) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');
  client ??= new Anthropic({ apiKey, timeout: 25_000, maxRetries: 1 });
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system,
    messages: [{ role: 'user', content: user }],
    output_config: { format: { type: 'json_schema', schema: READING_TOOL.input_schema } },
  });
  const text = msg.content.find((b) => b.type === 'text')?.text;
  // usage 原樣取 API 回應；沒有的快取欄位算 0
  const u = msg.usage ?? {};
  const usage = {
    input_tokens: u.input_tokens ?? 0,
    output_tokens: u.output_tokens ?? 0,
    cache_creation_input_tokens: u.cache_creation_input_tokens ?? 0,
    cache_read_input_tokens: u.cache_read_input_tokens ?? 0,
  };
  // 解析失敗 reading 回 undefined，交給 handler 的格式檢查重叫（usage 照樣回報，這次呼叫還是花了錢）
  let reading;
  try {
    reading = text ? JSON.parse(text) : undefined;
  } catch {
    reading = undefined;
  }
  return { reading, usage, model: msg.model ?? MODEL, stopReason: msg.stop_reason };
}
