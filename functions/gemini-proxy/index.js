import functions from '@google-cloud/functions-framework';
import { GoogleGenAI } from '@google/genai';

// TODO: Board 填入 GCP Console - 逗號分隔字串，例如 "https://example.com,http://localhost:5173"
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
const ALLOWED_ORIGINS = allowedOriginsEnv
  ? new Set(allowedOriginsEnv.split(',').map(o => o.trim()).filter(Boolean))
  : new Set(); // 未設定時空集合，等同全拒

// 免費額度模型，gemini-2.0-flash 已於 2026/03 退役不再列入
const ALLOWED_MODELS = new Set([
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
]);

const MAX_PROMPT_LENGTH = 20000;

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
