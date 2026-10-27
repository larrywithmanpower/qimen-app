// 知識卡：AI 解讀只能依卡片內容寫。卡片檔在 cards/*.json，啟動時讀一次
import { readFileSync } from 'node:fs';

const FILES = { tarot: 'tarot.json', meihua: 'meihua.json', ziwei: 'ziwei.json' };

// 回傳 { tarot: 卡[], meihua: 卡[], ziwei: 卡[] }
export function loadCards() {
  const db = {};
  for (const [kind, file] of Object.entries(FILES)) {
    const raw = readFileSync(new URL(`./cards/${file}`, import.meta.url), 'utf8');
    db[kind] = JSON.parse(raw).cards;
  }
  return db;
}

const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const arr = (v) => (Array.isArray(v) ? v : []);

// 依 facts 算出這次要用的卡條件，回傳判斷函式 (when) => boolean
function buildMatcher(kind, facts, focus) {
  const f = isObj(facts) ? facts : {};
  const tests = [];
  if (kind === 'tarot') {
    const pairs = new Set(arr(f.cards).filter(isObj).map((c) => `${c.name}|${c.orientation}`));
    tests.push((w) => w.card !== undefined && pairs.has(`${w.card}|${w.orientation}`));
  } else if (kind === 'meihua') {
    const names = new Set([f.main, f.mutual, f.changed].map((h) => (isObj(h) ? h.name : undefined)).filter(Boolean));
    const line = Number.isInteger(f.movingLine) && f.movingLine >= 1 && f.movingLine <= 6 ? f.movingLine : 0;
    const mainName = isObj(f.main) ? f.main.name : undefined;
    const trigrams = new Set([isObj(f.ti) ? f.ti.trigram : undefined, isObj(f.yong) ? f.yong.trigram : undefined].filter(Boolean));
    tests.push((w) => w.hexagram !== undefined && w.line === undefined && names.has(w.hexagram));
    tests.push((w) => w.hexagram !== undefined && w.line !== undefined && w.hexagram === mainName && w.line === line);
    tests.push((w) => w.relation !== undefined && w.relation === f.relation);
    tests.push((w) => w.trigram !== undefined && trigrams.has(w.trigram));
  } else if (kind === 'ziwei') {
    const palaces = arr(f.palaces).filter(isObj);
    const stars = new Set();
    const mutagens = new Set();
    for (const p of palaces) {
      for (const s of [...arr(p.majorStars), ...arr(p.minorStars)]) {
        if (!isObj(s)) continue;
        stars.add(s.name);
        if (s.mutagen) mutagens.add(s.mutagen);
      }
    }
    const horo = isObj(f.horoscope) ? f.horoscope : {};
    for (const layer of Object.values(horo)) {
      if (!isObj(layer)) continue;
      for (const m of arr(layer.mutagens)) if (isObj(m) && m.mutagen) mutagens.add(m.mutagen);
    }
    const palaceNames = new Set(palaces.map((p) => p.name));
    tests.push((w) => w.star !== undefined && stars.has(w.star));
    tests.push((w) => w.palace !== undefined && palaceNames.has(w.palace));
    tests.push((w) => w.mutagen !== undefined && mutagens.has(w.mutagen));
    tests.push((w) => w.focus !== undefined && focus && focus !== 'natal' && w.focus === focus);
  }
  return (when) => isObj(when) && tests.some((t) => t(when));
}

// 純函式：依盤面事實選出這次可以用的卡（不重複，順序＝卡片檔順序）。db 可注入
export function selectCards(kind, facts, focus, db) {
  const all = arr(db?.[kind]);
  const match = buildMatcher(kind, facts, focus);
  const seen = new Set();
  const out = [];
  for (const card of all) {
    if (!isObj(card) || seen.has(card.id) || !match(card.when)) continue;
    seen.add(card.id);
    out.push(card);
  }
  return out;
}
