import React, { useEffect } from 'react';
import { X, Info, AlertTriangle, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-theme-card border border-theme-border/50 rounded-3xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">

        {/* Header */}
        <div className="p-6 border-b border-theme-border/30 flex justify-between items-center bg-theme-bg/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-theme-accent/10 flex items-center justify-center text-theme-accent">
              <Info size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-theme-primary">使用指南與核心法則</h2>
              <p className="text-xs text-theme-primary/50 tracking-wider uppercase">Guideline & Core Logic</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-theme-accent/10 text-theme-primary/40 hover:text-theme-accent transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-6 space-y-8 custom-scrollbar">

          {/* Section 1: Core Logic */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-theme-accent border-l-4 border-theme-accent pl-3">
              <h3 className="font-bold text-lg">📜 核心鑑定法則：紅吉綠凶</h3>
            </div>
            <p className="text-sm text-theme-primary/70 leading-relaxed font-serif">
              本系統採用「紅吉綠凶」動態計分法，快速判斷宮位能量：
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 space-y-3">
                <div className="flex items-center gap-2 text-red-500 font-bold text-sm">
                  <AlertTriangle size={16} />
                  <span>🟢 綠色 (大凶符號)</span>
                </div>
                <p className="text-xs text-theme-primary/60">若宮位出現以下符號，不論分數多高，皆視為 <strong>大凶</strong>：</p>
                <div className="flex flex-wrap gap-2">
                  {['白虎', '天蓬', '天芮', '死門', '庚'].map(s => (
                    <span key={s} className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-500 text-xs border border-red-500/10">{s}</span>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-green-500/5 border border-green-500/20 space-y-3">
                <div className="flex items-center gap-2 text-green-500 font-bold text-sm">
                  <CheckCircle size={16} />
                  <span>🔴 紅色 (吉祥加分)</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-theme-primary/60">神: 值符, 太陰, 六合, 九天</span>
                    <span className="text-green-500">+20</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-theme-primary/60">星: 天輔, 天心, 天任</span>
                    <span className="text-green-500">+20</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-theme-primary/60">門: 開門, 休門, 生門</span>
                    <span className="text-green-500">+40</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-theme-primary/60">干: 乙, 丙, 丁, 戊</span>
                    <span className="text-green-500">+10</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-theme-accent/5 border border-theme-accent/10">
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold text-theme-primary">判定標準：</span>
                <span className="text-theme-primary/70">無大凶符號且總分 <strong className="text-theme-accent">≥ 60</strong> 為「吉」，低於 60 為「凶」。</span>
              </div>
            </div>
          </section>

          {/* Section 2: Numbers */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-theme-accent border-l-4 border-theme-accent pl-3">
              <h3 className="font-bold text-lg">🔢 報數指引 (1-9)</h3>
            </div>
            <ul className="space-y-3">
              <li className="flex gap-3 text-sm text-theme-primary/80 leading-relaxed font-serif">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-theme-accent/20 text-theme-accent flex items-center justify-center text-[10px] font-bold mt-0.5">1</span>
                <span>使用者可依直覺選取一個或多個數字（代表不同的選擇或方向）。</span>
              </li>
              <li className="flex gap-3 text-sm text-theme-primary/80 leading-relaxed font-serif">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-theme-accent/20 text-theme-accent flex items-center justify-center text-[10px] font-bold mt-0.5">2</span>
                <span><strong>特殊規則：</strong> 當選取 <strong>5 號 (中宮)</strong> 時，系統將依「五寄坤二」法則，自動參考 <strong>2 號 (坤宮)</strong> 之數據進行深度解析。</span>
              </li>
            </ul>
          </section>

          {/* Section 3: Flow */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-theme-accent border-l-4 border-theme-accent pl-3">
              <h3 className="font-bold text-lg">🚀 操作流程</h3>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <div className="flex-1 p-3 rounded-xl bg-theme-bg/50 border border-theme-border/30 text-xs text-center">
                <p className="font-bold mb-1">1. 設定意念</p>
                <p className="opacity-60">輸入問題與時間</p>
              </div>
              <ArrowRight className="hidden sm:block opacity-20" size={16} />
              <div className="flex-1 p-3 rounded-xl bg-theme-bg/50 border border-theme-border/30 text-xs text-center">
                <p className="font-bold mb-1">2. 選取宮位</p>
                <p className="opacity-60">點擊數字觸發計分</p>
              </div>
              <ArrowRight className="hidden sm:block opacity-20" size={16} />
              <div className="flex-1 p-3 rounded-xl bg-theme-accent/10 border border-theme-accent/20 text-xs text-center text-theme-accent">
                <p className="font-bold mb-1 flex items-center justify-center gap-1"><Sparkles size={12} /> 3. AI 解析</p>
                <p className="opacity-80 font-bold">獲取大師專屬建議</p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-theme-border/30 bg-theme-bg/30">
          <button
            onClick={onClose}
            className="w-full py-4 rounded-2xl bg-theme-accent text-white font-bold hover:shadow-lg hover:shadow-theme-accent/30 hover:-translate-y-0.5 transition-all duration-300 active:scale-95"
          >
            我知道了，開始解盤
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuideModal;
