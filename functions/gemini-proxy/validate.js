// 請求與回應的格式檢查（純函式）
export const KINDS = ['tarot', 'meihua', 'ziwei'];
export const TONES = ['吉', '平', '凶'];
export const MAX_QUESTION = 200;
export const MAX_FACTS = 8000;

const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const nonEmpty = (v) => typeof v === 'string' && v.trim().length > 0;

// 回傳錯誤訊息，沒問題回 null
export function validateRequest(body) {
  if (!isObj(body)) return 'Invalid body';
  if (!KINDS.includes(body.kind)) return 'Invalid kind';
  if (!TONES.includes(body.tone)) return 'Invalid tone';
  const q = body.question ?? '';
  if (typeof q !== 'string' || [...q].length > MAX_QUESTION) return 'Invalid question';
  if (body.kind !== 'ziwei' && q.trim() === '') return 'Missing question';
  if (!isObj(body.facts)) return 'Invalid facts';
  if (JSON.stringify(body.facts).length > MAX_FACTS) return 'Facts too long';
  return null;
}

// YYYY-MM-DD 且是真的日期
export function isIsoDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

// 檢查 Claude 的回傳，通過回傳整理過的物件，不過回 null
export function validateReading(out, tone) {
  if (!isObj(out)) return null;
  if (!nonEmpty(out.verdict) || out.tone !== tone) return null;
  if (!Array.isArray(out.paragraphs) || out.paragraphs.length === 0) return null;
  const paragraphs = [];
  for (const p of out.paragraphs) {
    if (!isObj(p) || !nonEmpty(p.title) || !nonEmpty(p.text)) return null;
    if (!Array.isArray(p.basis) || p.basis.length === 0 || !p.basis.every(nonEmpty)) return null;
    paragraphs.push({ title: p.title, text: p.text, basis: p.basis });
  }
  const pr = out.prediction;
  if (!isObj(pr) || !nonEmpty(pr.claim) || !isIsoDate(pr.dueDate)) return null;
  return {
    verdict: out.verdict,
    tone: out.tone,
    paragraphs,
    prediction: { claim: pr.claim, dueDate: pr.dueDate },
  };
}
