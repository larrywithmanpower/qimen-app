import { useState, useEffect } from 'react';

export interface PalaceData {
  name: string;
  heavenStem: string;
  earthStem: string;
  door: string;
  star: string;
  god: string;
}

export interface QiMenResult {
  solarTerm: string;
  isYang: boolean;
  juNumber: number;
  xunShou: string;
  zhiFu: string;
  zhiShi: string;
  palaces: Record<number, PalaceData>;
}

// 根據 qimen-dunjia constants.js 定義的 PALACE 索引映射到 洛書九宮數
const PALACE_MAPPING = [4, 9, 2, 3, 5, 7, 8, 1, 6];

export const useQiMen = (date: Date): QiMenResult | null => {
  const [result, setResult] = useState<QiMenResult | null>(null);

  useEffect(() => {
    // 動態載入重型模組，不加入 critical path
    Promise.all([
      import('lunar-javascript'),
      // @ts-ignore: no type declarations
      import('qimen-dunjia'),
    ]).then(([lunarModule, qimenModule]) => {
      try {
        const { Solar } = lunarModule;
        const {
          generateQimenChart,
          chartToObject,
          calculateJuByChaiBu,
          JIEQI_JUSHU,
          YUAN_NAMES,
        } = qimenModule;

        // 1. 使用 Solar 轉換時間
        const solar = Solar.fromDate(date);
        const lunar = solar.getLunar();

        // 2. 獲取四柱 (干支)
        const yearPillar = lunar.getYearInGanZhiExact();
        const monthPillar = lunar.getMonthInGanZhiExact();
        const dayPillar = lunar.getDayInGanZhiExact();
        const timePillar = lunar.getTimeInGanZhi();

        // 3. 計算局數與陰陽 (拆補法)
        const juResult = calculateJuByChaiBu(solar, JIEQI_JUSHU, YUAN_NAMES);

        console.log('--- QiMen Debug ---');
        console.log('Solar:', solar.toYmdHms());
        console.log('Pillars:', { yearPillar, monthPillar, dayPillar, timePillar });
        console.log('Ju:', juResult);

        // 4. 準備參數並生成盤局
        const inputData = [
          yearPillar,
          monthPillar,
          dayPillar,
          timePillar,
          juResult.gameNumber,
          juResult.yinYang
        ];

        const chartId = solar.toYmdHms();
        const chartMap = generateQimenChart(chartId, inputData);
        const chart = chartToObject(chartMap);

        chart['節氣'] = juResult.jieQiName;
        chart['陰陽'] = juResult.yinYang;
        chart['局數'] = juResult.gameNumber.toString();

        const heavenStems = chart['天盤'];
        const earthStems = chart['地盤'];
        const doors = chart['天門'];
        const stars = chart['九星'];
        const gods = chart['八神'];

        const palaces: Record<number, PalaceData> = {};
        const palaceNames: Record<number, string> = {
          1: "坎一", 2: "坤二", 3: "震三", 4: "巽四", 5: "中五", 6: "乾六", 7: "兌七", 8: "艮八", 9: "離九"
        };

        PALACE_MAPPING.forEach((palaceNum, idx) => {
          palaces[palaceNum] = {
            name: palaceNames[palaceNum],
            heavenStem: heavenStems[idx] || '',
            earthStem: earthStems[idx] || '',
            door: doors[idx] || '',
            star: stars[idx] || '',
            god: gods[idx] || '',
          };
        });

        setResult({
          solarTerm: chart['節氣'],
          isYang: chart['陰陽'] === '陽',
          juNumber: parseInt(chart['局數'] || '0'),
          xunShou: chart['旬首'],
          zhiFu: chart['值符'],
          zhiShi: chart['值使'],
          palaces,
        });
      } catch (error) {
        console.error('QiMen calculation error:', error);
        setResult(null);
      }
    });
  }, [date.getTime()]);

  return result;
};
