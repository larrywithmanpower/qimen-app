import type { PalaceAnalysis } from './analysis';

/**
 * 根據分析結果產生一句「人話總結」，讓不懂奇門的使用者一眼看懂。
 * 策略：verdict 基線語 + 主門動作提示，兩段銜接。
 */

const VERDICT_BASELINE: Record<PalaceAnalysis['verdict'], string> = {
  '大吉': '整體大吉，是主動出擊的黃金時機',
  '吉':   '局勢有利，可以行動，但仍需搭配時機',
  '平':   '吉凶交錯、有利有弊，先觀察再決定',
  '小凶': '阻力微現，暫緩或調整方向為宜',
  '凶':   '風險偏大，建議保守應對、等待時機',
  '大凶': '凶象明顯，務必暫停、另尋他路',
};

/** 主門的動作提示：依當前局勢正負給出不同建議 */
const DOOR_HINT: Record<string, { positive: string; negative: string }> = {
  '開門': { positive: '尤其利於開創、談判、見貴',   negative: '雖主開創但時機不濟，強推易反彈' },
  '生門': { positive: '財源機會並至，利投資求職',   negative: '機會雖在，強進恐耗財，守方為宜' },
  '休門': { positive: '利休養聚會、穩固感情關係',   negative: '過度活動易生疲乏，宜靜不宜動' },
  '杜門': { positive: '可潛心研修、閉門做功課',     negative: '事情容易卡關、溝通受阻' },
  '景門': { positive: '表面熱鬧有光，可宣傳造勢',   negative: '虛有其表、難以持久，留心泡沫' },
  '傷門': { positive: '利於出征競爭（但要小心）',   negative: '易起衝突、破財、人際受傷' },
  '驚門': { positive: '適合需要口才的場合',         negative: '口舌是非、官司意外找上門' },
  '死門': { positive: '利停損收尾、送舊迎新',       negative: '諸事不利，絕對暫停、等待轉機' },
};

/** 用事宮前綴：強化「這是你的主角」提示 */
const MAIN_PALACE_PREFIX = '你的用事宮顯示，';
const SIDE_PALACE_PREFIX = '此宮象意顯示，';

/**
 * 產生一句人話總結
 * @example
 * summarizePalace(analysis)
 * // "你的用事宮顯示，凶象明顯，務必暫停、另尋他路，諸事不利，絕對暫停、等待轉機。"
 */
export function summarizePalace(analysis: PalaceAnalysis): string {
  const baseline = VERDICT_BASELINE[analysis.verdict];
  const doorValue = analysis.elements.door.value;
  const doorHint = DOOR_HINT[doorValue];
  const isFavorable = analysis.score >= 0;
  const prefix = analysis.isMainPalace ? MAIN_PALACE_PREFIX : SIDE_PALACE_PREFIX;

  const tail = doorHint
    ? `，${isFavorable ? doorHint.positive : doorHint.negative}。`
    : '。';

  return `${prefix}${baseline}${tail}`;
}

/**
 * 生成簡短的「建議行動」標籤（2-4 字），顯示在徽章旁
 */
export function actionLabel(analysis: PalaceAnalysis): string {
  const s = analysis.score;
  if (s >= 7) return '主動出擊';
  if (s >= 3) return '謹慎行事';
  if (s >= 0) return '保守應對';
  if (s >= -5) return '暫緩等待';
  return '暫停避凶';
}
