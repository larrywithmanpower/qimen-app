import type { PalaceData } from '../hooks/useQiMen';

// ========================================
// 七層分級制（依 KNOWLEDGE.md 九宮奇門系統）
// ========================================

export type ElementTier =
  | 'great-auspicious'  // 大吉 +3
  | 'auspicious'        // 吉 +2
  | 'small-auspicious'  // 小吉 +1
  | 'neutral'           // 中性 0
  | 'small-ominous'     // 小凶 -1
  | 'ominous'           // 凶 -2
  | 'great-ominous';    // 大凶 -3

export type ElementType = 'god' | 'star' | 'door' | 'stem';

export type Verdict = '大吉' | '吉' | '平' | '小凶' | '凶' | '大凶';

export interface ElementMeta {
  tier: ElementTier;
  score: number;
  tierLabel: string;  // 中文標籤："大吉" / "小凶" 等
  meaning: string;    // 現代象意白話
}

// ========================================
// 元素資料表（吉凶分級 + 現代象意）
// ========================================

const G = (tier: ElementTier, meaning: string): ElementMeta => {
  const map: Record<ElementTier, { score: number; label: string }> = {
    'great-auspicious': { score: 3, label: '大吉' },
    'auspicious':       { score: 2, label: '吉' },
    'small-auspicious': { score: 1, label: '小吉' },
    'neutral':          { score: 0, label: '中性' },
    'small-ominous':    { score: -1, label: '小凶' },
    'ominous':          { score: -2, label: '凶' },
    'great-ominous':    { score: -3, label: '大凶' },
  };
  return { tier, score: map[tier].score, tierLabel: map[tier].label, meaning };
};

export const ELEMENT_DATA: {
  gods: Record<string, ElementMeta>;
  stars: Record<string, ElementMeta>;
  doors: Record<string, ElementMeta>;
  stems: Record<string, ElementMeta>;
} = {
  // 八神（含陽局 / 陰局雙版本別名 — qimen-dunjia 陽局用 勾陳/朱雀 取代 白虎/玄武）
  gods: {
    '值符': G('great-auspicious', '領導、貴人、官方力量、最高保護'),
    '六合': G('auspicious',       '合作、仲介、人際和諧、媒合'),
    '九天': G('small-auspicious', '志向遠大、公開行動、擴張'),
    '九地': G('small-auspicious', '穩固、長久、防守、潛伏'),
    '太陰': G('small-auspicious', '暗中謀劃、保護、陰性資源'),
    // 螣蛇（陰局）/ 滕蛇（陽局，qimen-dunjia 實際輸出字型）— 同一神，異體字
    '螣蛇': G('ominous',          '波折、虛詐、變來變去、噩夢'),
    '滕蛇': G('ominous',          '波折、虛詐、變來變去、噩夢'),
    // 陰局：白虎 / 玄武
    '白虎': G('great-ominous',    '競爭壓迫、血光、強硬衝突'),
    '玄武': G('great-ominous',    '欺詐、小人、資訊不透明'),
    // 陽局：勾陳 ≈ 白虎、朱雀 ≈ 玄武
    '勾陳': G('great-ominous',    '糾纏、牽連、拖累（陽局白虎位）'),
    '朱雀': G('great-ominous',    '口舌、官非、欺詐資訊（陽局玄武位）'),
  },
  // 九星
  stars: {
    '天心': G('great-auspicious', '領導力、決策、醫療、貴人'),
    '天輔': G('great-auspicious', '文教、輔助、考試、貴人相助'),
    '天禽': G('auspicious',       '穩定、居中協調、平衡'),
    '天任': G('small-auspicious', '踏實、穩重、忠厚、執行力'),
    '天沖': G('small-auspicious', '衝勁、行動力、突破（需搭配吉門）'),
    '天英': G('small-ominous',    '衝動、血光、爭強好勝'),
    '天柱': G('ominous',          '破壞、好鬥、口舌是非'),
    '天蓬': G('great-ominous',    '爭訟、盜賊、破壞、混亂'),
    '天芮': G('great-ominous',    '疾病、衰敗、底層困境'),
  },
  // 八門
  doors: {
    '開門': G('great-auspicious', '開創、四通八達 — 求財、見貴、開創事業、談判'),
    '生門': G('great-auspicious', '財源、生機 — 財運、投資、求職、營造'),
    '休門': G('auspicious',       '休養、聚合 — 感情、聚會、休養生息'),
    '景門': G('neutral',          '表面光鮮但虛浮（中性偏凶） — 虛有其表、難以持久'),
    '杜門': G('small-ominous',    '阻塞、封閉 — 事情停滯不前、溝通困難'),
    '驚門': G('ominous',          '驚嚇、官非 — 口舌是非、官司、意外'),
    '傷門': G('ominous',          '受傷、糾紛 — 破財、受傷、人際衝突'),
    '死門': G('great-ominous',    '終結、停滯 — 諸事不利，萬事凶'),
  },
  // 天干（以天盤為主）
  stems: {
    '乙': G('great-auspicious', '乙奇 — 柔性資源、解決方案、貴人暗助'),
    '丙': G('great-auspicious', '丙奇 — 光明、強力貴人、奇兵策略'),
    '丁': G('great-auspicious', '丁奇 — 情報、資源對接、智慧'),
    '戊': G('neutral',          '穩健、中央、守成（中性偏吉）'),
    '己': G('neutral',          '阻礙、小人、猶豫（中性偏凶）'),
    '辛': G('small-ominous',    '暗傷、隱患'),
    '壬': G('small-ominous',    '變數、流動不穩'),
    '庚': G('ominous',          '阻力、競爭對手、官非'),
    '癸': G('ominous',          '陰暗、欺騙、隱患深'),
  },
};

// ========================================
// 元素查詢 API
// ========================================

const TYPE_TO_BUCKET: Record<ElementType, keyof typeof ELEMENT_DATA> = {
  god: 'gods',
  star: 'stars',
  door: 'doors',
  stem: 'stems',
};

const UNKNOWN_META: ElementMeta = G('neutral', '未知元素');

export function getElementMeta(type: ElementType, value: string): ElementMeta {
  const bucket = ELEMENT_DATA[TYPE_TO_BUCKET[type]];
  return bucket[value] || UNKNOWN_META;
}

export function getElementStatus(type: ElementType, value: string): ElementTier {
  return getElementMeta(type, value).tier;
}

/**
 * 吉凶大方向：用於 UI 分組（正向/中性/負向）
 */
export function getElementDirection(type: ElementType, value: string): 'positive' | 'neutral' | 'negative' {
  const score = getElementMeta(type, value).score;
  if (score > 0) return 'positive';
  if (score < 0) return 'negative';
  return 'neutral';
}

/**
 * 分級強度（絕對值 0-3），供 UI 決定光暈/字重強度
 */
export function getElementIntensity(type: ElementType, value: string): number {
  return Math.abs(getElementMeta(type, value).score);
}

// ========================================
// 宮位分析
// ========================================

export interface PalaceElementSummary extends ElementMeta {
  value: string;
  typeLabel: string;  // "神" / "星" / "門" / "干"
}

export interface PalaceAnalysis {
  palaceName: string;
  isCenter: boolean;
  isMainPalace: boolean;

  /** 原始分數 -12 ~ +12 */
  score: number;
  /** 套用用事宮權重後的分數（非用事宮與原始分數相同） */
  weightedScore: number;
  /** 六級判定 */
  verdict: Verdict;
  /** 向後相容：舊版 result 欄位（簡化為三級） */
  result: '吉' | '平' | '凶' | '大凶';

  details: string[];
  elements: {
    god: PalaceElementSummary;
    star: PalaceElementSummary;
    door: PalaceElementSummary;
    stem: PalaceElementSummary;
  };
}

/**
 * 將分數映射為六級判定
 * 滿分 ±12，區間對齊 KNOWLEDGE.md 並擴展極端值
 */
export function scoreToVerdict(score: number): Verdict {
  if (score >= 9) return '大吉';
  if (score >= 7) return '吉';
  if (score >= 3) return '平';
  if (score >= 0) return '小凶';
  if (score >= -5) return '凶';
  return '大凶';
}

/**
 * 向後相容：將六級判定簡化為三級（吉/平/凶/大凶）
 */
function simplifyVerdict(v: Verdict): '吉' | '平' | '凶' | '大凶' {
  if (v === '大吉' || v === '吉') return '吉';
  if (v === '平') return '平';
  if (v === '大凶') return '大凶';
  return '凶'; // 小凶 + 凶
}

const TIER_ICON: Record<ElementTier, string> = {
  'great-auspicious': '🔴🔴🔴',
  'auspicious':       '🔴🔴',
  'small-auspicious': '🔴',
  'neutral':          '⚪',
  'small-ominous':    '🟢',
  'ominous':          '🟢🟢',
  'great-ominous':    '🟢🟢🟢',
};

function summarize(value: string, meta: ElementMeta, typeLabel: string): PalaceElementSummary {
  return { ...meta, value, typeLabel };
}

export interface AnalyzePalaceOptions {
  isMainPalace?: boolean;
}

export function analyzePalace(
  palaceNum: number,
  data: PalaceData,
  options: AnalyzePalaceOptions = {}
): PalaceAnalysis {
  const { isMainPalace = false } = options;

  const godMeta  = getElementMeta('god',  data.god);
  const starMeta = getElementMeta('star', data.star);
  const doorMeta = getElementMeta('door', data.door);
  const stemMeta = getElementMeta('stem', data.heavenStem);

  const rawScore = godMeta.score + starMeta.score + doorMeta.score + stemMeta.score;

  // 用事宮 2x 權重（KNOWLEDGE.md 強制規定）
  const weightedScore = isMainPalace ? rawScore * 2 : rawScore;
  const verdict = scoreToVerdict(rawScore);

  const elements = {
    god:  summarize(data.god,        godMeta,  '神'),
    star: summarize(data.star,       starMeta, '星'),
    door: summarize(data.door,       doorMeta, '門'),
    stem: summarize(data.heavenStem, stemMeta, '干'),
  };

  const details: string[] = [
    `${TIER_ICON[doorMeta.tier]} ${data.door}（門·${doorMeta.tierLabel}） ${doorMeta.meaning}`,
    `${TIER_ICON[starMeta.tier]} ${data.star}（星·${starMeta.tierLabel}） ${starMeta.meaning}`,
    `${TIER_ICON[godMeta.tier]} ${data.god}（神·${godMeta.tierLabel}） ${godMeta.meaning}`,
    `${TIER_ICON[stemMeta.tier]} ${data.heavenStem}（干·${stemMeta.tierLabel}） ${stemMeta.meaning}`,
    `宮位得分：${rawScore >= 0 ? '+' : ''}${rawScore} 分 → ${verdict}${isMainPalace ? `（用事宮 2× 權重：${weightedScore >= 0 ? '+' : ''}${weightedScore}）` : ''}`,
  ];

  return {
    palaceName: data.name,
    isCenter: palaceNum === 5,
    isMainPalace,
    score: rawScore,
    weightedScore,
    verdict,
    result: simplifyVerdict(verdict),
    details,
    elements,
  };
}

// ========================================
// 向後相容匯出（保留舊版介面避免破壞現有引用）
// ========================================

/** @deprecated 請改用 ELEMENT_DATA 或 getElementMeta */
export const RED_AUSPICIOUS = {
  gods:  Object.entries(ELEMENT_DATA.gods) .filter(([, m]) => m.score > 0).map(([k]) => k),
  stars: Object.entries(ELEMENT_DATA.stars).filter(([, m]) => m.score > 0).map(([k]) => k),
  doors: Object.entries(ELEMENT_DATA.doors).filter(([, m]) => m.score > 0).map(([k]) => k),
  stems: Object.entries(ELEMENT_DATA.stems).filter(([, m]) => m.score > 0).map(([k]) => k),
};

/** @deprecated 請改用 ELEMENT_DATA 或 getElementMeta */
export const GREEN_OMINOUS = {
  gods:  Object.entries(ELEMENT_DATA.gods) .filter(([, m]) => m.score < 0).map(([k]) => k),
  stars: Object.entries(ELEMENT_DATA.stars).filter(([, m]) => m.score < 0).map(([k]) => k),
  doors: Object.entries(ELEMENT_DATA.doors).filter(([, m]) => m.score < 0).map(([k]) => k),
  stems: Object.entries(ELEMENT_DATA.stems).filter(([, m]) => m.score < 0).map(([k]) => k),
};

/** @deprecated 向後相容型別別名 */
export type ElementStatus = 'auspicious' | 'ominous' | 'neutral';
