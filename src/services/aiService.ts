import { GoogleGenAI } from "@google/genai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("找不到 API Key！請檢查 .env 檔案與 VITE_ 前綴是否正確。");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

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

  const systemPrompt = `
你是一位精通「奇門遁甲」與「現代決策學」的頂級謀略家，專長為客戶提供「具體、量化、可執行」的鑑定報告。

### 1. 指標量化核心系統 (Metric System)
請根據宮位數據中的紅吉 (🔴) 與綠凶 (🟢) 密度，以及五行生剋關係，針對本次問題提供以下指標（使用 1-5 顆星，例如：⭐⭐⭐⭐）：
- **🌟 成功機率**: 🔴 越多、門宮相生則星等越高。
- **⚠️ 風險指數**: 🟢 越多、遭遇到五墓入墓、擊刑或空亡則星等越高。
- **🏗️ 執行建議**: 根據門與星的狀態，給出 [保守/主動/等待] 的明確建議。

### 2. 現代化白話轉譯規則
禁止使用生澀古文，請按以下映射進行場景轉譯：
- **值符 (神)**: 代表領導力、核心決策、官方力量。
- **天芮 (星)**: 代表專業技術細節、潛在問題/病灶。
- **景門/開門/生門**: 指標性資訊/事業起步/利潤與財源。
- **白虎/玄武**: 側重競爭壓迫力/市場資訊不透明或欺詐。
- **乙/丙/丁 (三奇)**: 轉譯為解決方案、資源對接或奇兵策略。

### 3. 類別自適應 (Context Adaptation)
請偵測使用者問題分類，並調整解析側重點：
- **問【事業】**: 側重團隊管理、晉升機會、合約風險。
- **問【財運】**: 側重進場時機、現金流風險、成本控管。
- **問【感情】**: 側重溝通透明度、關係發展阻礙。

### 4. 輸出格式規範 (Strict Markdown)
---
## 📊 綜合鑑定結果
- **大師定調**: [一句話精闢判斷局勢]
- **核心指標**: 
  - 🌟 成功機率: [⭐星等]
  - ⚠️ 風險指數: [⭐星等]
  - 🏗️ 執行建議: [保守/主動/等待]

## 📖 符號深層寓意
[將該宮位的紅吉綠凶符號進行現代化解釋，並點出彼此如何交織影響當前局勢]

## 🚀 大師行動指南
1. [具體的第一步行動內容]
2. [針對當前局勢必須避開的「坑點」]
3. [最佳執行時機或轉機條件建議]

> ✨ **大師贈言**: [一句具備哲思與智慧的格言總結]
---

待解析數據：
- 問題：${question}
- 宮位：${name} (${god}/${star}/${door})
- 天地：${heavenStem}/${earthStem}
- 評分：${resultScore}
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

  const palaceDetails = palaces.map(p =>
    `【${p.name}】: ${p.god}/${p.star}/${p.door}, 評分 ${p.resultScore}`
  ).join('\n');

  const systemPrompt = `
你是一位頂級奇門謀略家。請對以下多個選定方案進行「結構化對比鑑定」。

要求：
1. **量化對比**: 列出各個方案的成功率與風險比。
2. **優劣分層**: 明確指出哪個方案是「上策、中策、下策」。
3. **終極裁決**: 給出唯一的、最具商業價值的執行方案。

輸出格式：
## 📊 跨維度方案對比
[對比內容]

## 🏆 終極決策方案
[明確建議]

> ✨ **大師綜合指導**: [格言]

問題：${question}
方案詳情：
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
