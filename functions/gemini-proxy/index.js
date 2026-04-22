import functions from '@google-cloud/functions-framework';
import { GoogleGenAI } from '@google/genai';
import { Firestore } from '@google-cloud/firestore';

// TODO: Board 填入 GCP Console - 逗號分隔字串，例如 "https://example.com,http://localhost:5173"
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
const ALLOWED_ORIGINS = allowedOriginsEnv
  ? new Set(allowedOriginsEnv.split(',').map(o => o.trim()).filter(Boolean))
  : new Set(); // 未設定時空集合，等同全拒

const ALLOWED_MODELS = new Set([
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
]);

const MAX_PROMPT_LENGTH = 20000;
const RATE_LIMIT_MAX = 10; // 每分鐘同一 IP 最多 10 次
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 分鐘

const db = new Firestore();

// 回傳 true 表示已超過限制，false 表示允許（含 Firestore 不可用時的 fallback）
async function isRateLimited(ip) {
  const now = Date.now();
  const docRef = db.collection('rate_limits').doc(ip);
  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      if (!snap.exists) {
        tx.set(docRef, {
          count: 1,
          windowStart: now,
          // TODO: 需在 GCP Console 為 rate_limits collection 設定 Firestore TTL policy（欄位 expireAt）
          expireAt: new Date(now + RATE_LIMIT_WINDOW_MS),
        });
        return false;
      }
      const { count, windowStart } = snap.data();
      if (now - windowStart >= RATE_LIMIT_WINDOW_MS) {
        tx.set(docRef, {
          count: 1,
          windowStart: now,
          expireAt: new Date(now + RATE_LIMIT_WINDOW_MS),
        });
        return false;
      }
      if (count >= RATE_LIMIT_MAX) return true;
      tx.update(docRef, { count: count + 1 });
      return false;
    });
  } catch (err) {
    // 本機開發無 Firestore 連線時跳過 rate limit，不影響功能
    console.error('Firestore rate limit unavailable, skipping:', err.message);
    return false;
  }
}

functions.http('geminiProxy', async (req, res) => {
  const origin = req.get('Origin');
  const isAllowedOrigin = !!origin && ALLOWED_ORIGINS.has(origin);

  if (isAllowedOrigin) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');
  }

  // Origin 不在白名單時一律拒絕（含 OPTIONS preflight）
  if (origin && !isAllowedOrigin) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // IP Rate Limit（Firestore-based，本機無連線時自動 skip）
  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.ip ||
    'unknown';
  if (await isRateLimited(ip)) {
    res.status(429).json({ error: 'Too many requests' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not configured');
    res.status(500).json({ error: 'Server not configured' });
    return;
  }

  const { model, prompt, context, promptVersion } = req.body ?? {};

  // 記錄 context 與 promptVersion 至 Cloud Function logs
  console.log('proxy request', JSON.stringify({ context: context ?? null, promptVersion: promptVersion ?? null }));

  if (typeof model !== 'string' || !ALLOWED_MODELS.has(model)) {
    res.status(400).json({ error: 'Invalid model' });
    return;
  }

  if (typeof prompt !== 'string' || prompt.length === 0) {
    res.status(400).json({ error: 'Missing prompt' });
    return;
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    res.status(413).json({ error: 'Prompt too long' });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      res.status(502).json({ error: '大師沈默了（無回應內容）' });
      return;
    }

    res.status(200).json({ text });
  } catch (error) {
    console.error('Gemini API error:', error);
    const message = error?.message || 'Gemini call failed';
    res.status(502).json({ error: message });
  }
});
