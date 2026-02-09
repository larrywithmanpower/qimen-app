import {
  require_lunar_javascript
} from "./chunk-CB6PYVUF.js";
import {
  __toESM
} from "./chunk-G3PMV62Z.js";

// node_modules/qimen-dunjia/constants.js
var JIEQI_JUSHU = Object.freeze({
  // 陽遁（冬至到芒種）- 陽氣漸生，局數順飛
  "冬至": { yang: true, ju: [1, 7, 4] },
  "小寒": { yang: true, ju: [2, 8, 5] },
  "大寒": { yang: true, ju: [3, 9, 6] },
  "立春": { yang: true, ju: [8, 5, 2] },
  "雨水": { yang: true, ju: [9, 6, 3] },
  "驚蟄": { yang: true, ju: [1, 7, 4] },
  "春分": { yang: true, ju: [3, 9, 6] },
  "清明": { yang: true, ju: [4, 1, 7] },
  "穀雨": { yang: true, ju: [5, 2, 8] },
  "立夏": { yang: true, ju: [4, 1, 7] },
  "小滿": { yang: true, ju: [5, 2, 8] },
  "芒種": { yang: true, ju: [6, 3, 9] },
  // 陰遁（夏至到大雪）- 陰氣漸生，局數逆飛
  "夏至": { yang: false, ju: [9, 3, 6] },
  "小暑": { yang: false, ju: [8, 2, 5] },
  "大暑": { yang: false, ju: [7, 1, 4] },
  "立秋": { yang: false, ju: [2, 5, 8] },
  "處暑": { yang: false, ju: [1, 4, 7] },
  "白露": { yang: false, ju: [9, 3, 6] },
  "秋分": { yang: false, ju: [7, 1, 4] },
  "寒露": { yang: false, ju: [6, 9, 3] },
  "霜降": { yang: false, ju: [5, 8, 2] },
  "立冬": { yang: false, ju: [6, 9, 3] },
  "小雪": { yang: false, ju: [5, 8, 2] },
  "大雪": { yang: false, ju: [4, 7, 1] }
});
var YUAN_NAMES = Object.freeze(["上元", "中元", "下元"]);
var PALACE = Object.freeze({
  XUN: 0,
  // 巽宮 - 東南
  LI: 1,
  // 離宮 - 南
  KUN: 2,
  // 坤宮 - 西南
  ZHEN: 3,
  // 震宮 - 東
  ZHONG: 4,
  // 中宮 - 中央
  DUI: 5,
  // 兌宮 - 西
  GEN: 6,
  // 艮宮 - 東北
  KAN: 7,
  // 坎宮 - 北
  QIAN: 8
  // 乾宮 - 西北
});
var ZHONG_SUBSTITUTE = PALACE.KUN;
var FLY_PATH = Object.freeze({
  /**
   * 順時針軌跡（不含中宮）
   * 用於：陽局天盤、陽局八門、九星飛布
   * 宮位順序：巽→離→坤→兌→乾→坎→艮→震
   */
  CLOCKWISE: [0, 1, 2, 5, 8, 7, 6, 3],
  /**
   * 逆時針軌跡（不含中宮）
   * 用於：陰局八神
   * 宮位順序：巽→震→艮→坎→乾→兌→坤→離
   */
  COUNTER_CLOCKWISE: [0, 3, 6, 7, 8, 5, 2, 1],
  /**
   * 八門陽局飛布軌跡（含中宮）
   * 宮位順序：坎→坤→震→巽→中→乾→兌→艮→離
   */
  DOOR_YANG: [7, 2, 3, 0, 4, 8, 5, 6, 1],
  /**
   * 八門陰局飛布軌跡（含中宮）
   * 宮位順序：坎→離→艮→兌→乾→中→巽→震→坤
   */
  DOOR_YIN: [7, 1, 6, 5, 8, 4, 0, 3, 2]
});
var DIRECTION_ARROWS = Object.freeze([
  "↘",
  "↓",
  "↙",
  // 巽(東南), 離(南), 坤(西南)
  "→",
  "",
  "←",
  // 震(東), 中(無), 兌(西)
  "↗",
  "↑",
  "↖"
  // 艮(東北), 坎(北), 乾(西北)
]);
var HETU_BAGUA = Object.freeze([
  "兌",
  "乾",
  "巽",
  "離",
  "中",
  "坎",
  "震",
  "坤",
  "艮"
]);
var LUOSHU_BAGUA = Object.freeze([
  "巽",
  "離",
  "坤",
  "震",
  "中",
  "兌",
  "艮",
  "坎",
  "乾"
]);
var FLYING_STARS = Object.freeze({
  1: "一白貪狼",
  2: "二黑巨門",
  3: "三碧祿存",
  4: "四綠文昌",
  5: "五黃廉貞",
  6: "六白武曲",
  7: "七赤破軍",
  8: "八白左輔",
  9: "九紫右弼"
});
var FLYING_STAR_CHARTS = Object.freeze({
  1: [2, 6, 4, 3, 1, 8, 7, 5, 9],
  2: [3, 7, 5, 4, 2, 9, 8, 6, 1],
  3: [4, 8, 6, 5, 3, 1, 9, 7, 2],
  4: [5, 9, 7, 6, 4, 2, 1, 8, 3],
  5: [6, 1, 8, 7, 5, 3, 2, 9, 4],
  6: [7, 2, 9, 8, 6, 4, 3, 1, 5],
  7: [8, 3, 1, 9, 7, 5, 4, 2, 6],
  8: [9, 4, 2, 1, 8, 6, 5, 3, 7],
  9: [1, 5, 3, 2, 9, 7, 6, 4, 8]
});
var QIMEN_STARS = Object.freeze([
  "天輔",
  "天英",
  "天芮",
  "天沖",
  "天禽",
  "天柱",
  "天任",
  "天蓬",
  "天心"
]);
var TIANQIN_INDEX = PALACE.ZHONG;
var EIGHT_DOORS_ORIGINAL = Object.freeze([
  "杜門",
  "景門",
  "死門",
  "傷門",
  "",
  "驚門",
  "生門",
  "休門",
  "開門"
]);
var EIGHT_DOORS_SEQUENCE = Object.freeze([
  "休門",
  "生門",
  "傷門",
  "杜門",
  "景門",
  "死門",
  "驚門",
  "開門"
]);
var EIGHT_GODS_YANG = Object.freeze([
  "值符",
  "滕蛇",
  "太陰",
  "六合",
  "勾陳",
  "朱雀",
  "九地",
  "九天"
]);
var EIGHT_GODS_YIN = Object.freeze([
  "值符",
  "滕蛇",
  "太陰",
  "六合",
  "白虎",
  "玄武",
  "九地",
  "九天"
]);
var XUN_HEADS = Object.freeze([
  "甲子",
  "甲戌",
  "甲申",
  "甲午",
  "甲辰",
  "甲寅"
]);
var SIX_XUNS = Object.freeze({
  "甲子": ["甲子", "乙丑", "丙寅", "丁卯", "戊辰", "己巳", "庚午", "辛未", "壬申", "癸酉"],
  // 空亡：戌、亥
  "甲戌": ["甲戌", "乙亥", "丙子", "丁丑", "戊寅", "己卯", "庚辰", "辛巳", "壬午", "癸未"],
  // 空亡：申、酉
  "甲申": ["甲申", "乙酉", "丙戌", "丁亥", "戊子", "己丑", "庚寅", "辛卯", "壬辰", "癸巳"],
  // 空亡：午、未
  "甲午": ["甲午", "乙未", "丙申", "丁酉", "戊戌", "己亥", "庚子", "辛丑", "壬寅", "癸卯"],
  // 空亡：辰、巳
  "甲辰": ["甲辰", "乙巳", "丙午", "丁未", "戊申", "己酉", "庚戌", "辛亥", "壬子", "癸丑"],
  // 空亡：寅、卯
  "甲寅": ["甲寅", "乙卯", "丙辰", "丁巳", "戊午", "己未", "庚申", "辛酉", "壬戌", "癸亥"]
  // 空亡：子、丑
});
var XUN_TO_HEAD = Object.freeze({
  "甲子": "戊",
  "甲戌": "己",
  "甲申": "庚",
  "甲午": "辛",
  "甲辰": "壬",
  "甲寅": "癸"
});
var XUN_TO_KONGWANG_DIRECTION = Object.freeze({
  "甲子": ["西北"],
  // 戌亥空亡 → 西北
  "甲戌": ["西南西", "西"],
  // 申酉空亡 → 西南西、西
  "甲申": ["南", "南南西"],
  // 午未空亡 → 南、南南西
  "甲午": ["東南"],
  // 辰巳空亡 → 東南
  "甲辰": ["東北東", "東"],
  // 寅卯空亡 → 東北東、東
  "甲寅": ["北", "北北東"]
  // 子丑空亡 → 北、北北東
});
var DIPAN_YANG = Object.freeze({
  1: ["辛", "乙", "己", "庚", "壬", "丁", "丙", "戊", "癸"],
  2: ["庚", "丙", "戊", "己", "辛", "癸", "丁", "乙", "壬"],
  3: ["己", "丁", "乙", "戊", "庚", "壬", "癸", "丙", "辛"],
  4: ["戊", "癸", "丙", "乙", "己", "辛", "壬", "丁", "庚"],
  5: ["乙", "壬", "丁", "丙", "戊", "庚", "辛", "癸", "己"],
  6: ["丙", "辛", "癸", "丁", "乙", "己", "庚", "壬", "戊"],
  7: ["丁", "庚", "壬", "癸", "丙", "戊", "己", "辛", "乙"],
  8: ["癸", "己", "辛", "壬", "丁", "乙", "戊", "庚", "丙"],
  9: ["壬", "戊", "庚", "辛", "癸", "丙", "乙", "己", "丁"]
});
var DIPAN_YIN = Object.freeze({
  1: ["丁", "己", "乙", "丙", "癸", "辛", "庚", "戊", "壬"],
  2: ["丙", "庚", "戊", "乙", "丁", "壬", "辛", "己", "癸"],
  3: ["乙", "辛", "己", "戊", "丙", "癸", "壬", "庚", "丁"],
  4: ["戊", "壬", "庚", "己", "乙", "丁", "癸", "辛", "丙"],
  5: ["己", "癸", "辛", "庚", "戊", "丙", "丁", "壬", "乙"],
  6: ["庚", "丁", "壬", "辛", "己", "乙", "丙", "癸", "戊"],
  7: ["辛", "丙", "癸", "壬", "庚", "戊", "乙", "丁", "己"],
  8: ["壬", "乙", "丁", "癸", "辛", "己", "戊", "丙", "庚"],
  9: ["癸", "戊", "丙", "丁", "壬", "庚", "己", "乙", "辛"]
});

// node_modules/qimen-dunjia/utils.js
function rotateArrayFromIndex(array, startIndex) {
  if (!Array.isArray(array) || array.length === 0) {
    return [];
  }
  const normalizedIndex = startIndex % array.length;
  return [
    ...array.slice(normalizedIndex),
    ...array.slice(0, normalizedIndex)
  ];
}
function generatePutSequence(flyPath, startPalaceIndex) {
  const pathIndex = flyPath.indexOf(startPalaceIndex);
  if (pathIndex === -1) {
    const substituteIndex = flyPath.indexOf(ZHONG_SUBSTITUTE);
    return rotateArrayFromIndex(flyPath, substituteIndex);
  }
  return rotateArrayFromIndex(flyPath, pathIndex);
}
function rotateMapping(sourceArray, flyPath, sourceStartIndex, targetStartIndex) {
  const normalizedSourceStart = sourceStartIndex === PALACE.ZHONG ? ZHONG_SUBSTITUTE : sourceStartIndex;
  const normalizedTargetStart = targetStartIndex === PALACE.ZHONG ? ZHONG_SUBSTITUTE : targetStartIndex;
  const getSequence = generatePutSequence(flyPath, normalizedSourceStart);
  const putSequence = generatePutSequence(flyPath, normalizedTargetStart);
  const result = new Array(9).fill("");
  for (let i = 0; i < getSequence.length; i++) {
    const sourceIndex = getSequence[i];
    const targetIndex = putSequence[i];
    result[targetIndex] = sourceArray[sourceIndex];
  }
  result[PALACE.ZHONG] = sourceArray[PALACE.ZHONG];
  return result;
}
function normalizeZhongPalace(index) {
  return index === PALACE.ZHONG ? ZHONG_SUBSTITUTE : index;
}
function findIndexWithZhongNormalization(array, element) {
  const index = array.indexOf(element);
  return normalizeZhongPalace(index);
}
function getXunHead(ganzhi) {
  for (const xunHead of XUN_HEADS) {
    if (SIX_XUNS[xunHead].includes(ganzhi)) {
      return xunHead;
    }
  }
  return null;
}
function getFuShou(xunHead) {
  return XUN_TO_HEAD[xunHead];
}
function calculateFlyStep(xunHead, currentTime) {
  const xunArray = SIX_XUNS[xunHead];
  if (!xunArray) {
    return 0;
  }
  return xunArray.indexOf(currentTime);
}
function getKongWangDirection(ganzhi) {
  const xunHead = getXunHead(ganzhi);
  return xunHead ? XUN_TO_KONGWANG_DIRECTION[xunHead] : void 0;
}
function resolveJiaHiding(tianGan, fuShou) {
  return tianGan === "甲" ? fuShou : tianGan;
}
function extractTianGan(ganzhi) {
  return ganzhi.substring(0, 1);
}
function extractDiZhi(ganzhi) {
  return ganzhi.substring(1, 2);
}

// node_modules/qimen-dunjia/calculations.js
function getHeTu() {
  return [...HETU_BAGUA];
}
function getLuoShu() {
  return [...LUOSHU_BAGUA];
}
function calculateFlyingStars(centerStar) {
  const starNumbers = FLYING_STAR_CHARTS[centerStar];
  if (!starNumbers) {
    throw new Error(`無效的中宮星數：${centerStar}，必須為 1-9`);
  }
  return starNumbers.map((num) => FLYING_STARS[num]);
}
function getDiPan(isYang, gameNumber) {
  const diPanConfig = isYang ? DIPAN_YANG : DIPAN_YIN;
  const result = diPanConfig[gameNumber];
  if (!result) {
    throw new Error(`無效的局數：${gameNumber}，必須為 1-9`);
  }
  return [...result];
}
function calculateTianPan(isYang, tianGan, fuShou, diPan) {
  const targetIndex = diPan.indexOf(tianGan);
  const sourceIndex = diPan.indexOf(fuShou);
  return rotateMapping(diPan, FLY_PATH.CLOCKWISE, sourceIndex, targetIndex);
}
function getOriginalDoors() {
  return [...EIGHT_DOORS_ORIGINAL];
}
function getZhiShiDoor(fuShou, diPan) {
  let doorIndex = diPan.indexOf(fuShou);
  doorIndex = normalizeZhongPalace(doorIndex);
  return EIGHT_DOORS_ORIGINAL[doorIndex];
}
function calculateEightDoors(isYang, zhiShiDoor, flyStep, fuShou, diPan) {
  const startIndex = diPan.indexOf(fuShou);
  const flyIndex = isYang ? FLY_PATH.DOOR_YANG : FLY_PATH.DOOR_YIN;
  const normalizedFlyStep = flyStep % flyIndex.length;
  const putSequence = generatePutSequence(flyIndex, startIndex);
  let zhiShiTargetIndex = putSequence[normalizedFlyStep];
  zhiShiTargetIndex = normalizeZhongPalace(zhiShiTargetIndex);
  const doorPutSequence = generatePutSequence(FLY_PATH.CLOCKWISE, zhiShiTargetIndex);
  const zhiShiIndexInSequence = EIGHT_DOORS_SEQUENCE.indexOf(zhiShiDoor);
  const doorOrder = [
    ...EIGHT_DOORS_SEQUENCE.slice(zhiShiIndexInSequence),
    ...EIGHT_DOORS_SEQUENCE.slice(0, zhiShiIndexInSequence)
  ];
  const result = new Array(9).fill("");
  for (let i = 0; i < doorPutSequence.length; i++) {
    result[doorPutSequence[i]] = doorOrder[i];
  }
  return result;
}
function getOriginalStars() {
  return [...QIMEN_STARS];
}
function getZhiFuStar(fuShou, diPan) {
  const starIndex = diPan.indexOf(fuShou);
  return QIMEN_STARS[starIndex];
}
function getZhiFuPosition(tianGan, diPan) {
  const positionIndex = diPan.indexOf(tianGan);
  return LUOSHU_BAGUA[positionIndex];
}
function calculateNineStars(zhiFuStar, tianGan, diPan) {
  const targetIndex = diPan.indexOf(tianGan);
  const sourceIndex = QIMEN_STARS.indexOf(zhiFuStar);
  return rotateMapping(QIMEN_STARS, FLY_PATH.CLOCKWISE, sourceIndex, targetIndex);
}
function getTianQinDirection(nineStars) {
  const tianRuiIndex = nineStars.indexOf("天芮");
  return DIRECTION_ARROWS[tianRuiIndex];
}
function calculateEightGods(isYang, tianGan, diPan) {
  let headIndex = diPan.indexOf(tianGan);
  headIndex = normalizeZhongPalace(headIndex);
  const gods = isYang ? EIGHT_GODS_YANG : EIGHT_GODS_YIN;
  const flyPath = isYang ? FLY_PATH.CLOCKWISE : FLY_PATH.COUNTER_CLOCKWISE;
  const putSequence = generatePutSequence(flyPath, headIndex);
  const result = new Array(9).fill("");
  for (let i = 0; i < putSequence.length; i++) {
    result[putSequence[i]] = gods[i];
  }
  return result;
}
function getDirectionArrow(palaceIndex) {
  return DIRECTION_ARROWS[palaceIndex] || "";
}
function getZhiShiPosition(zhiShiDoor, eightDoors) {
  const doorIndex = eightDoors.indexOf(zhiShiDoor);
  return LUOSHU_BAGUA[doorIndex];
}
var SIMPLIFIED_TO_TRADITIONAL = {
  "谷雨": "穀雨",
  "惊蛰": "驚蟄",
  "处暑": "處暑"
};
function s2t(str) {
  if (!str) return str;
  let result = str;
  for (const [simplified, traditional] of Object.entries(SIMPLIFIED_TO_TRADITIONAL)) {
    result = result.replace(new RegExp(simplified, "g"), traditional);
  }
  return result;
}
function calculateJuByChaiBu(solar, jieQiJuShu, yuanNames) {
  const lunar = solar.getLunar();
  const currentJieQi = lunar.getPrevJieQi();
  const jieQiName = s2t(currentJieQi.getName());
  const jieQiSolar = currentJieQi.getSolar();
  const currentJD = solar.getJulianDay();
  const jieQiJD = jieQiSolar.getJulianDay();
  const daysDiff = currentJD - jieQiJD;
  let yuan;
  if (daysDiff < 5) {
    yuan = 0;
  } else if (daysDiff < 10) {
    yuan = 1;
  } else {
    yuan = 2;
  }
  const config = jieQiJuShu[jieQiName];
  if (!config) {
    throw new Error(`未知的節氣：${jieQiName}`);
  }
  return {
    jieQiName,
    yuan,
    yuanName: yuanNames[yuan],
    isYang: config.yang,
    yinYang: config.yang ? "陽" : "陰",
    gameNumber: config.ju[yuan],
    daysSinceJieQi: Math.floor(daysDiff)
  };
}

// node_modules/qimen-dunjia/qimen.js
var import_lunar_javascript = __toESM(require_lunar_javascript(), 1);
function validateInput(data) {
  if (!Array.isArray(data) || data.length < 6) {
    throw new Error("輸入資料格式錯誤：必須包含 [年柱, 月柱, 日柱, 時柱, 局數, 陰陽]");
  }
  const [yearPillar, monthPillar, dayPillar, timePillar, gameNumber, yinYang] = data;
  [yearPillar, monthPillar, dayPillar, timePillar].forEach((pillar, index) => {
    if (typeof pillar !== "string" || pillar.length !== 2) {
      const pillarNames = ["年柱", "月柱", "日柱", "時柱"];
      throw new Error(`${pillarNames[index]}格式錯誤：必須為兩個字的干支（如「甲子」）`);
    }
  });
  if (!Number.isInteger(gameNumber) || gameNumber < 1 || gameNumber > 9) {
    throw new Error("局數必須為 1-9 的整數");
  }
  if (yinYang !== "陰" && yinYang !== "陽") {
    throw new Error("陰陽必須為「陰」或「陽」");
  }
}
function extractFourPillarGans(yearPillar, monthPillar, dayPillar, timePillar) {
  return {
    yearGan: extractTianGan(yearPillar),
    monthGan: extractTianGan(monthPillar),
    dayGan: extractTianGan(dayPillar),
    timeGan: extractTianGan(timePillar)
  };
}
function calculateFourPillarKongWang(yearPillar, monthPillar, dayPillar, timePillar) {
  return {
    yearKongWang: getKongWangDirection(yearPillar),
    monthKongWang: getKongWangDirection(monthPillar),
    dayKongWang: getKongWangDirection(dayPillar),
    timeKongWang: getKongWangDirection(timePillar)
  };
}
function generateQimenChart(dateTimeString, data) {
  validateInput(data);
  const [yearPillar, monthPillar, dayPillar, timePillar, gameNumber, yinYangStr] = data;
  const isYang = yinYangStr === "陽";
  const { yearGan, monthGan, dayGan, timeGan } = extractFourPillarGans(yearPillar, monthPillar, dayPillar, timePillar);
  const xunHead = getXunHead(timePillar);
  const fuShou = getFuShou(xunHead);
  const effectiveTimeGan = resolveJiaHiding(timeGan, fuShou);
  const heTu = getHeTu();
  const luoShu = getLuoShu();
  const flyingStars = calculateFlyingStars(gameNumber);
  const diPan = getDiPan(isYang, gameNumber);
  const tianPan = calculateTianPan(isYang, effectiveTimeGan, fuShou, diPan);
  const originalDoors = getOriginalDoors();
  const zhiShiDoor = getZhiShiDoor(fuShou, diPan);
  const flyStep = calculateFlyStep(xunHead, timePillar);
  const eightDoors = calculateEightDoors(isYang, zhiShiDoor, flyStep, fuShou, diPan);
  const zhiShiPosition = getZhiShiPosition(zhiShiDoor, eightDoors);
  const originalStars = getOriginalStars();
  const zhiFuStar = getZhiFuStar(fuShou, diPan);
  const zhiFuPosition = getZhiFuPosition(effectiveTimeGan, diPan);
  const nineStars = calculateNineStars(zhiFuStar, effectiveTimeGan, diPan);
  const tianQinDirection = getTianQinDirection(nineStars);
  const eightGods = calculateEightGods(isYang, effectiveTimeGan, diPan);
  const { yearKongWang, monthKongWang, dayKongWang, timeKongWang } = calculateFourPillarKongWang(yearPillar, monthPillar, dayPillar, timePillar);
  const resultMap = /* @__PURE__ */ new Map();
  resultMap.set("年柱", yearPillar);
  resultMap.set("年孤虛", yearKongWang);
  resultMap.set("月柱", monthPillar);
  resultMap.set("月孤虛", monthKongWang);
  resultMap.set("日柱", dayPillar);
  resultMap.set("日孤虛", dayKongWang);
  resultMap.set("時柱", timePillar);
  resultMap.set("時孤虛", timeKongWang);
  resultMap.set("時干", timeGan);
  resultMap.set("陰陽", yinYangStr);
  resultMap.set("局數", gameNumber);
  resultMap.set("旬首", xunHead);
  resultMap.set("符首", fuShou);
  resultMap.set("值使", zhiShiDoor);
  resultMap.set("值符", zhiFuStar);
  resultMap.set("值符落宮", zhiFuPosition);
  resultMap.set("值使落宮", zhiShiPosition);
  resultMap.set("飛步", flyStep);
  resultMap.set("河圖", heTu);
  resultMap.set("方位", luoShu);
  resultMap.set("九宮", flyingStars);
  resultMap.set("地盤", diPan);
  resultMap.set("地門", originalDoors);
  resultMap.set("天盤", tianPan);
  resultMap.set("天門", eightDoors);
  resultMap.set("原星", originalStars);
  resultMap.set("九星", nineStars);
  resultMap.set("天禽寄宮", tianQinDirection);
  resultMap.set("八神", eightGods);
  return resultMap;
}
function chartToObject(resultMap) {
  const result = {};
  for (const [key, value] of resultMap) {
    result[key] = value;
  }
  return result;
}
function chartToJSON(resultMap, indent = 2) {
  return JSON.stringify(chartToObject(resultMap), null, indent);
}
function parseDatetime(datetime) {
  if (typeof datetime !== "string" || datetime.length !== 10) {
    throw new Error("日期時間格式錯誤：必須為 yyyyMMddHH 格式（10 位數字）");
  }
  const year = parseInt(datetime.substring(0, 4), 10);
  const month = parseInt(datetime.substring(4, 6), 10);
  const day = parseInt(datetime.substring(6, 8), 10);
  const hour = parseInt(datetime.substring(8, 10), 10);
  if (isNaN(year) || year < 1 || year > 9999) {
    throw new Error("年份無效：必須為 1-9999");
  }
  if (isNaN(month) || month < 1 || month > 12) {
    throw new Error("月份無效：必須為 1-12");
  }
  if (isNaN(day) || day < 1 || day > 31) {
    throw new Error("日期無效：必須為 1-31");
  }
  if (isNaN(hour) || hour < 0 || hour > 23) {
    throw new Error("小時無效：必須為 0-23");
  }
  return { year, month, day, hour };
}
function generateChartFromSolar(solar, label) {
  const lunar = solar.getLunar();
  const yearPillar = lunar.getYearInGanZhiExact();
  const monthPillar = lunar.getMonthInGanZhiExact();
  const dayPillar = lunar.getDayInGanZhiExact();
  const timePillar = lunar.getTimeInGanZhi();
  const juResult = calculateJuByChaiBu(solar, JIEQI_JUSHU, YUAN_NAMES);
  const data = [
    yearPillar,
    monthPillar,
    dayPillar,
    timePillar,
    juResult.gameNumber,
    juResult.yinYang
  ];
  const chart = generateQimenChart(label, data);
  return {
    chart,
    juResult,
    solar,
    lunar
  };
}
function generateChartByDatetime(datetime) {
  const { year, month, day, hour } = parseDatetime(datetime);
  const solar = import_lunar_javascript.Solar.fromYmdHms(year, month, day, hour, 0, 0);
  const { chart, juResult } = generateChartFromSolar(solar, datetime);
  chart.set("節氣", juResult.jieQiName);
  chart.set("三元", juResult.yuanName);
  chart.set("節後天數", juResult.daysSinceJieQi);
  return chart;
}
function generateChartNow() {
  const now = /* @__PURE__ */ new Date();
  const datetime = now.getFullYear().toString() + (now.getMonth() + 1).toString().padStart(2, "0") + now.getDate().toString().padStart(2, "0") + now.getHours().toString().padStart(2, "0");
  return generateChartByDatetime(datetime);
}
export {
  DIPAN_YANG,
  DIPAN_YIN,
  DIRECTION_ARROWS,
  EIGHT_DOORS_ORIGINAL,
  EIGHT_DOORS_SEQUENCE,
  EIGHT_GODS_YANG,
  EIGHT_GODS_YIN,
  FLYING_STARS,
  FLYING_STAR_CHARTS,
  FLY_PATH,
  HETU_BAGUA,
  JIEQI_JUSHU,
  LUOSHU_BAGUA,
  PALACE,
  QIMEN_STARS,
  SIX_XUNS,
  TIANQIN_INDEX,
  XUN_HEADS,
  XUN_TO_HEAD,
  XUN_TO_KONGWANG_DIRECTION,
  YUAN_NAMES,
  ZHONG_SUBSTITUTE,
  calculateEightDoors,
  calculateEightGods,
  calculateFlyStep,
  calculateFlyingStars,
  calculateJuByChaiBu,
  calculateNineStars,
  calculateTianPan,
  chartToJSON,
  chartToObject,
  generateQimenChart as default,
  extractDiZhi,
  extractTianGan,
  findIndexWithZhongNormalization,
  generateChartByDatetime,
  generateChartNow,
  generatePutSequence,
  generateQimenChart,
  getDiPan,
  getDirectionArrow,
  getFuShou,
  getHeTu,
  getKongWangDirection,
  getLuoShu,
  getOriginalDoors,
  getOriginalStars,
  getTianQinDirection,
  getXunHead,
  getZhiFuPosition,
  getZhiFuStar,
  getZhiShiDoor,
  getZhiShiPosition,
  normalizeZhongPalace,
  resolveJiaHiding,
  rotateArrayFromIndex,
  rotateMapping
};
//# sourceMappingURL=qimen-dunjia.js.map
