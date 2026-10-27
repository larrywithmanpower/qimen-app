// 內容安全（純函式）：問題分類與絕對化字眼檢查。前端 src/mingli/ai.ts 有同一份絕對化規則，改這裡要一起改

// 要先拿掉的日常詞：避免「毛病」「電池壽命」這類不是在問醫療／壽命的字眼誤中
const NOISE = /毛病|語病|電池壽命|手機壽命|產品壽命|機器壽命/g;

// 話題關鍵字（命中只會加提醒，不拒答）
export const TOPIC_PATTERNS = {
  medical: [
    /病/, /癌/, /腫瘤/, /手術/, /開刀/, /化療/, /住院/, /懷孕/, /流產/, /不孕/, /診斷/, /治療/,
    /吃藥/, /用藥/, /服藥/, /藥物/, /看醫生/, /看醫師/, /就醫/, /復健/, /憂鬱症/, /血壓/, /血糖/,
  ],
  investment: [
    /股票/, /股市/, /投資/, /基金/, /ETF/i, /虛擬幣/, /加密貨幣/, /比特幣/, /期貨/, /選擇權/,
    /進場/, /套牢/, /停損/, /要不要出手/, /該不該出手/, /買房.{0,6}(投資|增值|保值|獲利|炒)/,
    /(投資|增值|保值|獲利|炒).{0,6}買房/,
  ],
  legal: [
    /官司/, /訴訟/, /起訴/, /提告/, /告我/, /法院/, /判決/, /律師/, /合約糾紛/, /契約糾紛/,
    /離婚.{0,8}(財產|贍養|監護)/, /(財產|贍養|監護).{0,8}離婚/, /財產分配/, /監護權/, /贍養費/,
  ],
};

// 拒答關鍵字。selfharm 優先於 death。
// 帶 lookahead 的用來避開「死心」「死黨」「死當」「想死你」「想死記」「不想活動」這類日常詞
export const REFUSE_PATTERNS = {
  selfharm: [
    /自殺/, /輕生/, /尋短/, /結束(自己的)?生命/, /結束自己/, /了結自己/, /傷害自己/, /活不下去/, /不想活(?!動)/,
    /(?<!(累|熱|餓|笑|煩|氣|忙|痛)(到|得))想(去)?死(?!你|記|背|守|心)/, /死了算了/, /不如死了?/, /一了百了/, /放棄(自己的)?生命/,
    /割腕/, /跳樓/, /燒炭/, /上吊/, /吞藥/, /安眠藥/, /不想(再)?醒來/,
    /離開這個世界/, /(這個)?世界(上)?消失/, /不在了.{0,8}(比較好|會更好)/, /沒有我.{0,6}(比較好|會更好)/,
    /活著(好|很|真|太)?(累|痛苦|沒意義|沒有意義)/, /人生(沒有|沒)意義/, /不想(再)?存在/,
  ],
  death: [
    /壽命/, /陽壽/, /壽終/, /死期/, /活到(幾|多少|什麼)/, /還能活/, /還有多久.{0,3}(命|活)/,
    /(哪|什麼|甚麼|何|幾)(時候|時|歲|年).{0,3}(會)?死(?!心|黨|當|機|板|角|線)/,
    // 「會不會死」要是人或時間開頭，「這個專案會不會死掉」不算
    /(^|我|你|他|她|爸|媽|父|母|家人|老公|老婆|先生|太太|小孩|孩子|兒子|女兒|爺爺|奶奶|外公|外婆|阿公|阿嬤|親人|年|月|天|後)(會不會|會)(死|掛掉)(?!心|黨|當|機|板|角|線)/,
    /會不會(過世|去世|離世)/,
    /我會死嗎/, /會不會英年早逝/,
  ],
};

const hit = (patterns, q) => patterns.some((re) => re.test(q));

// 回傳 { topics: ['medical'|'investment'|'legal'...], refuse: null | 'death' | 'selfharm' }
export function classifyQuestion(question) {
  const q = (typeof question === 'string' ? question : '').replace(NOISE, '').replace(/\s+/g, '');
  const topics = Object.keys(TOPIC_PATTERNS).filter((t) => hit(TOPIC_PATTERNS[t], q));
  let refuse = null;
  if (hit(REFUSE_PATTERNS.selfharm, q)) refuse = 'selfharm';
  else if (hit(REFUSE_PATTERNS.death, q)) refuse = 'death';
  return { topics, refuse };
}

// 婉拒訊息（後端組好，前端照顯示）
export const REFUSAL_MESSAGES = {
  death: '命理不談壽命與生死，這類問題我們不解讀。如果你想問的是「接下來這段時間怎麼過得更好」，歡迎換個方式再問一次。',
  selfharm: '看到你寫的內容，我們很在意你現在的狀態，這個問題不適合用命理來回答。你不需要一個人撐著：台灣安心專線 1925（24 小時免費），也可以撥生命線 1995。如果有立即的危險，請直接撥 119。',
};

// 絕對化字眼：一定、必定、絕對、保證、百分之百、100%、肯定會
const ABSOLUTE_RE = /一定|必定|絕對|保證|百分之百|100[%％]|肯定會/g;
// 前面緊接這些字就是否定（不一定、未必一定、不保證、不見得一定、並非絕對、無法保證）
const NEGATION_TAIL = /(不|未必|不見得|不是|並非|非|無法|沒辦法|難以|不能)$/;
// 「一定」後面接這些是「某個程度」的意思，不是絕對（有一定的參考價值）
const SOFT_AFTER = /^(的|程度|範圍|限度|水準|數量|比例|機率)/;

// 回傳文字裡出現的絕對化字眼（不重複）；被否定的、「一定的…」不算
export function findAbsolute(text) {
  const s = typeof text === 'string' ? text : '';
  const found = new Set();
  for (const m of s.matchAll(ABSOLUTE_RE)) {
    const before = s.slice(Math.max(0, m.index - 4), m.index);
    const after = s.slice(m.index + m[0].length);
    if (NEGATION_TAIL.test(before)) continue;
    if (m[0] === '一定' && SOFT_AFTER.test(after)) continue;
    found.add(m[0]);
  }
  return [...found];
}
