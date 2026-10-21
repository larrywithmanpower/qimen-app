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
  // 解析失敗回 undefined，交給 handler 的格式檢查重叫
  try {
    return text ? JSON.parse(text) : undefined;
  } catch {
    return undefined;
  }
}
