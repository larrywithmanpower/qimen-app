// 請求處理：Claude 與用量計數都由外面注入，測試時換成假的
import { SYSTEM_PROMPT, buildFollowupMessage, buildUserMessage, followupSchema, followupSystemPrompt } from './prompt.js';
import { sumUsage } from './cost.js';
import { loadCards, selectCards } from './cards.js';
import { checkFollowup, checkReading, validateRequest } from './validate.js';
import { REFUSAL_MESSAGES, classifyQuestion } from './safety.js';

// 台灣日期 YYYY-MM-DD（UTC+8）
export function taiwanDate(nowMs) {
  return new Date(nowMs + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

// deps: { claude(system, user) => { reading, usage, model }, usage.consume(dateKey, limit) => boolean,
//        cost.record(紀錄) => 寫成本（可省略；失敗只記日誌）, cards（知識卡 db，測試注入；預設啟動時讀檔）, env, now() }
export function createHandler({ claude, usage, cost, cards, env = process.env, now = Date.now }) {
  const cardDb = cards ?? loadCards();
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
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    // 狀態端點：給前端判斷 AI 是否開著、是否維護中；不扣額度
    if (req.method === 'GET') {
      res.status(200).json({ ai: env.AI_ENABLED === 'true', maintenance: env.MAINTENANCE === 'true' });
      return;
    }
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
    const bad = validateRequest(req.body);
    if (bad) {
      res.status(400).json({ error: bad });
      return;
    }
    const { kind, question = '', facts, tone, focus, mode, history, context = '' } = req.body;
    const isFollowup = mode === 'followup';

    // 內容安全：問題與近況一起看（中間夾全形符號，避免兩段接起來湊出關鍵字）；該拒答的直接回，不呼叫 Claude、不扣額度、不記成本
    const { topics, refuse } = classifyQuestion(`${question}｜${context}`);
    if (refuse) {
      res.status(200).json({ refusal: { kind: refuse, message: REFUSAL_MESSAGES[refuse] } });
      return;
    }

    // 緊急開關（放在拒答之後：AI 關閉時，危機求助訊息仍要送得出去）
    if (env.AI_ENABLED !== 'true') {
      res.status(503).json({ error: 'AI 暫停服務' });
      return;
    }

    // 一張卡都選不到就不呼叫 Claude，也不耗額度
    const selected = selectCards(kind, facts, focus, cardDb);
    if (selected.length === 0) {
      console.error('no cards', { kind });
      res.status(500).json({ error: 'No cards' });
      return;
    }

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
    const user = isFollowup
      ? buildFollowupMessage({ kind, question, facts, focus, context, history, cards: selected, topics }, taiwanDate(now()))
      : buildUserMessage({ kind, question, facts, tone, focus, context, cards: selected, topics }, taiwanDate(now()));
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
        const out = isFollowup ? await claude(followupSystemPrompt(kind), user, followupSchema(kind)) : await claude(SYSTEM_PROMPT, user);
        if (out?.usage) usages.push(out.usage);
        if (out?.model) model = out.model;
        // 第二道內容安全：關鍵字沒抓到的隱晦說法，由 Claude 判斷整句意思
        const risk = out?.reading?.risk;
        if (risk === 'selfharm' || risk === 'death') {
          status = 'refused';
          result = { refusal: { kind: risk, message: REFUSAL_MESSAGES[risk] } };
          break;
        }
        const checked = isFollowup ? checkFollowup(out?.reading, selected, kind) : checkReading(out?.reading, tone, selected);
        const reading = isFollowup ? checked.followup : checked.reading;
        const { problem } = checked;
        if (reading) {
          status = 'ok';
          result = isFollowup ? { followup: reading } : reading;
          break;
        }
        // 只記沒過的是哪一條、不在清單的卡號、Claude 停止原因（不含問題與盤面）
        const allowedIds = new Set(selected.map((c) => c.id));
        const cited = isFollowup
          ? (Array.isArray(out?.reading?.cards) ? out.reading.cards : [])
          : (Array.isArray(out?.reading?.paragraphs) ? out.reading.paragraphs : []).flatMap((p) => (Array.isArray(p?.cards) ? p.cards : []));
        const unknownCards = cited
          .filter((id) => !allowedIds.has(id)).slice(0, 10);
        console.warn('reading format rejected', { kind, attempt, problem, unknownCards, stopReason: out?.stopReason });
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
          ...(isFollowup ? { mode: 'followup' } : {}),
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

    if (status === 'refused') res.status(200).json(result);
    else if (status === 'ok') res.status(200).json(topics.length > 0 ? { ...result, notice: topics } : result);
    else if (status === 'api_error') res.status(502).json({ error: 'AI 呼叫失敗' });
    else res.status(502).json({ error: '大師的回答格式不對' });
  };
}
