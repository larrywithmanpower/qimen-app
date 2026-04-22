import functions from '@google-cloud/functions-framework';
import { GoogleGenAI } from '@google/genai';

// 允許的來源：生產環境的 GitHub Pages + 本地開發
const ALLOWED_ORIGINS = new Set([
  'https://larrywithmanpower.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
]);

const ALLOWED_MODELS = new Set([
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
]);

// 單次請求 prompt 長度上限（防呆，避免被當免費 LLM 爛用）
const MAX_PROMPT_LENGTH = 20000;

functions.http('geminiProxy', async (req, res) => {
  // CORS 處理
  const origin = req.get('Origin');
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
  }
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not configured');
    res.status(500).json({ error: 'Server not configured' });
    return;
  }

  const { model, prompt } = req.body ?? {};

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
