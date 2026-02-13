# 奇門 AI 大師 (Qi Men AI Master)

> **✨ 融合古老智慧與現代 AI 的頂級謀略工具**
>
> 🚀 **線上展示：[https://larrywithmanpower.github.io/qimen-app/](https://larrywithmanpower.github.io/qimen-app/)**

「奇門大師」是一款基於 **奇門遁甲** 邏輯與 **Google Gemini AI** 打造的現代化決策輔助應用。它不僅提供精密的自動排盤，更透過 AI 謀略家的人格設定，為使用者提供具備儀式感、深度且量化的行動指南。

---

## 🌟 核心功能

### 1. 🔮 靈覺「盲選解盤」流程 (NEW!)
- **感應報數 (1-9)**：起卦前引導用戶選取 1-9 靈動數，模擬傳統「報數起卦」儀式。
- **盤面封印遮罩**：在選定數字前，盤面符號以毛玻璃特效進行「遮罩封印」，確保解析不受既定視覺預兆干擾，保持靈覺純粹。
- **心動之宮 (Heart Palace)**：系統自動鎖定報數對應宮位作為鑑定核心，並賦予強烈的光暈與動脈律動高亮效果。

### 2. ✨ 互動式新手引導
- **智能自動導覽**：新使用者進入時自動觸發，帶領您快速熟悉奇門佈局。
- **高品質 AI 配圖**：每一步引導配備精美的玄學科技感視覺圖像，解決古文晦澀難懂的問題。

### 3. ☯️ 儀式感排盤動效
- **時空揭封儀式**：報數後執行「大師推演」動畫，平滑轉換至解封狀態。
- **九宮格 Stagger 浮現**：宮位依序優雅浮現，模擬天機逐一顯露的過程。
- **觸覺回饋 (Haptic)**：整合 Web Vibrator API，在報數、解封、獲取解析時提供細膩的震動回饋，提升操作手感。

### 4. 🤖 大師級 AI 深度解析
- **謀略家人格**：AI 扮演沉穩、犀利且具遠見的頂級謀略家，將古文轉譯為現代商業與生活語境。
- **📊 結構化量化報告**：
  - **成功機率 (🔴)**、**風險指數 (🟢)**、**執行難度** 的星等表現。
  - **✨ 心動之宮標記**：AI 自動識別核心宮位進行加強論述。

### 5. 📸 專業鑑定報告導出
- 支援一鍵將 AI 解析結果匯出為精美的圖文卡片，便於儲存與分享。

### 6. 📱 PWA 全螢幕體驗
- 支持安裝至手機桌面，享有獨立、全螢幕的 App 級操作體感，並支援基礎離線存取。

### 7. 📜 歷史推演紀錄
- 自動儲存您的起卦紀錄與 AI 解析，隨時翻閱過往的決策智慧。

---

## 📖 使用指南

1. **起心動念**：在首頁輸入您想詢問的問題。
2. **感應報數**：在 1-9 數字盤中，憑直覺選取一個「心動之數」。
3. **時空推演**：系統開始推演局數，並緩緩「揭開盤面封印」。
4. **大師解析**：點擊宮位下方的「詢問大師解析」，獲取深度行動指南。
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
