# QA 驗收報告

- **Issue**：[QA Gate F] M5 (LDE-121) IndexedDB 快取 + 歷史驗收
- **日期**：2026-04-22
- **驗收人**：QA Engineer
- **結果**：✅ 通過

## 驗收項目

| 項目 | 結果 | 備註 |
|------|------|------|
| 同盤同情境重複查第 2 次走 cache（無 proxy 請求） | ✅ pass | `fetchContextualAnalysis` 先呼叫 `getCached`，命中直接回傳，不呼叫 proxy |
| cache key 格式正確：`{palaceHash}_{contextKey}_{promptVersion}` | ✅ pass | `buildCacheKey` 回傳 `${makePalaceHash(...)}_${contextKey}_${promptVersion}`，格式吻合 |
| 改動 promptVersion（v1 → v2）後 cache miss，舊 cache 不污染 | ✅ pass | promptVersion 納入 key，不同版本 key 不同，舊快取不受影響 |
| 歷史筆數上限 20 筆 | ✅ pass | `MAX_HISTORY = 20`，`updated.slice(0, MAX_HISTORY)` |
| 滿 20 筆後新增會淘汰最舊 | ✅ pass | 新筆先 prepend，再 slice，最舊的自動淘汰 |
| 歷史頁顯示 contextKey（情境標籤） | ✅ pass | `HistoryDrawer.tsx:85-89` 渲染 "感情/事業/投資" badge |
| 清 IndexedDB 後優雅降級：空狀態 UI，不崩潰 | ✅ pass | `getCached` try/catch 回傳 `null`，app 重新向 proxy 取資料；歷史頁空狀態 UI 正常 |
| TTL 30 天邏輯：timestamp 超過 30 天 → 重新 fetch | ✅ pass | `Date.now() - entry.timestamp > TTL_MS` 過期回傳 `null`，觸發重新 fetch |
| `npm run build` 零錯誤 | ✅ pass | `✓ built in 6.41s`，無型別錯誤，僅有 chunk 大小警告（非錯誤） |

## 程式碼審查重點

### `src/utils/cache.ts`
- `TTL_MS = 30 * 24 * 60 * 60 * 1000`（30 天）✅
- `buildCacheKey`：`${makePalaceHash(question, palaceData)}_${contextKey}_${promptVersion}` ✅
- `getCached` / `setCached` 皆有 try/catch 做容錯（IndexedDB 不可用時靜默失敗）✅

### `src/services/aiService.ts`
- `fetchContextualAnalysis` 先查 cache，命中直接回傳；miss 才呼叫 proxy 並存入 cache ✅

### `src/context/HistoryContext.tsx`
- `MAX_HISTORY = 20` + `[newEntry, ...prev].slice(0, 20)` ✅
- `contextKey` 欄位存入 `HistoryEntry` ✅

### `src/components/HistoryDrawer.tsx`
- 歷史空狀態 UI（"尚無歷史紀錄"）✅
- contextKey badge 顯示（love→感情 / career→事業 / invest→投資）✅

## 備註

- 歷史紀錄使用 **localStorage**（非 IndexedDB），清 IndexedDB 只影響快取層，歷史紀錄不受影響，此設計符合 LDE-121 規格（"idb-keyval 取代現有 localStorage history（或與之並存，視實際難度決定）"）。
- build 警告：單一 chunk 超過 500 KB，屬效能建議非錯誤，不影響本次驗收。

## 結論

M5 IndexedDB 快取 + 歷史功能全數通過驗收。快取命中邏輯正確、cache key 格式符合規格、歷史上限 20 筆淘汰機制運作正常、contextKey 顯示正確、容錯機制完善、構建零錯誤。建議將 LDE-121 標記為 done，並通知 L 進行最終驗收。
