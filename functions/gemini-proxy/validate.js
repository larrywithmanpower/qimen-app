import { findAbsolute } from './safety.js';
import { FOLLOWUP_ACTIONS, FOLLOWUP_FOCUSES } from './prompt.js';
// 請求與回應的格式檢查（純函式）
export const KINDS = ['tarot', 'meihua', 'ziwei'];
export const TONES = ['吉', '平', '凶'];
// 紫微想看哪一段時間（本命＝一生）
export const FOCUSES = ['natal', 'decadal', 'yearly', 'monthly', 'daily'];
export const MAX_QUESTION = 200;
export const MAX_FACTS = 8000;
export const MAX_HISTORY = 8;
export const MAX_HISTORY_A = 600;

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
  if (body.focus !== undefined && (body.kind !== 'ziwei' || !FOCUSES.includes(body.focus))) return 'Invalid focus';
  if (!isObj(body.facts)) return 'Invalid facts';
  if (JSON.stringify(body.facts).length > MAX_FACTS) return 'Facts too long';
  if (body.mode !== undefined) {
    if (body.mode !== 'followup' || body.kind !== 'ziwei') return 'Invalid mode';
    if (!nonEmpty(q)) return 'Missing question';
    const h = body.history;
    if (!Array.isArray(h) || h.length < 1 || h.length > MAX_HISTORY) return 'Invalid history';
    for (const item of h) {
      if (!isObj(item) || typeof item.q !== 'string' || typeof item.a !== 'string') return 'Invalid history';
      if ([...item.q].length > MAX_QUESTION || [...item.a].length > MAX_HISTORY_A) return 'Invalid history';
    }
  }
  return null;
}

// YYYY-MM-DD 且是真的日期
export function isIsoDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

// 檢查 Claude 的回傳：通過回 { reading }，不過回 { problem }（哪一條沒過，只給日誌用）
// allowedCards：這次請求選出的知識卡；每段 cards 只能引用其中的 id
export function checkReading(out, tone, allowedCards = []) {
  const byId = new Map(allowedCards.map((c) => [c.id, c]));
  const fail = (problem) => ({ reading: null, problem });
  if (!isObj(out)) return fail('not_json');
  if (!nonEmpty(out.verdict)) return fail('verdict');
  if (out.tone !== tone) return fail('tone');
  if (!Array.isArray(out.paragraphs) || out.paragraphs.length === 0) return fail('paragraphs');
  const paragraphs = [];
  for (const p of out.paragraphs) {
    if (!isObj(p) || !nonEmpty(p.title) || !nonEmpty(p.text)) return fail('paragraph_text');
    if (!Array.isArray(p.basis) || p.basis.length === 0 || !p.basis.every(nonEmpty)) return fail('basis');
    if (!Array.isArray(p.cards) || p.cards.length === 0 || !p.cards.every((id) => nonEmpty(id) && byId.has(id))) return fail('cards');
    const cards = [...new Set(p.cards)].map((id) => {
      const c = byId.get(id);
      return { id: c.id, title: c.title, source: c.source };
    });
    paragraphs.push({ title: p.title, text: p.text, basis: p.basis, cards });
  }
  const pr = out.prediction;
  if (!isObj(pr) || !nonEmpty(pr.claim)) return fail('prediction');
  if (!isIsoDate(pr.dueDate)) return fail('due_date');
  // 絕對化字眼（一定、保證…）視同格式不過
  const allText = [out.verdict, pr.claim, ...paragraphs.flatMap((p) => [p.title, p.text, ...p.basis])].join('\n');
  if (findAbsolute(allText).length > 0) return fail('absolute');
  return {
    reading: {
      verdict: out.verdict,
      tone: out.tone,
      paragraphs,
      prediction: { claim: pr.claim, dueDate: pr.dueDate },
    },
    problem: null,
  };
}

// 通過回傳整理過的物件，不過回 null
export function validateReading(out, tone, allowedCards = []) {
  return checkReading(out, tone, allowedCards).reading;
}

// 檢查追問的回傳：通過回 { followup }，不過回 { problem }
// allowedCards：這次請求選出的知識卡；cards 只能引用其中的 id
export function checkFollowup(out, allowedCards = []) {
  const byId = new Map(allowedCards.map((c) => [c.id, c]));
  const fail = (problem) => ({ followup: null, problem });
  if (!isObj(out)) return fail('not_json');
  if (!FOLLOWUP_ACTIONS.includes(out.action)) return fail('action');
  if (!nonEmpty(out.text)) return fail('text');
  const basis = Array.isArray(out.basis) ? out.basis : [];
  let followup;
  if (out.action === 'answer' || out.action === 'cards') {
    if (basis.length < 1 || basis.length > 3 || !basis.every(nonEmpty)) return fail('basis');
    const ids = Array.isArray(out.cards) ? out.cards : [];
    if (ids.length < 1 || ids.length > 3 || !ids.every((id) => nonEmpty(id) && byId.has(id))) return fail('cards');
    const cards = [...new Set(ids)].map((id) => {
      const c = byId.get(id);
      return { id: c.id, title: c.title, source: c.source };
    });
    followup = { action: out.action, text: out.text, basis, cards };
  } else if (out.action === 'recompute') {
    if (!FOLLOWUP_FOCUSES.includes(out.targetFocus)) return fail('target_focus');
    if (!isIsoDate(out.targetDate) || out.targetDate < '1900-01-01' || out.targetDate > '2100-12-31') return fail('target_date');
    followup = { action: 'recompute', text: out.text, target: { focus: out.targetFocus, date: out.targetDate } };
  } else {
    followup = { action: 'refuse', text: out.text };
  }
  // 絕對化字眼視同格式不過
  if (findAbsolute([out.text, ...basis.filter((b) => typeof b === 'string')].join('\n')).length > 0) return fail('absolute');
  return { followup, problem: null };
}
