import React, { useState, useEffect, useRef } from 'react';
import { useQiMen } from './hooks/useQiMen';
import { Calendar, ChevronLeft, ChevronRight, Sparkles, HelpCircle, History as HistoryIcon, Loader2 } from 'lucide-react';
import HistoryDrawer from './components/HistoryDrawer';
import type { HistoryEntry } from './types/history';
import { format } from 'date-fns';
import QimenChart from './components/QimenChart';
import ThemeSwitcher from './components/ThemeSwitcher';
import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { zhTW } from 'date-fns/locale/zh-TW';
import { analyzePalace } from './utils/analysis';
import { summarizePalace, actionLabel } from './utils/verdictSummary';
import QuestionInput from './components/QuestionInput';
import type { QuestionType } from './components/QuestionInput';
import AnalysisCard from './components/AnalysisCard';
import { fetchMultiPalaceAnalysis } from './services/aiService';
import ReactMarkdown from 'react-markdown';
import RitualLoading from './components/RitualLoading';
import Onboarding from './components/Onboarding';
import NumberPicker from './components/NumberPicker';
import MethodSelector from './components/MethodSelector';
import type { ChartingMethod } from './components/MethodSelector';
import PhoneInput from './components/PhoneInput';
import BirthInput from './components/BirthInput';
import { AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { triggerSuccessHaptic, triggerLightHaptic, triggerWarningHaptic } from './utils/haptics';
import './styles/animations.css';
import { useSituation } from './context/SituationContext';
import ContextSelector from './features/contexts/ContextSelector';
import type { SituationKey } from './context/SituationContext';

// Register locale
registerLocale('zh-TW', zhTW);

function App() {
  const { situationKey, setSituationKey } = useSituation();
  const [isAutoMode, setIsAutoMode] = useState(false);
  const datePickerRef = useRef<DatePicker>(null);
  const [selectedPalaces, setSelectedPalaces] = useState<number[]>([]);

  const [userQuestion, setUserQuestion] = useState('');
  const [isCharting, setIsCharting] = useState(false);
  const [isPreCharting, setIsPreCharting] = useState(false);
  const [isPickingMethod, setIsPickingMethod] = useState(false);
  const [chartingMethod, setChartingMethod] = useState<ChartingMethod | null>(null);
  const [isPickingNumber, setIsPickingNumber] = useState(false);
  const [isInputtingPhone, setIsInputtingPhone] = useState(false);
  const [isInputtingBirth, setIsInputtingBirth] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [mainSelectedNum, setMainSelectedNum] = useState<number | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [restoredEntry, setRestoredEntry] = useState<HistoryEntry | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date();
  });

  // Auto-update time effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isAutoMode && !isCharting) {
      const updateTime = () => {
        setSelectedDate(new Date());
      };
      updateTime();
      interval = setInterval(updateTime, 1000);
    }
    return () => clearInterval(interval);
  }, [isAutoMode, isCharting]);

  // Scroll listener
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);

    // Onboarding check
    const hasSeenGuide = localStorage.getItem('hasSeenGuide');
    if (!hasSeenGuide) {
      setTimeout(() => setShowOnboarding(true), 1500);
    }

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handlePalaceClick = (palaceNum: number) => {
    setSelectedPalaces(prev => {
      if (prev.includes(palaceNum)) {
        return prev.filter(p => p !== palaceNum);
      }
      return [...prev, palaceNum];
    });
  };

  const handleStartCharting = (question: string, _type: QuestionType) => {
    if (!question.trim()) {
      triggerWarningHaptic();
      return;
    }
    setUserQuestion(question);
    setIsCharting(true);
    setIsPickingMethod(true); // 先選起卦方法
    setChartingMethod(null);
    setIsPickingNumber(false);
    setIsInputtingPhone(false);
    setIsInputtingBirth(false);
    setIsRevealed(false);
    setMainSelectedNum(null);
    setSelectedPalaces([]);
    triggerLightHaptic();

    setIsAutoMode(true);
    setSelectedDate(new Date());
  };

  /** 起盤儀式 → 揭封 → 進入解析 */
  const beginRitual = (mainNum: number | null) => {
    setIsPickingMethod(false);
    setIsPickingNumber(false);
    setIsInputtingPhone(false);
    setIsInputtingBirth(false);
    setMainSelectedNum(mainNum);
    setIsPreCharting(true);

    setTimeout(() => {
      setIsPreCharting(false);
      setIsRevealed(true);
      setSelectedPalaces(mainNum !== null ? [mainNum] : []);
      triggerSuccessHaptic();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 1200);
  };

  const handleSelectMethod = (method: ChartingMethod) => {
    setChartingMethod(method);
    setIsPickingMethod(false);

    switch (method) {
      case 'intuition':
        setIsPickingNumber(true);
        break;
      case 'time':
        // 時間直出：不預設用事宮，讓使用者點盤面後再選
        beginRitual(null);
        break;
      case 'phone':
        setIsInputtingPhone(true);
        break;
      case 'birth':
        setIsInputtingBirth(true);
        break;
    }
  };

  const handleSelectNumber = (num: number) => {
    beginRitual(num);
  };

  const handlePhoneSubmit = (palace: number) => {
    beginRitual(palace);
  };

  const handleBirthSubmit = (palace: number) => {
    beginRitual(palace);
  };

  const handleBackToMethod = () => {
    setIsPickingMethod(true);
    setIsPickingNumber(false);
    setIsInputtingPhone(false);
    setIsInputtingBirth(false);
    setChartingMethod(null);
  };

  const handleReset = () => {
    setIsCharting(false);
    setIsPickingMethod(false);
    setChartingMethod(null);
    setIsPickingNumber(false);
    setIsInputtingPhone(false);
    setIsInputtingBirth(false);
    setIsRevealed(false);
    setMainSelectedNum(null);
    setSelectedPalaces([]);
    setUserQuestion('');
    setIsAutoMode(false);
    setRestoredEntry(null);
    setComparisonResult(null);
    setSituationKey(null);
  };

  const handleRestoreHistory = (entry: HistoryEntry) => {
    setRestoredEntry(entry);
    setSelectedDate(new Date(entry.date));
    setUserQuestion(entry.question);
    setSelectedPalaces([entry.palaceNum]);
    setMainSelectedNum(entry.palaceNum);
    setIsCharting(true);
    setIsPreCharting(false);
    setIsRevealed(true); // Restore as revealed
    setIsAutoMode(false);
  };

  const handleComparePalaces = async () => {
    if (selectedPalaces.length < 2 || !qimenData) return;
    setIsComparing(true);
    setComparisonResult(null);

    const palacesToCompare = selectedPalaces.map(num => {
      const isCenter = num === 5;
      const targetNum = isCenter ? 2 : num;
      const data = qimenData.palaces[targetNum];
      const analysis = analyzePalace(
        num,
        isCenter ? { ...data, name: "中五 (寄坤二)" } : data,
        { isMainPalace: num === mainSelectedNum }
      );
      return {
        ...data,
        name: analysis.palaceName,
        resultScore: analysis.verdict,
        score: analysis.score,
        weightedScore: analysis.weightedScore,
        isMainPalace: num === mainSelectedNum,
      };
    });

    try {
      const text = await fetchMultiPalaceAnalysis(userQuestion, palacesToCompare, undefined, situationKey ?? 'general');
      setComparisonResult(text);
    } catch (error) {
      console.error(error);
      setComparisonResult("⚠️ 大師在比對時分神了，請再試一次。");
    } finally {
      setIsComparing(false);
    }
  };

  const qimenData = useQiMen(selectedDate);

  const isQuestionMode = userQuestion.length > 0;

  return (
    <div className="min-h-screen bg-theme-bg text-theme-primary transition-colors duration-300 flex flex-col items-center">
      <Helmet>
        <title>奇門 AI 大師 - 專業奇門遁甲 AI 解析工具</title>
        <meta name="description" content="奇門 AI 大師是一款結合傳統奇門遁甲與現代 AI 技術的專業決策工具，提供精準的時空局數分析與具體的行動建議。" />
        <meta name="keywords" content="奇門遁甲, AI, 占卜, 決策, 運勢, 奇門大師, 數位易經" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://larrywithmanpower.github.io/qimen-app/" />
        <meta property="og:title" content="奇門 AI 大師 - 專業奇門遁甲 AI 解析工具" />
        <meta property="og:description" content="結合傳統奇門遁甲與 AI，為您的決策提供精準的時空指引。" />
        <meta property="og:image" content="https://larrywithmanpower.github.io/qimen-app/pwa-512x512.svg" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://larrywithmanpower.github.io/qimen-app/" />
        <meta property="twitter:title" content="奇門 AI 大師 - 專業奇門遁甲 AI 解析工具" />
        <meta property="twitter:description" content="結合傳統奇門遁甲與 AI，為您的決策提供精準的時空指引。" />
        <meta property="twitter:image" content="https://larrywithmanpower.github.io/qimen-app/pwa-512x512.svg" />

        {/* Structured Data (JSON-LD) */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "奇門 AI 大師",
            "operatingSystem": "Web",
            "applicationCategory": "LifestyleApplication",
            "description": "專業奇門遁甲 AI 解析工具，結合傳統易經與現代人工智慧。",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "TWD"
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.9",
              "ratingCount": "88"
            }
          })}
        </script>
      </Helmet>
      {/* Fixed Header with height preservation */}
      <div className="h-[72px] w-full invisible pointer-events-none" />
      <header
        className={`fixed top-0 z-40 w-full flex justify-center transition-all duration-500 ease-in-out ${scrolled
          ? 'bg-theme-bg/80 backdrop-blur-xl border-b border-theme-border/30 shadow-lg py-3'
          : 'bg-theme-bg/0 backdrop-blur-none border-b border-transparent py-5'
          }`}
      >
        <div className="w-full max-w-4xl flex justify-between items-center px-4 sm:px-8">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-theme-primary to-theme-accent bg-clip-text text-transparent">
              奇門大師
            </h1>
            <button
              onClick={() => setShowOnboarding(true)}
              className="mt-1 p-1.5 rounded-full hover:bg-theme-accent/10 text-theme-primary/30 hover:text-theme-accent transition-all"
              title="查看新手教學"
            >
              <HelpCircle size={20} />
            </button>
            {isCharting && (
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-theme-card border border-theme-border text-theme-primary/70 hover:text-theme-primary hover:border-theme-primary transition-all text-xs sm:text-sm font-medium group"
              >
                <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                返回
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="p-2 rounded-full hover:bg-theme-accent/10 text-theme-primary/30 hover:text-theme-accent transition-all"
              title="歷史紀錄"
            >
              <HistoryIcon size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="w-full max-w-4xl px-4 sm:px-8 pb-8 flex flex-col items-center">

        {!isCharting ? (
          <div className="w-full flex flex-col items-center py-10 sm:py-20 lg:py-32">
            <header className="mb-12 text-center w-full max-w-md animate-in fade-in slide-in-from-top-4 duration-1000">
              <h1 className="text-4xl sm:text-5xl font-bold text-theme-primary mb-3 opacity-90 tracking-tight">奇門遁甲</h1>
              <div className="flex items-center justify-center gap-2 text-theme-primary/40 text-sm sm:text-base font-medium">
                <span className="w-8 h-px bg-theme-border"></span>
                先起心動念，後觀其變
                <span className="w-8 h-px bg-theme-border"></span>
              </div>
            </header>
            {!situationKey ? (
              <ContextSelector selected={null} onSelect={(k: Exclude<SituationKey, null>) => setSituationKey(k)} />
            ) : (
              <div className="w-full flex flex-col items-center gap-4">
                <button
                  onClick={() => setSituationKey(null)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-theme-card border border-theme-border text-theme-primary/50 hover:text-theme-primary text-xs transition-all"
                >
                  <ChevronLeft size={12} />
                  {situationKey === 'love' ? '感情' : situationKey === 'career' ? '事業' : '投資'}
                  <span className="text-theme-primary/30">· 重選情境</span>
                </button>
                <QuestionInput onStart={handleStartCharting} />
              </div>
            )}
          </div>
        ) : (
          <div id="qimen-main-report" className="w-full max-w-4xl animate-in fade-in slide-in-from-bottom-6 duration-700">
            {isPickingMethod ? (
              <MethodSelector onSelect={handleSelectMethod} />
            ) : isPickingNumber ? (
              <NumberPicker onSelect={handleSelectNumber} />
            ) : isInputtingPhone ? (
              <PhoneInput onSubmit={handlePhoneSubmit} onBack={handleBackToMethod} />
            ) : isInputtingBirth ? (
              <BirthInput onSubmit={handleBirthSubmit} onBack={handleBackToMethod} />
            ) : isPreCharting ? (
              <RitualLoading />
            ) : (
              <main className="w-full space-y-8">
                {isQuestionMode && isRevealed && (
                  <header className="mb-10 text-center flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-theme-accent/10 border border-theme-accent/20 text-theme-accent text-sm font-bold mb-6 shadow-sm">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-theme-accent opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-theme-accent"></span>
                      </span>
                      正在為您解析
                      {chartingMethod && (
                        <span className="text-theme-accent/60 font-medium text-xs border-l border-theme-accent/30 pl-2 ml-1">
                          {chartingMethod === 'intuition' && '心動感應'}
                          {chartingMethod === 'time' && '時間直出'}
                          {chartingMethod === 'phone' && '手機號'}
                          {chartingMethod === 'birth' && '出生日'}
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl sm:text-4xl font-bold text-theme-primary max-w-2xl leading-relaxed font-serif tracking-wide border-b-2 border-theme-accent/20 pb-4 italic">
                      「{userQuestion}」
                    </h2>
                  </header>
                )}
                <div className="bg-theme-card p-6 sm:p-8 rounded-3xl border border-theme-border shadow-2xl space-y-10">
                  <section className="flex flex-col sm:flex-row gap-8 items-center justify-between border-b border-theme-border pb-8">
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-bold text-theme-primary/30 uppercase tracking-[0.2em] leading-none">盤面時空</span>
                      <div
                        className={`flex items-center gap-4 bg-theme-bg/30 p-2 pr-4 rounded-xl border transition-all ${isQuestionMode
                          ? 'border-theme-border/20 opacity-60 grayscale cursor-not-allowed'
                          : 'border-theme-border/50 hover:border-theme-accent/50 group'
                          }`}
                      >
                        <div className="p-2 rounded-lg bg-theme-accent/10 text-theme-accent shadow-inner">
                          <Calendar size={18} />
                        </div>
                        <div className="relative">
                          <DatePicker
                            ref={datePickerRef}
                            selected={selectedDate}
                            onChange={(date: Date | null) => {
                              if (date && !isQuestionMode) {
                                setIsAutoMode(false);
                                setSelectedDate(date);
                                setSelectedPalaces([]);
                              }
                            }}
                            showTimeSelect
                            timeFormat="HH:mm"
                            timeIntervals={15}
                            dateFormat="yyyy/MM/dd aa h:mm"
                            locale="zh-TW"
                            className={`bg - transparent border - none focus: ring - 0 outline - none font - mono text - xl text - theme - primary font - bold tracking - tight ${isQuestionMode ? 'cursor-not-allowed' : 'cursor-pointer'} `}
                            readOnly={isAutoMode || isQuestionMode}
                            disabled={isAutoMode || isQuestionMode}
                            popperPlacement="bottom"
                            shouldCloseOnSelect={false}
                            renderCustomHeader={({
                              date,
                              decreaseMonth,
                              increaseMonth,
                              prevMonthButtonDisabled,
                              nextMonthButtonDisabled,
                            }) => (
                              <div className="flex items-center justify-between px-4 h-[50px] bg-theme-bg box-border font-sans">
                                <button
                                  onClick={decreaseMonth}
                                  disabled={prevMonthButtonDisabled}
                                  type="button"
                                  className="p-2 hover:bg-theme-card rounded-full text-theme-primary transition-colors disabled:opacity-50"
                                >
                                  <ChevronLeft size={20} />
                                </button>
                                <span className="text-theme-primary font-bold text-lg">
                                  {format(date, "MMMM yyyy", { locale: zhTW })}
                                </span>
                                <button
                                  onClick={increaseMonth}
                                  disabled={nextMonthButtonDisabled}
                                  type="button"
                                  className="p-2 hover:bg-theme-card rounded-full text-theme-primary transition-colors disabled:opacity-50"
                                >
                                  <ChevronRight size={20} />
                                </button>
                              </div>
                            )}
                          >
                            <div className="border-t border-theme-border p-2 flex justify-end bg-theme-bg">
                              <button
                                onClick={() => {
                                  if (datePickerRef.current) {
                                    datePickerRef.current.setOpen(false);
                                  }
                                }}
                                className="bg-theme-primary text-theme-bg px-4 py-1 rounded font-bold hover:opacity-90 transition-colors text-sm"
                              >
                                確定
                              </button>
                            </div>
                          </DatePicker>
                        </div>
                      </div>
                    </div>

                    {isQuestionMode && (
                      <div className="text-[10px] font-bold text-theme-accent/50 uppercase tracking-widest bg-theme-accent/5 px-3 py-1.5 rounded-full border border-theme-accent/10">
                        時間已鎖定至起卦當下
                      </div>
                    )}
                  </section>


                  {qimenData ? (
                    <div className="space-y-12">
                      <section className={`grid grid-cols-3 md:grid-cols-6 gap-4 transition-all duration-1000 ${!isRevealed ? 'blur-md opacity-30 grayscale pointer-events-none' : 'opacity-100'}`}>
                        <InfoCard label="節氣" value={qimenData.solarTerm} icon={<Sparkles size={14} className="text-theme-accent/40" />} />
                        <InfoCard label="遁甲" value={qimenData.isYang ? '陽遁' : '陰遁'} />
                        <InfoCard label="局數" value={`${qimenData.juNumber} 局`} />
                        <InfoCard label="旬首" value={qimenData.xunShou} />
                        <InfoCard label="值符" value={qimenData.zhiFu} />
                        <InfoCard label="值使" value={qimenData.zhiShi} />
                      </section>

                      <section className="flex justify-center overflow-x-auto py-2">
                        <QimenChart
                          palaces={qimenData.palaces}
                          selectedPalaces={selectedPalaces}
                          onPalaceClick={handlePalaceClick}
                          isRevealed={isRevealed}
                          mainSelectedNum={mainSelectedNum}
                        />
                      </section>

                      {/* Analysis Results */}
                      {selectedPalaces.length > 0 && (() => {
                        const ctxMeta: Record<string, { label: string; icon: string; bar: string; badge: string; text: string }> = {
                          love:   { label: '感情', icon: '🌸', bar: 'bg-pink-400',    badge: 'bg-pink-500/10 border-pink-400/25 text-pink-300',    text: 'text-pink-300' },
                          career: { label: '事業', icon: '⛰️', bar: 'bg-blue-400',    badge: 'bg-blue-500/10 border-blue-400/25 text-blue-300',    text: 'text-blue-300' },
                          invest: { label: '投資', icon: '☯️', bar: 'bg-emerald-400', badge: 'bg-emerald-500/10 border-emerald-400/25 text-emerald-300', text: 'text-emerald-300' },
                        };
                        const ctx = situationKey ? ctxMeta[situationKey] : null;
                        return (
                        <section className="grid gap-6 mt-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-1.5 h-8 rounded-full ${ctx ? ctx.bar : 'bg-theme-accent'}`}></div>
                            <h2 className="text-2xl sm:text-3xl font-bold text-theme-primary tracking-tight">吉凶分析</h2>
                            {ctx && (
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold tracking-widest ${ctx.badge}`}>
                                <span>{ctx.icon}</span>
                                <span>{ctx.label}</span>
                              </span>
                            )}
                            <span className="text-theme-primary/20 text-sm font-mono ml-auto tracking-widest uppercase">Analysis Report</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {selectedPalaces.map(palaceNum => {
                              const isCenter = palaceNum === 5;
                              const targetPalaceNum = isCenter ? 2 : palaceNum;
                              const data = qimenData.palaces[targetPalaceNum];

                              if (!data) return null;

                              const analysisData = isCenter ? { ...data, name: "中五 (寄坤二)" } : data;
                              const result = analyzePalace(palaceNum, analysisData, {
                                isMainPalace: palaceNum === mainSelectedNum,
                              });

                              // 六級判定 → 色彩（吉：紅系，凶：綠系）
                              const resultColorClass = (() => {
                                switch (result.verdict) {
                                  case '大吉': return 'bg-red-500/10 border-red-500/40 text-red-600 dark:text-red-400';
                                  case '吉':   return 'bg-red-500/5 border-red-500/20 text-red-600 dark:text-red-400';
                                  case '平':   return 'bg-theme-card border-theme-border text-theme-primary';
                                  case '小凶': return 'bg-green-500/5 border-green-500/15 text-green-600 dark:text-green-400';
                                  case '凶':   return 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400';
                                  case '大凶': return 'bg-green-500/15 border-green-500/50 text-green-600 dark:text-green-400';
                                }
                              })();

                              const badgeColorClass = (() => {
                                switch (result.verdict) {
                                  case '大吉': return 'bg-red-700 text-white shadow-lg shadow-red-700/30';
                                  case '吉':   return 'bg-red-600 text-white shadow-lg shadow-red-600/20';
                                  case '平':   return 'bg-slate-500 text-white shadow-sm';
                                  case '小凶': return 'bg-green-500 text-white shadow-sm';
                                  case '凶':   return 'bg-green-600 text-white shadow-lg shadow-green-600/20';
                                  case '大凶': return 'bg-green-700 text-white shadow-lg shadow-green-700/30';
                                }
                              })();

                              return (
                                <AnalysisCard
                                  key={palaceNum}
                                  palaceNum={palaceNum}
                                  palaceName={result.palaceName}
                                  result={result.verdict}
                                  details={result.details}
                                  summary={summarizePalace(result)}
                                  actionTag={actionLabel(result)}
                                  userQuestion={userQuestion}
                                  isCenter={isCenter}
                                  resultColorClass={resultColorClass}
                                  badgeColorClass={badgeColorClass}
                                  palaceData={analysisData}
                                  predefinedResult={
                                    restoredEntry &&
                                      restoredEntry.palaceNum === palaceNum &&
                                      restoredEntry.question === userQuestion &&
                                      new Date(restoredEntry.date).getTime() === selectedDate.getTime()
                                      ? restoredEntry.aiResult
                                      : null
                                  }
                                  isMainPalace={palaceNum === mainSelectedNum}
                                />
                              );
                            })}
                          </div>
                        </section>
                        );
                      })()}

                      {/* Master Comparison Section */}
                      {selectedPalaces.length > 1 && (
                        <section className="mt-8 border-t border-theme-border pt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                          {!comparisonResult ? (
                            <button
                              onClick={handleComparePalaces}
                              disabled={isComparing}
                              className="w-full py-4 rounded-2xl bg-theme-accent text-theme-bg font-black text-lg shadow-xl shadow-theme-accent/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                              {isComparing ? (
                                <>
                                  <Loader2 className="animate-spin" size={24} />
                                  <span>大師正在進行綜合對比...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles size={24} />
                                  <span>✨ 請大師進行多宮位綜合比對</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <div className="bg-theme-card/30 rounded-3xl border border-theme-accent/20 p-6 sm:p-8">
                              <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 rounded-lg bg-theme-accent/10 text-theme-accent">
                                  <Sparkles size={20} />
                                </div>
                                <h3 className="text-xl font-bold">大師綜合比對建議</h3>
                                <button
                                  onClick={() => setComparisonResult(null)}
                                  className="ml-auto text-xs text-theme-primary/30 hover:text-theme-primary"
                                >
                                  重新比對
                                </button>
                              </div>
                              <div className="prose prose-invert max-w-none text-theme-primary/90 font-serif leading-relaxed ios-smooth-scroll no-scrollbar overflow-y-auto max-h-[60vh]">
                                <ReactMarkdown
                                  components={{
                                    strong: ({ node, ...props }) => <span className="text-theme-accent font-bold" {...props} />,
                                    h3: ({ node, ...props }) => <h3 className="text-xl font-bold text-theme-primary mt-6 mb-3 border-b border-theme-border/30 pb-2" {...props} />,
                                    ul: ({ node, ...props }) => <ul className="list-disc pl-5 space-y-2 my-4" {...props} />,
                                    p: ({ node, ...props }) => <p className="mb-4" {...props} />,
                                  }}
                                >
                                  {comparisonResult}
                                </ReactMarkdown>
                              </div>
                            </div>
                          )}
                        </section>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-theme-primary/30 py-32 animate-pulse flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-full border-4 border-theme-accent/20 border-t-theme-accent animate-spin"></div>
                      <p className="font-serif italic tracking-widest text-lg">正在推演時空局數...</p>
                    </div>
                  )}
                </div>
              </main>
            )}
          </div>
        )}
        <HistoryDrawer
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          onRestore={handleRestoreHistory}
        />

        <AnimatePresence>
          {showOnboarding && (
            <Onboarding onClose={() => setShowOnboarding(false)} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function InfoCard({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-theme-card/50 p-4 rounded-2xl border border-theme-border/50 flex flex-col items-center justify-center shadow-sm transition-all hover:bg-theme-card hover:border-theme-primary/20 hover:shadow-md group">
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <span className="text-theme-primary opacity-40 text-[10px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <span className="text-theme-primary text-lg sm:text-xl font-black group-hover:scale-110 transition-transform">{value}</span>
    </div>
  );
}

export default App;
