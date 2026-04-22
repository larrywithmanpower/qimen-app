# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案概述

「奇門 AI 大師」是以奇門遁甲邏輯 + Google Gemini AI 打造的決策輔助 PWA。React 19 + Vite + TypeScript + Tailwind，部署於 GitHub Pages（base path `/qimen-app/`）。

## 常用指令

```bash
npm run dev       # 啟動 Vite dev server（PWA devOptions 已啟用）
npm run build     # tsc -b && vite build（TypeScript project refs 先跑型別檢查，失敗會中斷 build）
npm run lint      # ESLint（flat config，含 react-hooks / react-refresh）
npm run preview   # 預覽 production build
```

執行前需於根目錄建立 `.env`：
```
VITE_GEMINI_PROXY_URL=http://localhost:8080
GEMINI_API_KEY=your_api_key_here
```

Gemini 金鑰不再直接進前端 bundle，統一走 `functions/gemini-proxy/` Cloud Function 代呼。本機開發時另開終端跑：

```bash
cd functions/gemini-proxy && npm install && npm start   # localhost:8080
```

Production 的 proxy URL 由 GitHub Actions secret `VITE_GEMINI_PROXY_URL` 注入；後端金鑰放 GCP Secret Manager，不寫死在 .env。

## 架構重點

### 資料流（起盤 → 解析）

1. **`src/hooks/useQiMen.ts`** — 單一資料來源。接收 `Date`，呼叫 `qimen-dunjia` + `lunar-javascript` 計算當下盤面，輸出 `QiMenResult`（含九宮 `palaces: Record<1-9, PalaceData>`、節氣、陰陽、局數、值符、值使）。
2. **`src/utils/analysis.ts`** — 純函式打分。綠色觸發 `大凶` 立即短路；否則用紅色清單加總（門 +40、神 +20、星 +20、干 +10），≥60 為 `吉`。吉凶名單即 `RED_AUSPICIOUS` / `GREEN_OMINOUS`，修改判斷規則從這裡動。
3. **`src/components/QimenChart.tsx`** — 3×3 視覺盤。`PALACE_MAPPING = [4,9,2,3,5,7,8,1,6]` 是 library index → 洛書宮位數的對照，UI 布局寫死成這個順序。盲選前整盤套毛玻璃遮罩，報數後才 reveal。
4. **`src/components/AnalysisCard.tsx`** — 單宮解析卡。呼叫 `aiService.fetchMasterAnalysis`；多宮時 `App.tsx` 另呼叫 `fetchMultiPalaceAnalysis` 做綜合比對。
5. **`src/services/aiService.ts`** — Gemini 呼叫點。System prompt 內嵌「謀略家人格」與量化報告格式（🌟 成功機率、⚠️ 風險指數、🏗️ 執行建議），修改 AI 輸出結構從這裡。

### 中宮特殊規則

宮位 5（中宮）在奇門遁甲寄於坤二宮。`analyzePalace` 本身保持純粹，**呼叫端負責在 palaceNum === 5 時傳入宮位 2 的 `PalaceData`**，並顯示名稱如「中五 (寄坤二)」。新增中宮相關功能時注意這個約定。

### 主題系統

三主題（`dark` / `light` / `emerald`）以 CSS 變數切換，定義於 `src/index.css` `:root` 與 `.theme-*` class。Tailwind 透過 `tailwind.config.js` 映射為 `theme-bg` / `theme-primary` / `theme-border` / `theme-card` / `theme-accent`。**新增顏色請用這些 token，不要硬寫色碼**，否則主題切換會失效。`ThemeContext` 以 `localStorage` 持久化。

### 狀態流（App.tsx 是唯一 orchestrator）

所有頁面狀態集中在 `App.tsx`：`isCharting` / `isPreCharting` / `isPickingNumber` / `isRevealed` / `mainSelectedNum` / `selectedPalaces` / `restoredEntry`。流程為：
`QuestionInput` → `NumberPicker`（1-9 盲選）→ `RitualLoading`（1200ms 儀式動畫）→ `QimenChart` reveal → 點宮位疊加 `AnalysisCard` → 多宮時顯示比對按鈕。

歷史紀錄由 `HistoryContext` + `HistoryDrawer` 管理，以 `localStorage` 持久化，還原時透過 `restoredEntry` 注入既有 AI 結果避免重打 API。

### 觸覺回饋

`src/utils/haptics.ts` 封裝 Web Vibration API，區分 `triggerSuccessHaptic` / `triggerLightHaptic` / `triggerWarningHaptic`。報數、封盤揭示、AI 回應完成等關鍵節點都應觸發，維持儀式感一致性。

## 慣例

- **紅吉綠凶色碼**是全域語意符號（`text-red-500` / `text-green-500` + breathing glow），即便 light/emerald 主題也不要換配色，否則吉凶視覺判讀被破壞。
- **動畫統一用 Framer Motion**，連續光暈 / 呼吸效果寫在 `src/styles/animations.css`（`red-breathing` / `green-breathing`）。
- **部署 base path 為 `/qimen-app/`**（`vite.config.ts`），所有靜態資源路徑與 sitemap 都依此前綴，本地開發時注意別誤改。
- PWA manifest 的 `theme_color` / `background_color` 寫死為 dark 主題的 `#0f172a`，切換主題不影響系統 UI 顏色。
