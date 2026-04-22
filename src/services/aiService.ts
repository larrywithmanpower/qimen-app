import { getElementMeta, scoreToVerdict } from "../utils/analysis";
import { BASE_PROMPT } from "./prompts/v1/base";
import { getContextByKey } from "./prompts/v1/registry";

// 透過 Cloud Functions proxy 呼叫 Gemini，金鑰只存在後端 Secret Manager
const PROXY_URL = import.meta.env.VITE_GEMINI_PROXY_URL;

if (!PROXY_URL) {
  console.error("找不到 VITE_GEMINI_PROXY_URL！請檢查 .env 檔案與 VITE_ 前綴是否正確。");
}

export interface PalaceData {
  star: string;
  door: string;
  god: string;
  heavenStem: string;
  earthStem: string;
  name: string;
  date?: string;
  [key: string]: unknown;
}

export interface FetchMasterAnalysisParams {
  question: string;
  palaceData: PalaceData;
  score?: number;
  contextKey?: string;    // 預設 'general'，保持向後相容
  promptVersion?: string; // 預設 'v1'
  signal?: AbortSignal;
}

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

/**
 * 統一的 proxy 呼叫點：前端只丟 model + prompt，由 Cloud Function 代呼 Gemini
 */
async function callGeminiProxy(
  model: string,
  prompt: string,
  signal?: AbortSignal,
  extraPayload?: Record<string, unknown>
): Promise<string> {
  if (!PROXY_URL) {
    throw new Error("請先設定 VITE_GEMINI_PROXY_URL 環境變數");
  }

  const response = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, ...extraPayload }),
    signal,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(payload?.error || `Proxy error: ${response.status}`);
  }

  const data = await response.json();
  if (!data?.text) throw new Error("大師沈默了（無回應內容）");
  return data.text;
}

function buildSinglePalacePrompt(
  question: string,
  palaceData: PalaceData,
  contextInjection = ''
): string {
  const { star, door, god, heavenStem, earthStem, name } = palaceData;

  const godFormatted  = formatElement('god',  god);
  const starFormatted = formatElement('star', star);
  const doorFormatted = formatElement('door', door);
  const stemFormatted = formatElement('stem', heavenStem);

  const rawScore =
    getElementMeta('god', god).score +
    getElementMeta('star', star).score +
    getElementMeta('door', door).score +
    getElementMeta('stem', heavenStem).score;

  const resultScore = scoreToVerdict(rawScore);
  const sign = rawScore >= 0 ? '+' : '';
  const contextSection = contextInjection
    ? `\n### 情境補充\n${contextInjection}\n`
    : '';

  return `
${BASE_PROMPT}
${contextSection}
### 輸出格式補充
- **宮位總分**：${sign}${rawScore} / ±12 → **${resultScore}**

### 待解析數據
- 問題：${question}
- 用事宮：${name}
- 八神：${godFormatted}
- 九星：${starFormatted}
- 八門：${doorFormatted}
- 天干：${stemFormatted}（地盤：${earthStem}）
- 宮位原始分：${sign}${rawScore} 分 → 判定：**${resultScore}**
`;
}

export const fetchMasterAnalysis = async (
  params: FetchMasterAnalysisParams
): Promise<string> => {
  const { question, palaceData, contextKey = 'general', promptVersion = 'v1', signal } = params;
  const contextInjection = getContextByKey(contextKey);
  const systemPrompt = buildSinglePalacePrompt(question, palaceData, contextInjection);

  try {
    console.log("正在生成結構化鑑定報告...");
    return await callGeminiProxy(
      "gemini-2.5-flash",
      systemPrompt,
      signal,
      contextKey !== 'general' ? { context: contextKey, promptVersion } : undefined,
    );
  } catch (error: any) {
    if (error?.name === 'AbortError') throw new Error("鑑定超時，請重試");
    throw error;
  }
};

// 情境化分析：contextKey 為必填，proxy payload 一律帶 context/promptVersion
export const fetchContextualAnalysis = async (
  params: Omit<FetchMasterAnalysisParams, 'contextKey'> & { contextKey: string }
): Promise<string> => {
  const { question, palaceData, contextKey, promptVersion = 'v1', signal } = params;
  const contextInjection = getContextByKey(contextKey);
  const systemPrompt = buildSinglePalacePrompt(question, palaceData, contextInjection);

  try {
    return await callGeminiProxy(
      "gemini-2.5-flash",
      systemPrompt,
      signal,
      { context: contextKey, promptVersion },
    );
  } catch (error: any) {
    if (error?.name === 'AbortError') throw new Error("鑑定超時，請重試");
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
    return await callGeminiProxy("gemini-2.5-flash", systemPrompt, signal);
  } catch (error: any) {
    console.error(error);
    if (error?.name === 'AbortError') throw new Error("鑑定超時，請重試");
    throw new Error("大師對比時分心了，請重新發起請求 (Comparison Error)");
  }
};
