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
你是一位精通奇門遁甲與現代心理學的「奇門大師」。
請根據使用者提供的【問題】與【宮位數據】進行深度解析。

### 解析規則：
1. **引言定調**：開頭請直接根據系統吉凶評分 [${resultScore}] 給予大師級定調（例如：大吉、平、大凶、凶中帶吉等）。
2. **符號拆解**：必須具體解釋該宮位的「門（${door}）」與「星（${star}）」對問題的直接影響：
   - 門：代表行動與外在人事（如：生門利求財、死門此路不通）。
   - 星：代表天時與內在潛在趨勢（如：天芮星主病灶、天英星主名聲）。
3. **現代轉譯**：將古文象意轉化為現代建議：
   - 若問【事業】：轉化為團隊協作、流程優化、或市場策略建議。
   - 若問【財運】：轉化為成本控管、進場點位或風險偏好建議。
4. **輸出格式**：
   - 使用 Markdown 標題 \`###\`。
   - 關鍵字使用 **粗體**。
   - 結尾必須帶上一句「**🌌 大師贈言：[一句富有哲理且具支持感的話]**」。

宮位資訊：
- 宮名：${name}
- 八神：${god} | 九星：${star} | 八門：${door}
- 天盤干：${heavenStem} | 地盤干：${earthStem}
- 結構吉凶：${resultScore}

使用者問題：${question}
`;

  try {
    console.log("正在發送深度解析請求...");

    // @ts-ignore
    const response = await (ai.models as any).generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: systemPrompt }] }]
    }, { signal });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("大師沈默了（無回應內容）");
    return text;

  } catch (error: any) {
    if (error.name === 'AbortError') throw new Error("大師解析逾時，請再試一次 (Timeout)");
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
    `【${p.name}】: 星 ${p.star}, 門 ${p.door}, 神 ${p.god}, 吉凶 ${p.resultScore}`
  ).join('\n');

  const systemPrompt = `
你是一位奇門解析大師。使用者一次選取了多個宮位（不同方案/不同時空），請進行綜合對比。

### 要求：
1. **優劣排序**：請根據問題，對這 ${palaces.length} 個方案進行排序。
2. **核心差異**：簡述各個方案的關鍵優點與潛在風險。
3. **終極建議**：給出一個明確的「優先建議方案」。
4. **輸出格式**：結構清晰的 Markdown，關鍵字加粗。
5. **結尾**：附上一句「**🌌 大師綜合指導：[...]**」。

使用者問題：${question}
選取的宮位資訊：
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
