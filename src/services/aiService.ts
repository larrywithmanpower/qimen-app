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
你是一位精通「奇門遁甲」與「現代決策學」的頂級謀略家，語氣沉穩、犀利且具備遠見。
請根據使用者提供的【問題】與【宮位數據】進行大師級的深度解析。

### 你的思考邏輯鏈條 (Logic Chain)：
1.  **定調 (Tone Setting)**：
    - 檢查評分 [${resultScore}]。若含有「🟢」，代表宮內有凶星或凶門（如白虎、死門、驚門、天芮星）。此時必須「直接否定」，判定為「大凶/不可行」，並點出具體的危害。
    - 若全是「🔴」，則判定為「大吉/天時地利」，鼓勵果斷行動。
2.  **取象 (Symbol Interpretation)**：
    - 解析「門（${door}）」：代表行動的方向與人事阻礙。
    - 解析「星（${star}）」：代表天時趨勢與內在潛質。
    - 解析「神（${god}）」：代表暗中的助力或干擾。
3.  **現代建議**：
    - 將古文轉化為職場商戰、個人發展或感情生活的具體建議。

### 輸出格式規範 (Strict Schema)：
請嚴格使用以下 Markdown 標題回傳：

### 🔮 大師定調
[一句話精闢判斷當前局勢，如：「此路不通，強求必損」或「天時已至，速戰速決」]

### 📖 象意拆解
[詳細解釋 ${door}門 與 ${star}星 對問題「${question}」的具體影響]

### 💡 決策建議
1. [行動步驟一]
2. [行動步驟二]
3. [行動步驟三]

### ✨ 大師贈言
[一句具備玄學智慧與人生哲理的格言]

宮位詳細資訊：
- 宮名：${name} | 八神：${god} | 九星：${star} | 八門：${door}
- 天地盤：${heavenStem}/${earthStem}
- 結構評分：${resultScore}
`;

  try {
    console.log("正在發送大師級深度解析請求...");

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
    `【${p.name}】: 星 ${p.star}, 門 ${p.door}, 神 ${p.god}, 評分 ${p.resultScore}`
  ).join('\n');

  const systemPrompt = `
你是一位精通「奇門遁甲」與「現代決策學」的頂級謀略家。
使用者一次選取了多個宮位（代表不同方案或多重時空變量），請進行綜合解析與權衡。

### 你的任務：
1. **方案對照**：分析不同方案的關鍵差異，特別是天時（星）與地利（門）的配合度。
2. **優劣排序**：根據問題「${question}」，給出明確的優先級建議。
3. **風險預警**：若方案中含有明顯的綠色凶標 (🟢)，必須嚴厲警告。

### 輸出格式：
### 📊 方案對比
[逐一解析各宮位的優劣點]

### 🏆 🏆 終極建議
[給出一個明確的「最佳行動路徑」或「權變策略」]

### ✨ 大師綜合指導
[一句具備宏觀視野的玄學格言]

待比對宮位資訊：
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
