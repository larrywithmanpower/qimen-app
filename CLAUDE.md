# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案概述

「語軒命理」：塔羅（三張牌陣）、梅花易數、紫微斗數的解讀 PWA。React 19 + Vite + TypeScript，部署於 Firebase Hosting（https://mingli-yuxuan.web.app/ ，專案 qimen-app-487007、site `mingli-yuxuan`，base path `/`）。程式全在 `src/mingli/`，舊的奇門 AI 大師已移除，`#/qimen` 與其他未知網址一律導回首頁 `#/`。

## 常用指令

```bash
npm run dev:mingli   # 開發伺服器，固定 port 5180（--strictPort）
npm run build        # tsc -b && vite build（型別檢查失敗會中斷 build）
npm run lint         # ESLint
npm run test:unit    # vitest：排盤／牌序對答案、AI 檢查、gemini-proxy 後端
npm run test:ui      # Playwright 命理畫面測試（playwright.mingli.config.ts，一律 headless）
npm test             # 上面兩者
npm run test:mutation   # 故意改錯測試：node tests/mutation.mjs [組別]，例如 ai、tarot、meihua、ziwei、ui
npm run deploy       # npm test → 帶正式代理網址 build → firebase hosting deploy
```

`tests/oracle/` 與 `*.fixtures*.json` 是對答案的答案檔，不可為了讓測試過而改動。

## 架構

- 路由：`src/mingli/ui/route.ts` 的 hash 路由，頁面在 `MingliApp.tsx`：`/` 首頁、`/tarot`、`/meihua`、`/ziwei`、`/records`、`/accuracy`、`/me`。
- 排盤引擎都是純函式：`tarot/engine.ts`（同一牌序編號洗出同一副牌）、`meihua/engine.ts`、`ziwei/engine.ts`（包 iztro，流派設定寫死）。
- 問題：首頁輸入後存在 `ui/session.ts`；塔羅、梅花頁可用 `ui/QuestionBar.tsx` 在抽牌／起卦前修改。沒有問題不能開始，範例問題只當 placeholder。紫微問題可空。
- 樣式：色碼只准寫在 `styles/tokens.css`，class 一律 `ml-` 開頭（`__tests__/static.test.ts` 會檢查）。

## AI 解讀

- 前端 `src/mingli/ai.ts`：組盤面事實（不含生日、姓名）→ POST 到 `VITE_GEMINI_PROXY_URL` → 收回後再驗一次（tone 一致、每段 basis 非空、牌名／卦名／星名都在盤上）。沒設網址、逾時 30 秒、非 200 或檢查沒過，一律退回程式範本並維持「範例解讀」那行。
- 塔羅、梅花看解讀時自動呼叫；紫微按「AI 解讀這張盤」才呼叫。
- 後端 `functions/gemini-proxy/`（資料夾與函式名 `geminiProxy` 線上已部署，不要改名）：用 `@anthropic-ai/sdk` 呼叫 `claude-sonnet-5-5`（模型寫死），用 `output_config` 指定 JSON schema 結構化輸出（Sonnet 5.5 不支援 tool_choice 強制指定工具）；Origin 白名單（沒帶 Origin 也 403）、`AI_ENABLED` 緊急開關、`DAILY_LIMIT`（程式預設 200，正式設 30）每日上限（Firestore `usage/{台灣日期}`）。環境變數見 `functions/gemini-proxy/.env.example`；`ANTHROPIC_API_KEY` 正式由 Secret Manager 掛載，不寫進程式。日誌不記錄 question 與 facts。
- 成本紀錄：每次請求（含重叫、失敗）寫 Firestore `ai_calls` 與 `ai_cost_daily/{台灣日期}`，只存 token 數、項目、狀態，不存問題與盤面；寫入失敗不影響使用者。`firestore.rules` 全拒絕前端讀寫，只有後端（服務帳號）能碰。報表：`npm run ai-cost -- --month 2026-10`（需 gcloud 登入；單價在 `scripts/ai-cost-lib.mjs`，換模型或官方調價要更新）。
- 紫微請求帶 `focus`（natal/decadal/yearly/monthly/daily，選填），facts 只帶選中那一層。
- 本機跑後端：`cd functions/gemini-proxy && npm install && npm start`（localhost:8080）。
- Playwright 測試注入代理網址：頁面載入前設 `window.__MINGLI_AI_URL__`（只在 dev 模式有效），再用 `page.route` 攔截，見 `e2e/mingli/ai.spec.ts`。

## 測試慣例

- vitest 收 `src/mingli/**/*.test.ts`、`functions/gemini-proxy/**/*.test.js` 與 `scripts/**/*.test.mjs`。
- Playwright 命理測試：塔羅、梅花頁預設要先填問題，用 `e2e/mingli/checks.ts` 的 `askQuestion(page)`。
- 開發 server 可能有人在用（port 5180），跑 Playwright 前先確認。

## 部署

`npm run deploy`（build 時帶入正式代理網址，再 `firebase deploy --only hosting`），快取標頭設在 `firebase.json`。Firestore 規則：`npx firebase-tools deploy --only firestore:rules --project qimen-app-487007`。後端另外部署 `functions/gemini-proxy`（gcloud 在 `~/.local/opt/google-cloud-sdk/bin/gcloud`，需先登入）：

```bash
gcloud functions deploy gemini-proxy --gen2 --region=asia-east1 --runtime=nodejs22 --source=functions/gemini-proxy --entry-point=geminiProxy --trigger-http --allow-unauthenticated --max-instances=3 --timeout=60s --set-env-vars='^;^AI_ENABLED=true;DAILY_LIMIT=30;ALLOWED_ORIGINS=https://mingli-yuxuan.web.app,http://localhost:5180' --set-secrets=ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest
```
PWA manifest 與 `<title>` 名稱為「語軒命理」。
