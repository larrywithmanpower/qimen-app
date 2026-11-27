// 知識卡文字檔（cards/*.txt）的讀法：Boss 直接用文字編輯器改，不用碰 JSON
// 格式（每張卡一段，段與段之間空一行；# 開頭是說明）：
//   [卡號] 標題
//   條件：牌=愚者 正逆=正位
//   出處：……
//   內容：……（一行寫完）
// 寫錯（缺欄位、條件名稱不認得、卡號重複…）就丟錯並指出第幾行，測試紅燈、不會上線

// 每種術數認得的條件：中文名稱 → 程式內部欄位
export const CONDITION_KEYS = {
  tarot: { 牌: 'card', 正逆: 'orientation' },
  meihua: { 卦: 'hexagram', 爻: 'line', 八卦: 'trigram', 體用: 'relation' },
  ziwei: { 星: 'star', 宮: 'palace', 四化: 'mutagen', 運限: 'focus' },
};
const NUMBER_KEYS = new Set(['line']);
const FIELDS = { 條件: 'when', 出處: 'source', 內容: 'text' };

export function parseCardsText(text, kind) {
  const keys = CONDITION_KEYS[kind];
  if (!keys) throw new Error(`不認得的術數：${kind}`);
  const cards = [];
  const ids = new Set();
  let version = null;
  let cur = null;
  const lines = String(text).split(/\r?\n/);
  const finish = () => {
    if (!cur) return;
    for (const [zh, en] of Object.entries(FIELDS)) {
      if (cur[en] === undefined) throw new Error(`第 ${cur.line} 行的 [${cur.id}] 少了「${zh}：」`);
    }
    cards.push({ id: cur.id, title: cur.title, source: cur.source, when: cur.when, text: cur.text });
    cur = null;
  };
  lines.forEach((raw, i) => {
    const no = i + 1;
    const line = raw.trim();
    if (line === '' ) return finish();
    if (line.startsWith('#')) return;
    const ver = line.match(/^版本：\s*(\d+)$/);
    if (ver && !cur) {
      version = Number(ver[1]);
      return;
    }
    const head = line.match(/^\[([^\]\s]+)\]\s*(.+)$/);
    if (head) {
      finish();
      if (ids.has(head[1])) throw new Error(`第 ${no} 行：卡號 ${head[1]} 重複`);
      ids.add(head[1]);
      cur = { id: head[1], title: head[2].trim(), line: no };
      return;
    }
    if (!cur) throw new Error(`第 ${no} 行：不在任何一張卡底下（每張卡要用「[卡號] 標題」開頭）`);
    const field = line.match(/^(條件|出處|內容)：\s*(.*)$/);
    if (!field) throw new Error(`第 ${no} 行：看不懂這行，每行要是「條件：」「出處：」「內容：」其中一種`);
    const [, zh, value] = field;
    const en = FIELDS[zh];
    if (cur[en] !== undefined) throw new Error(`第 ${no} 行：[${cur.id}] 的「${zh}：」寫了兩次`);
    if (value.trim() === '') throw new Error(`第 ${no} 行：[${cur.id}] 的「${zh}：」是空的`);
    if (en !== 'when') {
      cur[en] = value.trim();
      return;
    }
    const when = {};
    for (const pair of value.trim().split(/\s+/)) {
      const m = pair.match(/^([^=＝]+)[=＝](.+)$/);
      if (!m) throw new Error(`第 ${no} 行：條件「${pair}」要寫成 名稱=值`);
      const key = keys[m[1]];
      if (!key) throw new Error(`第 ${no} 行：條件「${m[1]}」不認得，這種卡只能用 ${Object.keys(keys).join('、')}`);
      if (when[key] !== undefined) throw new Error(`第 ${no} 行：條件「${m[1]}」寫了兩次`);
      if (NUMBER_KEYS.has(key)) {
        if (!/^[1-6]$/.test(m[2])) throw new Error(`第 ${no} 行：爻要是 1～6`);
        when[key] = Number(m[2]);
      } else when[key] = m[2];
    }
    cur.when = when;
  });
  finish();
  if (version === null) throw new Error('檔案開頭少了「版本：數字」');
  if (cards.length === 0) throw new Error('一張卡都沒有');
  return { version, kind, cards };
}
