# 奇門 AI 大師 (Qi Men AI Master)

> **✨ 融合古老智慧與現代 AI 的頂級謀略工具**
>
> 🚀 **線上展示：[https://larrywithmanpower.github.io/qimen-app/](https://larrywithmanpower.github.io/qimen-app/)**

「奇門大師」是一款基於 **奇門遁甲** 邏輯與 **Google Gemini AI** 打造的現代化決策輔助應用。它不僅提供精密的自動排盤，更透過 AI 謀略家的人格設定，為使用者提供具備儀式感、深度且量化的行動指南。

---

## 🌟 核心功能

### 1. ☯️ 儀式感排盤動效
- **排盤預載入儀式**：進入盤面前的「八卦推演」動畫，平滑渲染壓力，營造沈浸感。
- **九宮格 Stagger 浮現**：宮位依序優雅浮現，模擬天機逐一顯露的過程。
- **符號能量呼吸**：盤中門、星、神符號具備呼吸感律動，紅吉與綠凶燈號直擊視覺核心。

### 2. 🤖 大師級 AI 深度解析
- **謀略家人格**：AI 扮演沉穩、犀利且具遠見的頂級謀略家，將古文轉譯為現代商業與生活語境。
- **📊 結構化量化報告**：
  - **成功機率 (🔴)**、**風險指數 (🟢)**、**執行難度** 的星等表現。
  - **大師定調**：一句話點破局面（如：「沈潛待時，不可強求」）。
  - **象意拆解**：深度分析門星神組合對具體問項的影響。
  - **決策建議**：提供 1-2-3 具體可執行的步驟。

### 3. 📸 專業鑑定報告導出
- 支援一鍵將 AI 解析結果匯出為精美的圖文卡片，便於儲存與分享。

### 4. 📱 PWA 全螢幕體驗
- 支持安裝至手機桌面，享有獨立、全螢幕的 App 級操作體感，並支援基礎離線存取。

### 5. 📜 歷史推演紀錄
- 自動儲存您的起卦紀錄與 AI 解析，隨時翻閱過往的決策智慧。

---

## 📖 使用指南

1. **起心動念**：在首頁輸入您想詢問的問題（如：「明日與甲方的商談結果？」）。
2. **推演排盤**：點擊「請大師推演」，系統會鎖定當前時空進行排盤。
3. **選取宮位**：點擊九宮格中感興趣的宮位（如：開門、生門所在宮位）。
4. **大師解析**：點擊宮位下方的「詢問大師解析」，等待八卦推演完成。
5. **綜合比對**：若選取多個宮位，可啟動「多宮位綜合比對」，讓大師權衡不同方案的優劣。

---

## 🛠️ 技術棧

- **Frontend**: [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animation**: [Framer Motion](https://www.framer.com/motion/)
- **AI Engine**: [Google Generative AI (Gemini)](https://ai.google.dev/)
- **PWA**: [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
- **Build Tool**: [Vite](https://vitejs.dev/)

---

## 🚀 開發人員安裝

1.  **複製專案**：
    ```bash
    git clone <repository-url>
    cd qimen-app
    ```

2.  **安裝套件**：
    ```bash
    npm install
    ```

3.  **API 金鑰設置**：
    在根目錄建立 `.env` 文件，加入您的 Gemini API Key：
    ```env
    VITE_GEMINI_API_KEY=your_api_key_here
    ```

4.  **啟動開發伺服器**：
    ```bash
    npm run dev
    ```

---

## 📄 授權

MIT License
