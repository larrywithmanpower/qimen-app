// 請求處理：Claude 與用量計數都由外面注入，測試時換成假的
import { SYSTEM_PROMPT, buildUserMessage } from './prompt.js';
import { sumUsage } from './cost.js';
import { validateReading, validateRequest } from './validate.js';

// 台灣日期 YYYY-MM-DD（UTC+8）
export function taiwanDate(nowMs) {
  return new Date(nowMs + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

// deps: { claude(system, user) => { reading, usage, model }, usage.consume(dateKey, limit) => boolean,
//        cost.record(紀錄) => 寫成本（可省略；失敗只記日誌）, env, now() }
export function createHandler({ claude, usage, cost, env = process.env, now = Date.now }) {
  const allowed = new Set((env.ALLOWED_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean));
  const limit = Number(env.DAILY_LIMIT) > 0 ? Number(env.DAILY_LIMIT) : 200;

  return async (req, res) => {
    const origin = req.get('Origin');
    // 沒帶 Origin 或不在白名單一律拒絕（含 OPTIONS）
    if (!origin || !allowed.has(origin)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
    // 緊急開關
    if (env.AI_ENABLED !== 'true') {
      res.status(503).json({ error: 'AI 暫停服務' });
      return;
    }
    const bad = validateRequest(req.body);
    if (bad) {
      res.status(400).json({ error: bad });
      return;
    }
    const { kind, question = '', facts, tone, focus } = req.body;

    try {
      if (!(await usage.consume(taiwanDate(now()), limit))) {
        res.status(429).json({ error: '今日 AI 解讀次數已滿' });
        return;
      }
    } catch (error) {
      console.error('usage error', error?.message);
      res.status(500).json({ error: 'Server error' });
      return;
    }

    // 隱私：日誌不記錄 question 與 facts
    const user = buildUserMessage({ kind, question, facts, tone, focus }, taiwanDate(now()));
    const startedAt = now();
    const usages = [];
    let model = 'unknown';
    let attempts = 0;
    let status = 'bad_format';
    let result = null;
    try {
      // 格式不過重叫一次，再不過回 502；每一次呼叫（含重叫）都記 usage
      for (let attempt = 0; attempt < 2; attempt++) {
        attempts++;
        const out = await claude(SYSTEM_PROMPT, user);
        if (out?.usage) usages.push(out.usage);
        if (out?.model) model = out.model;
        const reading = validateReading(out?.reading, tone);
        if (reading) {
          status = 'ok';
          result = reading;
          break;
        }
        console.warn('reading format rejected', { kind, attempt });
      }
    } catch (error) {
      status = 'api_error';
      // 只記 Claude 回的錯誤說明，不含問題與盤面
      console.error('claude error', { kind, name: error?.name, status: error?.status, type: error?.error?.error?.type, message: error?.error?.error?.message?.slice(0, 300) });
    }

    // 成本紀錄失敗只記日誌，不影響使用者
    if (cost) {
      try {
        await cost.record({
          ts: startedAt,
          date: taiwanDate(startedAt),
          kind,
          focus: kind === 'ziwei' ? focus ?? null : null,
          model,
          attempts,
          usage: sumUsage(usages),
          status,
          latencyMs: Math.max(0, now() - startedAt),
        });
      } catch (error) {
        console.error('cost record failed', { name: error?.name, code: error?.code });
      }
    }

    if (status === 'ok') res.status(200).json(result);
    else if (status === 'api_error') res.status(502).json({ error: 'AI 呼叫失敗' });
    else res.status(502).json({ error: '大師的回答格式不對' });
  };
}
