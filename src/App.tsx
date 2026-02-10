import React, { useState, useEffect, useRef } from 'react';
import { useQiMen } from './hooks/useQiMen';
import { Calendar, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import QimenChart from './components/QimenChart';
import ThemeSwitcher from './components/ThemeSwitcher';
import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { zhTW } from 'date-fns/locale/zh-TW';
import { analyzePalace } from './utils/analysis';
import QuestionInput from './components/QuestionInput';
import type { QuestionType } from './components/QuestionInput';

// Register locale
registerLocale('zh-TW', zhTW);

function App() {
  const [isAutoMode, setIsAutoMode] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<DatePicker>(null);
  const [selectedPalaces, setSelectedPalaces] = useState<number[]>([]);

  const [userQuestion, setUserQuestion] = useState('');
  const [isCharting, setIsCharting] = useState(false);

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

  const handleManualClick = () => {
    setIsAutoMode(false);
    setTimeout(() => {
      if (datePickerRef.current) {
        datePickerRef.current.setOpen(true);
      }
    }, 0);
  };

  const handlePalaceClick = (palaceNum: number) => {
    setSelectedPalaces(prev => {
      if (prev.includes(palaceNum)) {
        return prev.filter(p => p !== palaceNum);
      }
      return [...prev, palaceNum];
    });
  };

  const handleStartCharting = (question: string, _type: QuestionType) => {
    setUserQuestion(question);
    setIsCharting(true);
    setSelectedPalaces([]);

    // If a question is provided, force current time (Now)
    if (question.trim()) {
      setIsAutoMode(true);
      setSelectedDate(new Date());
    } else {
      // If "Other" (no question), allow manual mode (stays at whatever it was or user can change)
      setIsAutoMode(false);
    }
  };

  const handleReset = () => {
    setIsCharting(false);
    setSelectedPalaces([]);
    setUserQuestion('');
    setIsAutoMode(false); // Reset to manual for next pull or let QuestionInput handle it
  };

  const qimenData = useQiMen(selectedDate);

  const isQuestionMode = userQuestion.length > 0;

  return (
    <div className="min-h-screen bg-theme-bg text-theme-primary p-4 sm:p-8 flex flex-col items-center transition-colors duration-300">
      <div className="w-full max-w-4xl flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          {isCharting && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-theme-card border border-theme-border text-theme-primary/70 hover:text-theme-primary hover:border-theme-primary transition-all text-sm font-medium group"
            >
              <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              返回提問
            </button>
          )}
        </div>
        <ThemeSwitcher />
      </div>

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
          <QuestionInput onStart={handleStartCharting} />
        </div>
      ) : (
        <div className="w-full max-w-4xl animate-in fade-in slide-in-from-bottom-6 duration-700">
          {isQuestionMode && (
            <header className="mb-10 text-center flex flex-col items-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-theme-accent/10 border border-theme-accent/20 text-theme-accent text-sm font-bold mb-6 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-theme-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-theme-accent"></span>
                </span>
                正在為您解析
              </div>
              <h2 className="text-2xl sm:text-4xl font-bold text-theme-primary max-w-2xl leading-relaxed font-serif tracking-wide border-b-2 border-theme-accent/20 pb-4 italic">
                「{userQuestion}」
              </h2>
            </header>
          )}

          <main className="w-full space-y-8">
            <div className="bg-theme-card p-6 sm:p-8 rounded-3xl border border-theme-border shadow-2xl space-y-10">
              <section className="flex flex-col sm:flex-row gap-8 items-center justify-between border-b border-theme-border pb-8">
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-theme-primary/30 uppercase tracking-[0.2em] leading-none">盤面時空</span>
                  <div
                    ref={wrapperRef}
                    className={`flex items-center gap-4 bg-theme-bg/30 p-2 pr-4 rounded-xl border transition-all ${isQuestionMode
                      ? 'border-theme-border/20 opacity-60 grayscale cursor-not-allowed'
                      : 'border-theme-border/50 hover:border-theme-accent/50 group'
                      }`}
                  >
                    <button
                      onClick={handleManualClick}
                      disabled={isQuestionMode}
                      className={`p-2 rounded-lg bg-theme-accent/10 text-theme-accent shadow-inner transition-transform ${!isQuestionMode && 'group-hover:scale-110'}`}
                      title={isQuestionMode ? "提問模式限制鎖定於當前時間" : "點擊開啟日期選擇器"}
                    >
                      <Calendar size={18} />
                    </button>
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
                        className={`bg-transparent border-none focus:ring-0 outline-none font-mono text-xl text-theme-primary font-bold tracking-tight ${isQuestionMode ? 'cursor-not-allowed' : 'cursor-pointer'}`}
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

                {!isQuestionMode && (
                  <div className="flex gap-3 animate-in fade-in duration-500">
                    <button
                      onClick={() => {
                        setIsAutoMode(true);
                        setSelectedDate(new Date());
                        setSelectedPalaces([]);
                      }}
                      className={`text-xs px-4 py-2 rounded-xl transition-all font-bold border ${isAutoMode
                        ? 'bg-theme-primary text-theme-bg border-theme-primary shadow-lg shadow-theme-primary/10'
                        : 'bg-theme-bg/50 text-theme-primary/40 border-theme-border hover:text-theme-primary/80 hover:border-theme-primary/30'
                        }`}
                    >
                      現在時間
                    </button>
                    <button
                      onClick={handleManualClick}
                      className={`text-xs px-4 py-2 rounded-xl transition-all font-bold border ${!isAutoMode
                        ? 'bg-theme-primary text-theme-bg border-theme-primary shadow-lg shadow-theme-primary/10'
                        : 'bg-theme-bg/50 text-theme-primary/40 border-theme-border hover:text-theme-primary/80 hover:border-theme-primary/30'
                        }`}
                    >
                      調整時間
                    </button>
                  </div>
                )}

                {isQuestionMode && (
                  <div className="text-[10px] font-bold text-theme-accent/50 uppercase tracking-widest bg-theme-accent/5 px-3 py-1.5 rounded-full border border-theme-accent/10">
                    時間已鎖定至起卦當下
                  </div>
                )}
              </section>


              {qimenData ? (
                <div className="space-y-12">
                  <section className="grid grid-cols-3 md:grid-cols-6 gap-4">
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
                    />
                  </section>

                  {/* Analysis Results */}
                  {selectedPalaces.length > 0 && (
                    <section className="grid gap-6 mt-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-1.5 h-8 bg-theme-accent rounded-full"></div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-theme-primary tracking-tight">吉凶分析</h2>
                        <span className="text-theme-primary/20 text-sm font-mono ml-auto tracking-widest uppercase">Analysis Report</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {selectedPalaces.map(palaceNum => {
                          const isCenter = palaceNum === 5;
                          const targetPalaceNum = isCenter ? 2 : palaceNum;
                          const data = qimenData.palaces[targetPalaceNum];

                          if (!data) return null;

                          const analysisData = isCenter ? { ...data, name: "中五 (寄坤二)" } : data;
                          const result = analyzePalace(palaceNum, analysisData);

                          const resultColorClass = result.result === '大凶'
                            ? 'bg-red-500/5 border-red-500/20 text-red-600 dark:text-red-400'
                            : result.result === '凶'
                              ? 'bg-theme-card border-theme-border text-theme-primary'
                              : 'bg-green-500/5 border-green-500/20 text-green-600 dark:text-green-400';

                          const badgeColorClass = result.result === '大凶'
                            ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                            : result.result === '凶'
                              ? 'bg-slate-500 text-white shadow-sm'
                              : 'bg-green-600 text-white shadow-lg shadow-green-600/20';

                          return (
                            <div key={palaceNum} className={`p-6 rounded-3xl border transition-all duration-500 hover:shadow-xl ${resultColorClass}`}>
                              <div className="flex justify-between items-center mb-5 border-b border-theme-border/30 pb-4">
                                <h3 className="text-xl font-bold tracking-tight">
                                  {result.palaceName}
                                  {isCenter && <span className="text-[10px] opacity-40 ml-2 font-normal">(寄宮)</span>}
                                </h3>
                                <div className={`px-4 py-1.5 rounded-full text-sm font-black tracking-widest shadow-md ${badgeColorClass}`}>
                                  {result.result}
                                </div>
                              </div>

                              <div className="space-y-4">
                                {result.details.map((detail, idx) => (
                                  <div key={idx} className="text-base font-serif opacity-80 flex items-start gap-3 leading-relaxed">
                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current opacity-30 flex-shrink-0"></span>
                                    {detail}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
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
        </div>
      )}
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
