import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, X } from 'lucide-react';

// Import images to handle asset bundling correctly across different environments
import welcomeImg from '../assets/onboarding/welcome.png';
import indicatorsImg from '../assets/onboarding/indicators.png';
import gridLogicImg from '../assets/onboarding/grid_logic.png';
import aiInsightImg from '../assets/onboarding/ai_insight.png';

interface OnboardingProps {
  onClose: () => void;
}

const steps = [
  {
    title: "歡迎使用「奇門大師」",
    content: "融合「奇門遁甲」古老智慧與「現代 AI」深度邏輯的決策輔助系統。\n三步完成精準鑑定：選情境 → 默想問題 → 起卦解盤。",
    image: welcomeImg,
    color: "from-theme-accent/20 to-transparent"
  },
  {
    title: "第一步：選擇「情境」定基調",
    content: "🌸 感情 · 愛情運勢、桃花、婚姻\n⛰️ 事業 · 職場貴人、升遷、求職\n☯️ 投資 · 財運、風險評估、時機\n\n情境決定 AI 解析的語言、重點與建議方向。",
    image: indicatorsImg,
    color: "from-red-500/10 to-transparent"
  },
  {
    title: "第二步：默想問題，起卦「四法」",
    content: "輸入心中默念的問題，或點擊情境範例題。接著選擇起卦方式：\n✨ 心動感應 · 憑直覺選 1-9\n🕑 時間直出 · 當下時空為盤\n📱 手機號 · 取尾數定宮\n🎂 出生日 · 依生日取宮",
    image: gridLogicImg,
    color: "from-sky-500/10 to-transparent"
  },
  {
    title: "第三步：看盤，請大師「量化鑑定」",
    content: "🔴 紅為吉、🟢 綠為凶 · 看顏色秒判吉凶。\n中五宮自動寄於坤二宮（右上），無需手動處理。\n\n點選宮位後召喚大師 AI，輸出「成功機率 · 風險指數 · 執行建議」量化報告。",
    image: aiInsightImg,
    color: "from-theme-accent/20 to-transparent"
  }
];

const Onboarding: React.FC<OnboardingProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    localStorage.setItem('hasSeenGuide', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-[#000814]/90 backdrop-blur-xl"
        onClick={handleFinish}
      />

      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 30 }}
        className="relative w-full max-w-xl max-h-[90vh] bg-theme-card border border-theme-border/30 rounded-[2.5rem] shadow-[0_0_60px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col"
      >
        {/* Close button with higher z-index and safe area */}
        <button
          onClick={handleFinish}
          className="absolute top-5 right-5 z-[50] p-2.5 rounded-full bg-black/40 hover:bg-black/60 text-white/70 hover:text-white transition-all backdrop-blur-md border border-white/10"
          aria-label="關閉"
        >
          <X size={20} />
        </button>

        <div className={`flex-1 overflow-y-auto transition-colors duration-700 bg-gradient-to-b ${steps[currentStep].color}`}>
          <div className="flex flex-col items-center">

            {/* Image section with fixed ratio and no content overlap */}
            <div className="w-full relative shrink-0 overflow-hidden bg-black/40 aspect-[16/10]">
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentStep}
                  src={steps[currentStep].image}
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="w-full h-full object-cover select-none"
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                  alt="" // Empty alt to prevent broken icon text if images fail, though imported assets are reliable
                />
              </AnimatePresence>
              {/* Bottom gradient overlay to blend with card body */}
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-theme-card to-transparent"></div>
            </div>

            {/* Content area with dedicated spacing */}
            <div className="px-6 sm:px-12 pb-10 pt-2 relative z-10 w-full flex flex-col items-center">
              <div className="w-full min-h-[200px] sm:min-h-[240px] flex flex-col items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="text-center w-full"
                  >
                    <h2 className="text-3xl sm:text-4xl font-black mb-5 tracking-tight text-theme-primary leading-tight drop-shadow-sm">
                      {steps[currentStep].title}
                    </h2>
                    <p className="text-theme-primary/80 leading-relaxed text-lg sm:text-xl whitespace-pre-line font-serif italic max-w-md mx-auto">
                      {steps[currentStep].content}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Responsive Navigation Buttons */}
              <div className="w-full flex flex-col gap-4 mt-8 sm:mt-10">
                <button
                  onClick={handleNext}
                  className="w-full py-5 rounded-[1.25rem] bg-theme-accent text-theme-bg font-black text-xl shadow-[0_12px_24px_rgba(var(--color-accent-rgb),0.3)] hover:translate-y-[-2px] hover:shadow-[0_15px_30px_rgba(var(--color-accent-rgb),0.4)] active:translate-y-0 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  <span className="mb-0.5">{currentStep === steps.length - 1 ? "開啟命運之門" : "繼續探索"}</span>
                  {currentStep !== steps.length - 1 && <ArrowRight size={24} />}
                </button>

                {currentStep > 0 ? (
                  <button
                    onClick={handleBack}
                    className="w-full py-2.5 text-theme-primary/40 font-bold text-sm flex items-center justify-center gap-2 hover:text-theme-primary/70 transition-all group"
                  >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    上一步
                  </button>
                ) : (
                  <div className="h-10" /> // Placeholder for layout stability
                )}
              </div>

              {/* Progress dots at the very bottom */}
              <div className="mt-8 flex justify-center gap-3">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 rounded-full transition-all duration-500 ${i === currentStep
                      ? 'w-10 bg-theme-accent shadow-[0_0_12px_rgba(var(--color-accent-rgb),0.5)]'
                      : 'w-2.5 bg-theme-accent/15'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Onboarding;
