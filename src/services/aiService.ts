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

  // Extract symbols from palaceData
  const { star, door, god, heavenStem, earthStem, name } = palaceData;

  const systemPrompt = `
你是一位精通奇門遁甲與現代心理學的解析大師。
你會根據使用者提供的【問題】與【宮位數據】進行解析。

解析邏輯：
1. 根據問題（${question}）對焦關鍵符號。
2. 結合宮位中的神（${god}）、星（${star}）、門（${door}）、干（天盤${heavenStem}/地盤${earthStem}）進行象意聯想。
3. 參考系統計算的吉凶判定 [${resultScore}] 給予最終定調。
4. 給予 2-3 個現代化的行動建議。
5. 語氣要專業、睿智且具有支持感。
6. 請使用 Markdown 格式輸出，重點文字可加粗。

宮位資訊：
- 宮名：${name}
- 八神：${god}
- 九星：${star}
- 八門：${door}
- 天盤干：${heavenStem}
- 地盤干：${earthStem}
- 結構吉凶：${resultScore}

使用者問題：${question}

請開始解析：
`;

  try {
    console.log("正在嘗試發送請求 (New SDK)...");

    // 使用最新模型 gemini-2.5-flash
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: systemPrompt }]
        }
      ]
    }, { signal });

    const candidate = response.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("大師沈默了（無回應內容）");
    }

    return text;

  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn("API 請求已逾時或被取消");
      throw new Error("大師解析時間過長，請確認網路狀況後重試 (Timeout)");
    }
    console.error("API 請求發生錯誤 (New SDK):", error);
    throw error;
  }
};
