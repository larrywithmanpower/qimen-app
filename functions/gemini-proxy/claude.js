// 真的 Claude 呼叫（結構化輸出：tool use 強制指定工具）
import Anthropic from '@anthropic-ai/sdk';
import { MAX_TOKENS, MODEL, READING_TOOL, TOOL_NAME } from './prompt.js';

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
    tools: [READING_TOOL],
    tool_choice: { type: 'tool', name: TOOL_NAME },
  });
  const block = msg.content.find((b) => b.type === 'tool_use' && b.name === TOOL_NAME);
  return block?.input;
}
