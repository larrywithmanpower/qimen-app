// 盤面核對（純函式，前後端共用）：解讀裡講到的「位置」要跟排出來的盤一致
// 名稱存不存在由別的檢查負責；這裡只管名稱都對、但擺錯位置的情況：
// 塔羅：過去／現在／接下來是哪張牌
// 梅花：本卦／互卦／變卦是哪一卦、體卦用卦是哪個八卦與五行、體用生剋
// 紫微：哪顆星在哪一宮、宮位對哪個地支、誰化祿權科忌
// 只抓寫法明確的句子；拿不準的句型一律不判，寧可漏抓也不誤報

const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const arr = (v) => (Array.isArray(v) ? v : []);
const str = (v) => (typeof v === 'string' ? v : '');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// 長的名字排前面，避免短名吃掉長名的一部分
const alt = (names) => [...new Set(names.filter(Boolean))].sort((a, b) => b.length - a.length).map(esc).join('|');

// ───────── 塔羅 ─────────
const POSITIONS = ['過去', '現在', '接下來'];

function tarotProblems(facts, text) {
  const byPos = new Map(arr(facts.cards).filter(isObj).map((c) => [str(c.position), str(c.name)]));
  const names = [...byPos.values()];
  if (names.length === 0) return [];
  // 位置詞後面直接接牌名：過去「權杖六」、現在的權杖五、接下來是聖杯三
  const re = new RegExp(`(${POSITIONS.join('|')})(?:\\s|的|是|為|位置|位|牌|這張|那張|：|:)*「?(${alt(names)})」?`, 'g');
  const out = [];
  for (const m of text.matchAll(re)) {
    const want = byPos.get(m[1]);
    if (want && want !== m[2]) out.push(`${m[1]}寫成「${m[2]}」，盤上是「${want}」`);
  }
  return out;
}

// ───────── 梅花 ─────────
const TRIGRAM_ELEMENT = { 乾: '金', 兌: '金', 離: '火', 震: '木', 巽: '木', 坎: '水', 艮: '土', 坤: '土' };
const RELATIONS = ['用生體', '體生用', '用剋體', '體剋用', '比和'];

function meihuaProblems(facts, raw) {
  const text = raw.replaceAll('克', '剋');
  const out = [];
  const hex = { 本卦: str(facts.main?.name), 互卦: str(facts.mutual?.name), 變卦: str(facts.changed?.name), 之卦: str(facts.changed?.name) };
  const names = Object.values(hex).filter(Boolean);
  if (names.length > 0) {
    for (const m of text.matchAll(new RegExp(`(本卦|互卦|變卦|之卦)(?:\\s|是|為|：|:)*「?(${alt(names)})」?`, 'g'))) {
      if (hex[m[1]] && hex[m[1]] !== m[2]) out.push(`${m[1]}寫成「${m[2]}」，盤上是「${hex[m[1]]}」`);
    }
  }
  const role = { 體卦: str(facts.ti?.trigram), 用卦: str(facts.yong?.trigram) };
  // 體卦兌、用卦震木：八卦要對，後面接的五行也要對
  for (const m of text.matchAll(/(體卦|用卦)(?:\s|是|為|：|:)*「?([乾兌離震巽坎艮坤])」?([金木水火土])?/g)) {
    if (role[m[1]] && role[m[1]] !== m[2]) out.push(`${m[1]}寫成${m[2]}，盤上是${role[m[1]]}`);
    if (m[3] && TRIGRAM_ELEMENT[m[2]] !== m[3]) out.push(`${m[2]}的五行寫成${m[3]}，應該是${TRIGRAM_ELEMENT[m[2]]}`);
  }
  // 體用生剋：只能是整體關係或三段走勢裡出現過的
  const allowed = new Set([str(facts.relation), ...arr(facts.stages).map((s) => str(s?.relation))].map((r) => r.replace('體用', '')).filter(Boolean));
  if (allowed.size > 0) {
    for (const m of text.matchAll(new RegExp(RELATIONS.join('|'), 'g'))) {
      if (!allowed.has(m[0])) out.push(`寫了「${m[0]}」，盤上的體用關係是${[...allowed].join('、')}`);
    }
  }
  return out;
}

// ───────── 紫微 ─────────
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
// 畫面與古書的別名：官祿＝事業、僕役＝交友
const PALACE_ALIAS = { 事業: '官祿', 交友: '僕役', 奴僕: '僕役', 命: '命宮' };
const PALACE_WORDS = ['命', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '僕役', '交友', '奴僕', '官祿', '事業', '田宅', '福德', '父母'];
const normPalace = (p) => PALACE_ALIAS[p] ?? p;
// 宮位前面接這些字就是運限的宮（流年命宮），不是本命盤的宮
const LAYER_PREFIX = /(流年|大限|流月|流日|今年|這十年|這個月|今天)的?$/;
const LAYER_OF = { 流年: 'yearly', 今年: 'yearly', 大限: 'decadal', 這十年: 'decadal', 流月: 'monthly', 這個月: 'monthly', 流日: 'daily', 今天: 'daily' };
const MUTAGENS = '祿權科忌';

function ziweiProblems(facts, text) {
  const palaces = arr(facts.palaces).filter(isObj);
  if (palaces.length === 0) return [];
  const starAt = new Map(); // 星名 → 本命所在地支
  const palaceBranch = new Map(); // 宮名（去掉「宮」，命宮除外）→ 地支
  const branchPalace = new Map();
  for (const p of palaces) {
    const name = str(p.name);
    palaceBranch.set(name, str(p.branch));
    branchPalace.set(str(p.branch), name);
    for (const s of [...arr(p.majorStars), ...arr(p.minorStars)]) if (isObj(s)) starAt.set(str(s.name), str(p.branch));
  }
  // 四化：本命星上的 mutagen，加上 facts.horoscope 各層的 mutagens
  const mutagenPairs = new Set();
  for (const p of palaces) for (const s of [...arr(p.majorStars), ...arr(p.minorStars)]) if (isObj(s) && s.mutagen) mutagenPairs.add(`${s.name}${s.mutagen}`);
  const horo = isObj(facts.horoscope) ? facts.horoscope : {};
  for (const layer of Object.values(horo)) if (isObj(layer)) for (const m of arr(layer.mutagens)) if (isObj(m)) mutagenPairs.add(`${m.star}${m.mutagen}`);

  const stars = alt([...starAt.keys()]);
  const palaceRe = `(${alt(PALACE_WORDS.map((p) => (p === '命' ? '命' : p)))})宮`;
  const out = [];
  // 「宮」前面的詞屬於運限層時，回傳那一層；本命回 null
  const layerAt = (idx) => {
    const m = text.slice(Math.max(0, idx - 4), idx).match(LAYER_PREFIX);
    return m ? LAYER_OF[m[1]] : null;
  };
  const branchOfPalace = (word, idx) => {
    const layer = layerAt(idx);
    const p = normPalace(word);
    if (!layer) return { branch: palaceBranch.get(p === '命宮' ? '命宮' : p), layer: null };
    // 運限層只認得命宮的地支（soulBranch），其他宮不判
    return { branch: p === '命宮' && isObj(horo[layer]) ? str(horo[layer].soulBranch) || undefined : undefined, layer };
  };

  // 1. 宮位對地支：官祿宮在巳宮、流年命宮落在午宮
  for (const m of text.matchAll(new RegExp(`${palaceRe}(?:在|落在|落|位於|是|為|就是|在於)([${BRANCHES}])宮`, 'g'))) {
    const { branch } = branchOfPalace(m[1], m.index);
    if (branch && branch !== m[2]) out.push(`${m[1]}宮寫成在${m[2]}宮，盤上在${branch}宮`);
  }
  // 1b. 地支對宮位：午宮為僕役宮、酉宮是財帛宮、酉宮，也就是你的財帛宮
  for (const m of text.matchAll(new RegExp(`([${BRANCHES}])宮(?:為|是|就是|，?也就是你?的?|，?正好是|，?剛好是)(?:看[^，。宮]{0,6}的)?${palaceRe}`, 'g'))) {
    const p = normPalace(m[2]);
    const want = branchPalace.get(m[1]);
    // 前面若是「流年命宮落在午宮，剛好是僕役宮」這種，講的是本命那一宮，照本命判
    if (want && want !== (p === '命' ? '命宮' : p)) out.push(`${m[1]}宮寫成${m[2]}宮，盤上是${want}`);
  }
  if (stars) {
    // 2. 某宮有哪些星：午宮有廉貞、天相；官祿宮有旺的巨門和火星
    const listRe = new RegExp(`(?:([${BRANCHES}])宮|${palaceRe})(?:裡|內|中)?(?:有|坐|是|為)((?:(?:[廟旺得利平不陷]的)?(?:${stars})(?:[、和與及跟]|，?還有)?)+)`, 'g');
    for (const m of text.matchAll(listRe)) {
      let branch;
      if (m[1]) branch = m[1];
      else {
        const r = branchOfPalace(m[2], m.index);
        if (r.layer) continue;
        branch = r.branch;
      }
      if (!branch) continue;
      for (const s of m[3].matchAll(new RegExp(stars, 'g'))) {
        const at = starAt.get(s[0]);
        if (at && at !== branch) out.push(`${m[1] ? m[1] : m[2]}宮寫有${s[0]}，盤上${s[0]}在${at}宮`);
      }
    }
    // 3. 某星在某宮：天同化祿落在酉宮、廉貞在午宮、天機化權在命宮所在的丑宮
    const posRe = new RegExp(`(${stars})(?:化([${MUTAGENS}]))?(?:也|都|同)?(?:落在|落|在|坐|坐在|位於|入)(?:${palaceRe}所在的)?(?:([${BRANCHES}])宮|${palaceRe})`, 'g');
    for (const m of text.matchAll(posRe)) {
      const at = starAt.get(m[1]);
      if (!at) continue;
      let branch = m[4];
      if (!branch) {
        const r = branchOfPalace(m[5], m.index + m[0].length - m[5].length - 1);
        if (r.layer) continue;
        branch = r.branch;
      }
      if (branch && branch !== at) out.push(`寫${m[1]}在${branch}宮，盤上${m[1]}在${at}宮`);
    }
    // 4. 四化：X化祿／權／科／忌 要是本命或選到的運限裡真的有的
    for (const m of text.matchAll(new RegExp(`(${stars})化([${MUTAGENS}])`, 'g'))) {
      if (!mutagenPairs.has(`${m[1]}${m[2]}`)) out.push(`寫了${m[1]}化${m[2]}，盤上沒有`);
    }
  }
  return out;
}

// 回傳發現的不一致（白話說明），空陣列表示沒問題；text 可以是多段用換行接起來
export function chartProblems(kind, facts, text) {
  const f = isObj(facts) ? facts : {};
  const t = typeof text === 'string' ? text : '';
  const lines = t.split('\n');
  const run = (fn, ff) => lines.flatMap((line) => fn(ff, line));
  if (kind === 'tarot') return run(tarotProblems, f);
  if (kind === 'meihua') return run(meihuaProblems, f);
  if (kind === 'ziwei') return run(ziweiProblems, f);
  if (kind === 'combo') return [...run(meihuaProblems, isObj(f.meihua) ? f.meihua : {}), ...run(tarotProblems, isObj(f.tarot) ? f.tarot : {})];
  return [];
}
