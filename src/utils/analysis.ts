import type { PalaceData } from '../hooks/useQiMen';

export interface PalaceAnalysis {
  palaceName: string;
  isCenter: boolean;
  score: number;
  result: '吉' | '凶' | '大凶';
  details: string[];
}

const GREEN_OMINOUS = {
  gods: ['白虎'],
  stars: ['天蓬', '天芮'],
  doors: ['死門'],
  stems: ['庚']
};

const RED_AUSPICIOUS = {
  gods: ['值符', '太陰', '六合', '九天'], // +20
  stars: ['天輔', '天心', '天任'], // +20
  doors: ['開門', '休門', '生門'], // +40
  stems: ['乙', '丙', '丁', '戊'] // +10
};

export function analyzePalace(palaceNum: number, data: PalaceData): PalaceAnalysis {
  let currentData = data;
  let isCenter = false;
  let displayPalaceName = data.name;

  // 1. Check 5 (Central Palace Rule)
  // If input is Palace 5 (Center), the calling code should have already provided Palace 2's data
  // but marked it as "from center".
  // Actually, the prompt says "If user clicks Center, system automatically fetches Kun (2) data".
  // So the *component* will likely pass Palace 2's data when Palace 5 is clicked, 
  // or we handle the mapping here if we have access to all palaces.
  // To keep this function pure and simple, let's assume `data` is heavily context-dependent.
  // BETTER APPROACH: The UI handles the data substitution. 
  // When User clicks "5", we rename it to "中五 (寄坤二)" and pass Palace 2's data to this function.
  // Wait, let's just make this function accepting the data it needs to analyze.

  // Actually, let's strictly follow the prompt's logical flow request. It implies the logic might check index.
  // "If user clicks Center ... fetch Kun 2".
  // I'll stick to: Input is `PalaceData`. Caller handles the "fetching Kun 2" part if `palaceNum` is 5.

  const analysis: PalaceAnalysis = {
    palaceName: displayPalaceName,
    isCenter: palaceNum === 5,
    score: 0,
    result: '凶',
    details: []
  };

  // 2. Instant Fail (Green Attributes)
  const greenFound = [];
  if (GREEN_OMINOUS.gods.includes(currentData.god)) greenFound.push(`${currentData.god}(神)`);
  if (GREEN_OMINOUS.stars.includes(currentData.star)) greenFound.push(`${currentData.star}(星)`);
  if (GREEN_OMINOUS.doors.includes(currentData.door)) greenFound.push(`${currentData.door}(門)`);
  if (GREEN_OMINOUS.stems.includes(currentData.heavenStem)) greenFound.push(`${currentData.heavenStem}(干)`);

  if (greenFound.length > 0) {
    analysis.result = '大凶';
    analysis.details.push(`⛔ 觸犯綠色凶星/門/神: ${greenFound.join(', ')}`);
    return analysis;
  }

  // 3. Scoring (Red Attributes)
  let totalScore = 0;

  // God (+20)
  if (RED_AUSPICIOUS.gods.includes(currentData.god)) {
    totalScore += 20;
    analysis.details.push(`🔴 ${currentData.god}(神) +20`);
  } else {
    analysis.details.push(`⚫ ${currentData.god}(神) +0`);
  }

  // Star (+20)
  if (RED_AUSPICIOUS.stars.includes(currentData.star)) {
    totalScore += 20;
    analysis.details.push(`🔴 ${currentData.star}(星) +20`);
  } else {
    analysis.details.push(`⚫ ${currentData.star}(星) +0`);
  }

  // Door (+40)
  if (RED_AUSPICIOUS.doors.includes(currentData.door)) {
    totalScore += 40;
    analysis.details.push(`🔴 ${currentData.door}(門) +40`);
  } else {
    analysis.details.push(`⚫ ${currentData.door}(門) +0`);
  }

  // Stem (+10)
  if (RED_AUSPICIOUS.stems.includes(currentData.heavenStem)) {
    totalScore += 10;
    analysis.details.push(`🔴 ${currentData.heavenStem}(干) +10`);
  } else {
    analysis.details.push(`⚫ ${currentData.heavenStem}(干) +0`);
  }

  analysis.score = totalScore;
  analysis.result = totalScore >= 60 ? '吉' : '凶';
  analysis.details.push(`總分: ${totalScore}`);

  return analysis;
}
