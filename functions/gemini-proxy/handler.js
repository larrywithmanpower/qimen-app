// 請求處理：Claude 與用量計數都由外面注入，測試時換成假的
import { SYSTEM_PROMPT, buildUserMessage } from './prompt.js';
import { sumUsage } from './cost.js';
import { loadCards, selectCards } from './cards.js';
import { checkReading, validateRequest } from './validate.js';
import { REFUSAL_MESSAGES, classifyQuestion } from './safety.js';

// 台灣日期 YYYY-MM-DD（UTC+8）
export function taiwanDate(nowMs) {
  return new Date(nowMs + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

// 環境變數轉正數，不合法用預設
const positive = (v, fallback) => (Number(v) > 0 ? Number(v) : fallback);

// 取 Authorization：沒帶 → null；帶了但不是 Bearer 格式 → ''（視為無效）
function bearerToken(req) {
  const h = req.get('Authorization');
  if (!h) return null;
  return /^Bearer\s+(\S+)$/i.exec(h)?.[1] ?? '';
}

// deps: { claude(system, user) => { reading, usage, model },
//        usage: { consume(dateKey, { uid, limit }) => boolean（uid 為 null 代表未登入共用計數）,
//                 used(dateKey, { uid }) => 今日已用次數, spentUsd(dateKey) => 今日累計美金 },
//        auth.verify(token) => uid（無效丟錯）,
//        cost.record(紀錄) => 寫成本（可省略；失敗只記日誌）, cards（知識卡 db，測試注入；預設啟動時讀檔）, env, now() }
export function createHandler({ claude, usage, auth, cost, cards, env = process.env, now = Date.now }) {
  const cardDb = cards ?? loadCards();
  const allowed = new Set((env.ALLOWED_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean));
  const userLimit = positive(env.USER_DAILY_LIMIT, 5);
  const anonLimit = positive(env.ANON_DAILY_LIMIT, 10);
  const budgetTwd = positive(env.DAILY_BUDGET_TWD, 10);
  const usdTwd = positive(env.USD_TWD, 32.5);

  // 驗 token：沒帶 → { uid: null }；有效 → { uid }；帶了但無效 → { invalid: true }。日誌不記 token
  async function identify(req) {
    const token = bearerToken(req);
    if (token === null) return { uid: null };
    if (!token || !auth) return { invalid: true };
    try {
      const uid = await auth.verify(token);
      return uid ? { uid } : { invalid: true };
    } catch {
      return { invalid: true };
    }
  }

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
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '3600');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    // 狀態端點：給前端判斷 AI 是否開著、是否維護中；不扣額度
    if (req.method === 'GET') {
      const who = await identify(req);
      if (who.invalid) {
        res.status(401).json({ error: '登入已失效' });
        return;
      }
      const status = { ai: env.AI_ENABLED === 'true', maintenance: env.MAINTENANCE === 'true' };
      // 讀額度失敗就回不帶 quota 的狀態，不擋使用者
      try {
        const used = await usage.used(taiwanDate(now()), { uid: who.uid });
        status.quota = { used, limit: who.uid ? userLimit : anonLimit, signedIn: Boolean(who.uid) };
      } catch (error) {
        console.error('quota read failed', error?.message);
      }
      res.status(200).json(status);
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
    const { kind, question = '', facts, tone, focus } = req.body;

    // 內容安全：該拒答的直接回，不呼叫 Claude、不扣額度、不記成本
    const { topics, refuse } = classifyQuestion(question);
    if (refuse) {
      res.status(200).json({ refusal: { kind: refuse, message: REFUSAL_MESSAGES[refuse] } });
      return;
    }

    // 緊急開關（放在拒答之後：AI 關閉時，危機求助訊息仍要送得出去）
    if (env.AI_ENABLED !== 'true') {
      res.status(503).json({ error: 'AI 暫停服務' });
      return;
    }

    // 驗登入（放在拒答與 AI 開關之後）：帶了 token 但無效 → 401，不呼叫 Claude、不扣額度
    const who = await identify(req);
    if (who.invalid) {
      res.status(401).json({ error: '登入已失效' });
      return;
    }
    const { uid } = who;

    // 一張卡都選不到就不呼叫 Claude，也不耗額度
    const selected = selectCards(kind, facts, focus, cardDb);
    if (selected.length === 0) {
      console.error('no cards', { kind });
      res.status(500).json({ error: 'No cards' });
      return;
    }

    try {
      // 先查每日預算（略為超出可接受，不與計數放同一個 transaction），再查次數
      const spentTwd = (await usage.spentUsd(taiwanDate(now()))) * usdTwd;
      if (spentTwd >= budgetTwd) {
        res.status(429).json({ error: '今日 AI 解讀額度已用完', limit: 'budget' });
        return;
      }
      if (!(await usage.consume(taiwanDate(now()), { uid, limit: uid ? userLimit : anonLimit }))) {
        res.status(429).json(uid
          ? { error: '今天的 AI 解讀次數用完了', limit: 'user' }
          : { error: '未登入的共用次數今天用完了', limit: 'anon' });
        return;
      }
    } catch (error) {
      console.error('usage error', error?.message);
      res.status(500).json({ error: 'Server error' });
      return;
    }

    // 隱私：日誌不記錄 question 與 facts
    const user = buildUserMessage({ kind, question, facts, tone, focus, cards: selected, topics }, taiwanDate(now()));
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
        // 第二道內容安全：關鍵字沒抓到的隱晦說法，由 Claude 判斷整句意思
        const risk = out?.reading?.risk;
        if (risk === 'selfharm' || risk === 'death') {
          status = 'refused';
          result = { refusal: { kind: risk, message: REFUSAL_MESSAGES[risk] } };
          break;
        }
        const { reading, problem } = checkReading(out?.reading, tone, selected);
        if (reading) {
          status = 'ok';
          result = reading;
          break;
        }
        // 只記沒過的是哪一條、不在清單的卡號、Claude 停止原因（不含問題與盤面）
        const allowedIds = new Set(selected.map((c) => c.id));
        const unknownCards = (Array.isArray(out?.reading?.paragraphs) ? out.reading.paragraphs : [])
          .flatMap((p) => (Array.isArray(p?.cards) ? p.cards : []))
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
