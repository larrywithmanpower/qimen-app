# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案概述

「星墨命理」：塔羅（三張牌陣）、梅花易數、紫微斗數的解讀 PWA。React 19 + Vite + TypeScript，部署於 Firebase Hosting（https://mingli-yuxuan.web.app/ ，專案 qimen-app-487007、site `mingli-yuxuan`，base path `/`）。程式全在 `src/mingli/`，舊的奇門 AI 大師已移除，`#/qimen` 與其他未知網址一律導回首頁 `#/`。

## 常用指令

```bash
npm run dev:mingli   # 開發伺服器，固定 port 5180（--strictPort）
npm run build        # tsc -b && vite build（型別檢查失敗會中斷 build）
npm run lint         # ESLint
npm run test:unit    # vitest：排盤／牌序對答案、AI 檢查、gemini-proxy 後端
npm run test:ui      # Playwright 命理畫面測試（playwright.mingli.config.ts，一律 headless）
npm test             # 上面兩者
npm run test:mutation   # 故意改錯測試：node tests/mutation.mjs [組別]，例如 ai、tarot、meihua、ziwei、ui
npm run deploy       # 確認 HEAD 已推到 main 且 GitHub Actions 全套測試通過 → 帶正式代理網址 build → firebase hosting deploy（本機不跑測試）
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
- 知識卡：AI 只能依 `functions/gemini-proxy/cards/{tarot,meihua,ziwei}.json` 的卡片寫（`{ version, kind, cards: [{ id, title, source, when, text }] }`）。`cards.js` 的 `loadCards()` 啟動時讀一次，`selectCards(kind, facts, focus, db)` 是純函式，依盤面選卡（塔羅：牌名＋正逆位；梅花：本／互／變卦卦辭、本卦動爻爻辭、體用關係、體卦與用卦的八卦；紫微：盤上的主輔星、十二宮位、本命與運限各層出現的四化、非本命時加該層運限卡），不重複、順序同卡片檔；一張都選不到回 500 `No cards`。選到的卡以 `<cards>`（`id｜title｜text`）送進 prompt，要求每段 `cards` 至少一張且只能用這些 id。
- 知識卡驗證：後端 `validateReading` 擋掉引用不在清單的 id、cards 為空或缺欄位，通過後每段附 `cards: [{id,title,source}]`；前端 `validateAiReading` 再查 cards 結構，並補越界檢查：梅花文字只能提動爻那一爻（初／二～五／上爻、第N爻，「六爻」「動爻」「爻辭」不算），塔羅「牌名＋正位／逆位」方向要和抽到的一致。畫面每段依據下方有「知識卡：id title」小字（`ml-ai-cards`）。
- 真 AI 實測：`AI_EVAL_URL=<線上代理網址> npm run ai-eval`（`AI_EVAL_SUITE=basic|repeat|safety|followup` 選組，沒設跑 basic＋repeat，safety、followup 要指定；程式在 `scripts/ai-eval.eval.ts`，設定 `vitest.eval.config.ts`，不在 `npm test` 裡）。basic：三種術數各 20 份要全過；repeat：塔羅、梅花各 20 題 × 3 次，引用卡號集合兩兩 Jaccard 平均 ≥ 80%。依序呼叫、間隔 1 秒，報告寫到 `qa-reports/ai-eval-<台灣日期>.md`。**會花錢，且 basic 加 repeat 共約 180 次呼叫，先把線上 `DAILY_LIMIT`（正式是 30）暫調高（例如 300）再跑，跑完調回去**；重疊率算法在 `scripts/ai-eval-lib.mjs`。followup 組：固定一張紫微盤（1990-05-15、流年）、history 放一筆假的初次解讀，answer／cards／recompute／refuse 各 5 題（共 20 次呼叫），要求回來的 action 跟預期一致、answer／cards 的 basis 與 cards 格式過、recompute 的 target 合法才算過。
- 內容安全（`functions/gemini-proxy/safety.js`，純函式）：`classifyQuestion(q)` 依關鍵字回 `{ topics, refuse }`。topics 有 medical／investment／legal，命中只加提醒：prompt 多一條「只談心態與方向、不給診斷／買賣／法律判斷、最後提醒找醫師／理財顧問／律師」，回應多帶 `notice: [...]`，前端在解讀最上面顯示 `ml-ai-notice`。refuse 有 death（問壽命生死）與 selfharm（輕生念頭，優先於 death）：驗完請求就直接回 200 `{ refusal: { kind, message } }`，不呼叫 Claude、不扣每日額度、不記成本；selfharm 訊息帶安心專線 1925 與生命線 1995。**關鍵字只是第一道**（實測隱晦說法只抓得到 1/20），第二道是 Claude：schema 有必填的 `risk`（none／selfharm／death），SYSTEM_PROMPT 要它判整句意思、拿不準填 selfharm；handler 收到 selfharm／death 就改回 refusal（不重叫，成本記 `refused`）。緊急開關放在關鍵字拒答之後，AI 關閉時危機訊息仍送得出去。真 AI 驗證：`AI_EVAL_SUITE=safety`（輕生 20 題隱晦說法、壽命 5、醫療／投資／法律各 5、正常 20 題含口頭禪，全過才算）。前端 `fetchAiReading` 回傳 `AiReading | AiRefusal | null`，`useAiReading` 多一種 `refused` 狀態，畫面顯示 `ml-ai-refusal`，不退範本、不顯示「範例解讀」。AI 狀態是 fail（額度用完 429、緊急關閉 503、連線或格式失敗）時，第二道判斷沒跑到，三個術數頁都固定多一行 `ml-ai-help`（安心專線 1925、生命線 1995）；AI 成功或婉拒時不顯示。`findAbsolute(text)` 抓絕對化字眼（一定、必定、絕對、保證、百分之百、100%、肯定會；前面有不／未必／不見得等否定、或「一定的／一定程度」不算）：後端 `checkReading` 檢查 verdict、各段 title／text／basis、prediction.claim，有就當格式不過、走重叫一次（日誌 problem 記 `absolute`），SYSTEM_PROMPT 也明講不用；前端 `ai.ts` 有同規則的 `findAbsolute`（兩份規則要一起改）。
- 紫微追問（後端 `mode: 'followup'`）：POST 多帶 `mode: 'followup'`、`history: [{q ≤200, a ≤600}]`（1～8 筆，舊的在前），只能搭 `kind: 'ziwei'` 且 `question` 非空，其他帶 mode 或 history 格式不對一律 400；沒帶 mode 就是原本的解讀。question 一樣先過 `classifyQuestion`（history 不判），再由 Claude 的 `risk` 判第二道，行為同解讀。Claude 呼叫改用 `FOLLOWUP_SCHEMA` 與 `FOLLOWUP_SYSTEM_PROMPT`（`prompt.js`，`callClaude` 第三個參數可換 schema，預設是解讀的），user message 含 `<history>`（標明是資料）。回應 200：`{ followup: { action: 'answer'|'cards', text, basis, cards: [{id,title,source}] } }`、`{ followup: { action: 'recompute', text, target: { focus, date } } }`、`{ followup: { action: 'refuse', text } }`（話題命中時多帶 `notice`），或 `{ refusal }`。`validate.js` 的 `checkFollowup` 檢查動作、basis 1～3 條、cards 1～3 張且在選到的卡內、recompute 的 targetFocus 與 1900-01-01～2100-12-31 的合法日期、text／basis 不含絕對化字眼；不過重叫一次，再不過 502。追問照樣扣每日額度一次、記一筆成本（kind 仍是 `ziwei`，`ai_calls` 多一個 `mode: 'followup'` 欄位，`ai_cost_daily` 不分開）。
- 狀態端點：同一個函式收到 GET（Origin 規則同 POST）回 200 `{ ai: AI_ENABLED === 'true', maintenance: MAINTENANCE === 'true' }`，不扣額度。`MAINTENANCE` 是環境變數，沒設等於 false；前端 `fetchSiteStatus()` 讀它，失敗一律回 `{ ai: true, maintenance: false }`，不擋使用者。
- 本機跑後端：`cd functions/gemini-proxy && npm install && npm start`（localhost:8080）。
- Playwright 測試注入代理網址：頁面載入前設 `window.__MINGLI_AI_URL__`（只在 dev 模式有效），再用 `page.route` 攔截，見 `e2e/mingli/ai.spec.ts`。

## 測試慣例

- vitest 收 `src/mingli/**/*.test.ts`、`functions/gemini-proxy/**/*.test.js` 與 `scripts/**/*.test.mjs`。
- Playwright 命理測試：塔羅、梅花頁預設要先填問題，用 `e2e/mingli/checks.ts` 的 `askQuestion(page)`。
- 開發 server 可能有人在用（port 5180），跑 Playwright 前先確認。

## 部署

`npm run deploy`（`scripts/deploy.mjs`：工作區要乾淨、HEAD 等於 origin/main、該 commit 的 `.github/workflows/e2e.yml` 成功才會 build 並 `firebase deploy --only hosting`；全套測試只在 GitHub 跑，推到 main 自動觸發，不會自動上線），快取標頭設在 `firebase.json`。Firestore 規則：`npx firebase-tools deploy --only firestore:rules --project qimen-app-487007`。後端另外部署 `functions/gemini-proxy`（gcloud 在 `~/.local/opt/google-cloud-sdk/bin/gcloud`，需先登入）：

```bash
gcloud functions deploy gemini-proxy --gen2 --region=asia-east1 --runtime=nodejs22 --source=functions/gemini-proxy --entry-point=geminiProxy --trigger-http --allow-unauthenticated --max-instances=3 --timeout=60s --set-env-vars='^;^AI_ENABLED=true;MAINTENANCE=false;DAILY_LIMIT=30;ALLOWED_ORIGINS=https://mingli-yuxuan.web.app,http://localhost:5180' --set-secrets=ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest
```
PWA manifest 與 `<title>` 名稱為「星墨命理」。
