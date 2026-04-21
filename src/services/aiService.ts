import { GoogleGenAI } from "@google/genai";
import { getElementMeta } from "../utils/analysis";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("找不到 API Key！請檢查 .env 檔案與 VITE_ 前綴是否正確。");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

/**
 * 將宮位四元素格式化為含「七層分級」的描述字串
 * e.g. 開門(門·大吉 +3)
 */
type ElementKind = 'god' | 'star' | 'door' | 'stem';
const TYPE_LABEL: Record<ElementKind, string> = { god: '神', star: '星', door: '門', stem: '干' };

const formatElement = (type: ElementKind, value: string): string => {
  const meta = getElementMeta(type, value);
  const sign = meta.score > 0 ? '+' : '';
  return `${value}（${TYPE_LABEL[type]}·${meta.tierLabel} ${sign}${meta.score}）`;
};

export const fetchMasterAnalysis = async (
  question: string,
  palaceData: any,
  resultScore: string,
  signal?: AbortSignal
): Promise<string> => {
  if (!API_KEY) {
    throw new Error("請先設定 VITE_GEMINI_API_KEY 環境變數");
  }

  const { star, door, god, heavenStem, earthStem, name } = palaceData;

  // 依七層分級格式化
  const godFormatted  = formatElement('god',  god);
  const starFormatted = formatElement('star', star);
  const doorFormatted = formatElement('door', door);
  const stemFormatted = formatElement('stem', heavenStem);

  // 計算宮位原始分數（與 analyzePalace 一致）
  const rawScore =
    getElementMeta('god', god).score +
    getElementMeta('star', star).score +
    getElementMeta('door', door).score +
    getElementMeta('stem', heavenStem).score;

  const systemPrompt = `
你是一位精通「九宮奇門」與「現代決策學」的頂級謀略家，專為客戶產出「具體、量化、可執行」的鑑定報告。

### 0. 核心原則（九宮奇門心法）
- 大道至簡：**紅字＝吉、綠字＝凶**，不用背艱澀名詞，看顏色與分級就能斷吉凶。
- 四維度同時成立：**天時（九星）、地利（九宮）、人和（八門）、神助（八神）**。
- **用事宮權重最重**（2× 旁宮），若本次為用事宮，解析深度需更強。

### 1. 七層分級評分系統（必須嚴格使用）
每個元素依「神/星/門/干」四類，共分為七層：
- 🔴🔴🔴 大吉（+3）、🔴🔴 吉（+2）、🔴 小吉（+1）、⚪ 中性（0）、🟢 小凶（-1）、🟢🟢 凶（-2）、🟢🟢🟢 大凶（-3）
- 單宮滿分 ±12，判定區間：
  - ≥9 **大吉** / 7-8 **吉** / 3-6 **平** / 0-2 **小凶** / -5~-1 **凶** / ≤-6 **大凶**

### 2. 量化輸出（使用 1-5 星表現強度）
- **🌟 成功機率**：紅吉密度 + 分級強度越高越亮
- **⚠️ 風險指數**：綠凶密度 + 分級強度越高越亮
- **🏗️ 執行建議**：[主動出擊 / 謹慎行事 / 保守應對 / 暫緩等待]
  - 吉多凶少 → 主動出擊
  - 吉凶各半 → 謹慎行事
  - 偏凶 → 保守應對
  - 凶多吉少 → 暫緩等待

### 3. 現代化白話轉譯（禁用古文）
- **值符 / 六合**：領導力、官方貴人、合作媒合
- **白虎 / 玄武**：競爭壓迫、市場欺詐、資訊不透明
- **螣蛇**：波折反覆、變來變去、虛驚
- **開門 / 生門**：開創機會、財源生機
- **休門**：休養聚合、感情和諧
- **死門 / 驚門 / 傷門**：終結停滯、官非意外、破財糾紛
- **景門**：表面光鮮但虛浮（中性偏凶）
- **乙 / 丙 / 丁（三奇）**：柔性資源 / 強力貴人 / 情報智慧
- **庚 / 癸**：阻力競爭 / 陰暗欺騙
- **天心 / 天輔**：決策貴人 / 文教輔助
- **天蓬 / 天芮**：混亂爭訟 / 疾病底層困境

### 4. 類別自適應
- 【事業】：團隊管理、晉升機會、合約風險
- 【財運】：進場時機、現金流風險、成本控管
- 【感情】：溝通透明度、關係發展阻礙
- 【健康】：體能警示、療癒方向
- 【學業 / 考試】：專注資源、助力貴人

### 5. 輸出格式（嚴格 Markdown）
---
## 📊 綜合鑑定結果
- **大師定調**：[一句話精闢判斷局勢]
- **宮位總分**：${rawScore >= 0 ? '+' : ''}${rawScore} / ±12 → **${resultScore}**
- **核心指標**：
  - 🌟 成功機率：[⭐星等]
  - ⚠️ 風險指數：[⭐星等]
  - 🏗️ 執行建議：[主動出擊/謹慎行事/保守應對/暫緩等待]

## 📖 符號深層寓意
[依本次四元素的分級與組合，點出彼此如何交織影響當前局勢。務必引用每個元素的分級（大吉/小吉/中性/小凶/凶/大凶）作為論述根據]

## 🚀 大師行動指南
1. [具體的第一步行動]
2. [必須避開的坑點]
3. [最佳執行時機或轉機條件]

> ✨ **大師贈言**：[一句具備哲思與智慧的格言總結]
---

### 待解析數據
- 問題：${question}
- 用事宮：${name}
- 八神：${godFormatted}
- 九星：${starFormatted}
- 八門：${doorFormatted}
- 天干：${stemFormatted}（地盤：${earthStem}）
- 宮位原始分：${rawScore >= 0 ? '+' : ''}${rawScore} 分 → 判定：**${resultScore}**
`;

  try {
    console.log("正在生成結構化鑑定報告...");

    // @ts-ignore
    const response = await (ai.models as any).generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: systemPrompt }] }]
    }, { signal });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("大師沈默了（無回應內容）");
    return text;

  } catch (error: any) {
    if (error.name === 'AbortError') throw new Error("鑑定超時，請重試");
    throw error;
  }
};

/**
 * 進行多宮位方案比對與排序
 */
export const fetchMultiPalaceAnalysis = async (
  question: string,
  palaces: any[],
  signal?: AbortSignal
): Promise<string> => {
  if (!API_KEY) throw new Error("API Key 未設定");

  const palaceDetails = palaces.map(p => {
    const gFmt = formatElement('god',  p.god);
    const sFmt = formatElement('star', p.star);
    const dFmt = formatElement('door', p.door);
    const tFmt = formatElement('stem', p.heavenStem);
    const rawScore = (p.score ?? 0);
    const weighted = (p.weightedScore ?? rawScore);
    const mainTag = p.isMainPalace ? '【★用事宮 2×】' : '';
    const signRaw = rawScore >= 0 ? '+' : '';
    const signWeighted = weighted >= 0 ? '+' : '';
    return [
      `【${p.name}】${mainTag}`,
      `  - 神：${gFmt}`,
      `  - 星：${sFmt}`,
      `  - 門：${dFmt}`,
      `  - 干：${tFmt}`,
      `  - 原始分：${signRaw}${rawScore} / 加權分：${signWeighted}${weighted} → ${p.resultScore}`,
    ].join('\n');
  }).join('\n\n');

  const systemPrompt = `
你是一位精通「九宮奇門」的頂級謀略家，擅長對多方案進行「結構化對比鑑定」。

### 核心規則
- 使用「七層分級制」（大吉+3 / 吉+2 / 小吉+1 / 中性0 / 小凶-1 / 凶-2 / 大凶-3）進行量化對比。
- **用事宮權重為 2 倍**，若一方案為用事宮，其分數與論述比重需加倍。
- 禁用古文，一律用現代商業語言轉譯。

### 輸出要求
1. **量化對比**：列出各方案的「成功機率 / 風險指數」星等。
2. **優劣分層**：明確標示 🏆 上策 / 🥈 中策 / 🥉 下策。
3. **終極裁決**：給出唯一推薦方案與具體執行步驟。

### 輸出格式
## 📊 跨維度方案對比
[逐一對比每個宮位的四元素分級與總分，引用加權分差異作為判斷根據]

## 🏆 終極決策方案
[上策是哪個宮位？為什麼？如何執行？]

> ✨ **大師綜合指導**：[一句格言總結]

### 待解析
- 問題：${question}
- 方案詳情：
${palaceDetails}
`;

  try {
    // @ts-ignore
    const response = await (ai.models as any).generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: systemPrompt }] }]
    }, { signal });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || "大師對比失敗";
  } catch (error: any) {
    console.error(error);
    throw new Error("大師對比時分心了，請重新發起請求 (Comparison Error)");
  }
};
