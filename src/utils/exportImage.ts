import html2canvas from 'html2canvas';

/**
 * 匯出指定元素為長圖
 * @param elementId 要匯出的 DOM ID
 * @param fileName 存檔檔名
 */
export const exportElementAsImage = async (elementId: string, fileName: string = 'qimen-analysis-report') => {
  // 1. 回到頂部以防位移，這對 html2canvas 很重要
  window.scrollTo(0, 0);

  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Export element not found:', elementId);
    return;
  }

  // 顯示正在產生的提示 (這裡可以實作全域 Loading)
  console.log("正在準備鑑定報告圖檔...");

  try {
    const canvas = await html2canvas(element, {
      scale: 2, // 高解析度
      useCORS: true,
      backgroundColor: 'transparent', // 讓背景由樣式決定
      logging: false,
      allowTaint: true,
      // 關鍵：在克隆的 DOM 中進行樣式調整，不影響原畫面
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
          // 2. 隱藏不必要的 UI 操作元素 (複製、切換主題、展開收合按鈕)
          const uiToHide = clonedElement.querySelectorAll('button:not(.palace-cell-btn), [title*="複製"], [title*="匯出"], [title*="解析"]');
          uiToHide.forEach(el => ((el as HTMLElement).style.display = 'none'));

          // 3. 解決關鍵問題：強制展開所有捲軸容器，捕捉全文內容
          const scrollContainers = clonedElement.querySelectorAll('.overflow-y-auto, .overflow-x-auto, .max-h-96, .max-h-\\[1000px\\], .custom-scrollbar');
          scrollContainers.forEach(container => {
            const el = container as HTMLElement;
            el.style.maxHeight = 'none';
            el.style.height = 'auto';
            el.style.width = 'auto';
            el.style.overflow = 'visible';
          });

          // 4. 強制設定容器樣式，模擬專業鑑定書排版
          clonedElement.style.padding = '80px 40px';
          clonedElement.style.background = 'var(--theme-bg, #0f172a)'; // 確保有預設深色背景
          clonedElement.style.width = '1200px';
          clonedElement.style.margin = '0 auto';
          clonedElement.style.color = 'var(--theme-primary, #ffffff)';

          // 5. 插入動態 Header 標題
          const reportHeader = clonedDoc.createElement('div');
          reportHeader.style.width = '100%';
          reportHeader.style.textAlign = 'center';
          reportHeader.style.marginBottom = '60px';
          reportHeader.style.paddingBottom = '30px';
          reportHeader.style.borderBottom = '4px double var(--theme-accent, #0ea5e9)';

          reportHeader.innerHTML = `
            <div style="font-size: 14px; color: var(--theme-accent); letter-spacing: 0.5em; margin-bottom: 10px;">· 天機鑑定 ·</div>
            <h1 style="font-size: 56px; font-weight: 900; margin-bottom: 15px; color: var(--theme-primary); font-family: serif; letter-spacing: 0.1em;">奇門遁甲 · 專家盤面鑑定報告</h1>
            <p style="font-size: 18px; opacity: 0.7; font-style: italic;">本報告由奇門大師 AI 生成，僅供參考決策</p>
          `;
          clonedElement.prepend(reportHeader);

          // 6. 處理垂直文字相容性問題
          // 某些瀏覽器下 html2canvas 對 writing-mode 支援不佳
          const verticalTexts = clonedElement.querySelectorAll('[style*="vertical-rl"]');
          verticalTexts.forEach(v => {
            const vel = v as HTMLElement;
            vel.style.display = 'inline-block';
            // 如果還是消失，嘗試簡單的垂直排列 (針對中文字)
          });

          // 7. 確保 AI 解析卡片內容是完全不透明且展開的
          const cards = clonedElement.querySelectorAll('.bg-theme-bg\\/50');
          cards.forEach(card => {
            const cardEl = card as HTMLElement;
            cardEl.style.opacity = '1';
            cardEl.style.maxHeight = 'none';
            cardEl.style.background = 'rgba(255, 255, 255, 0.05)';
            cardEl.style.borderRadius = '16px';
          });
        }
      }
    });

    // 轉為 Blob 導出高品質 PNG
    const image = canvas.toDataURL('image/png', 1.0);
    const link = document.createElement('a');
    link.download = `${fileName}.png`;
    link.href = image;
    link.click();
  } catch (error) {
    console.error('Failed to export image:', error);
    throw error;
  }
};
