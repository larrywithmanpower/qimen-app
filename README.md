# 奇門遁甲排盤系統 (Qi Men Dun Jia Chart)

> **🚀 線上展示：[https://larrywithmanpower.github.io/qimen-app/](https://larrywithmanpower.github.io/qimen-app/)**

這是一個基於 **React**, **TypeScript** 和 **Tailwind CSS** 開發的現代化奇門遁甲排盤應用程式。提供精美的介面、即時排盤功能以及吉凶分析，並支援電腦與手機版型 (RWD)。

## ✨ 功能特色

*   **自動/手動模式**：
    *   **自動模式**：即時顯示當前時間的奇門盤，每秒自動更新。
    *   **手動模式**：透過客製化的日期選擇器 (Date Picker) 指定任意日期與時間進行排盤。
*   **完整資訊展示**：
    *   顯示節氣、陰陽遁、局數。
    *   顯示旬首、值符、值使。
*   **互動式九宮格**：
    *   點擊九宮格中的任意宮位，下方會顯示該宮位的詳細吉凶分析。
    *   包含八門、九星、八神、天干的組合含義。
*   **響應式設計 (RWD)**：
    *   **電腦版**：完整的九宮格與右側資訊欄。
    *   **手機版**：優化的直式排版，日期選擇器與九宮格皆自動調整大小與文字，確保最佳閱讀體驗。

## 🚀 如何安裝與執行

請確保您的電腦已安裝 [Node.js](https://nodejs.org/) (建議 v20 以上)。

1.  **複製專案** (Clone the repository)
    ```bash
    git clone <your-repo-url>
    cd qimen-app
    ```

2.  **安裝套件** (Install dependencies)
    ```bash
    npm install
    # 或使用了 pnpm / yarn
    # pnpm install
    # yarn install
    ```

3.  **啟動開發伺服器** (Start dev server)
    ```bash
    npm run dev
    ```
    啟動後，瀏覽器通常會自動開啟 [http://localhost:5173](http://localhost:5173)。

4.  **建置生產版本** (Build for production)
    ```bash
    npm run build
    ```

## 📖 使用說明

1.  **切換模式**：點擊上方的「現在時間」或「自行輸入」按鈕切換模式。
2.  **選擇日期 (手動模式)**：
    *   點擊日期欄位開啟選擇器。
    *   左側選擇日期，右側滑動選擇時間。
    *   手機版日期選擇器會自動轉為直式排列。
3.  **查看吉凶**：
    *   排盤完成後，點擊九宮格中的格子。
    *   被選取的格子會高亮顯示 (黃色光暈)。
    *    scroll down (往下滑) 查看該宮位的詳細吉凶分析結果。

## 🛠️ 技術棧

*   [React](https://react.dev/) - 前端框架
*   [TypeScript](https://www.typescriptlang.org/) - 型別安全
*   [Tailwind CSS](https://tailwindcss.com/) - 樣式設計
*   [Vite](https://vitejs.dev/) - 建置工具
*   [date-fns](https://date-fns.org/) - 日期處理
*   [react-datepicker](https://reactdatepicker.com/) - 日期選擇器组件

## 📄 授權

MIT License
