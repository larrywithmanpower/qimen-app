import React, { useState, useEffect } from 'react';
import { useQiMen } from './hooks/useQiMen';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import QimenChart from './components/QimenChart';
import ThemeSwitcher from './components/ThemeSwitcher';
import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { zhTW } from 'date-fns/locale/zh-TW';
import { analyzePalace } from './utils/analysis';

// Register locale
registerLocale('zh-TW', zhTW);

function App() {
  const [isAutoMode, setIsAutoMode] = useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const manualButtonRef = React.useRef<HTMLButtonElement>(null);
  const datePickerRef = React.useRef<DatePicker>(null);
  const [selectedPalaces, setSelectedPalaces] = useState<number[]>([]);

  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date();
  });

  // Auto-update time effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isAutoMode) {
      const updateTime = () => {
        setSelectedDate(new Date());
      };
      updateTime(); // Update immediately
      interval = setInterval(updateTime, 1000);
    }
    return () => clearInterval(interval);
  }, [isAutoMode]);

  // Click outside handler - REMOVED to prevent unwanted mode switching
  // Users should explicitly click "Current Time" to switch back.
  // The date picker handles its own closing via internal logic.

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

  const qimenData = useQiMen(selectedDate);

  return (
    <div className="min-h-screen bg-theme-bg text-theme-primary p-8 flex flex-col items-center transition-colors duration-300">
      <div className="w-full max-w-4xl flex justify-end mb-4">
        <ThemeSwitcher />
      </div>
      <header className="mb-12 text-center w-full max-w-md">
        <h1 className="text-4xl font-bold text-theme-primary mb-6 opacity-90">奇門遁甲排盤</h1>

        <div className="bg-theme-card p-6 rounded-xl shadow-lg border border-theme-border space-y-4">
          <div className="flex flex-col gap-4">

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setIsAutoMode(true);
                  setSelectedDate(new Date());
                  setSelectedPalaces([]);
                }}
                className={`flex-1 py-2 px-4 rounded-lg transition-all font-medium border ${isAutoMode
                  ? 'bg-theme-primary text-theme-bg border-theme-primary shadow-md'
                  : 'bg-theme-bg/50 text-theme-primary/60 border-theme-border hover:text-theme-primary hover:bg-theme-bg'
                  }`}
              >
                現在時間
              </button>

              <button
                ref={manualButtonRef}
                onClick={handleManualClick}
                className={`flex-1 py-2 px-4 rounded-lg transition-all font-medium border ${!isAutoMode
                  ? 'bg-theme-primary text-theme-bg border-theme-primary shadow-md'
                  : 'bg-theme-bg/50 text-theme-primary/60 border-theme-border hover:text-theme-primary hover:bg-theme-bg'
                  }`}
              >
                自行輸入
              </button>
            </div>

            <div
              ref={wrapperRef}
              className={`flex items-center justify-center gap-4 p-3 rounded-lg border transition-colors ${!isAutoMode ? 'bg-theme-bg/50 border-theme-primary/50 ring-2 ring-theme-primary/20' : 'bg-theme-bg/30 border-theme-border/50'
                }`}
            >
              <button
                onClick={handleManualClick}
                className={`p-2 rounded-full hover:bg-theme-bg/50 transition-colors ${isAutoMode ? "text-theme-primary/40" : "text-theme-primary"}`}
                title="點擊開啟日期選擇器"
              >
                <Calendar size={24} />
              </button>

              <div className="flex-1 text-center relative">
                <DatePicker
                  ref={datePickerRef}
                  selected={selectedDate}
                  onChange={(date: Date | null) => {
                    if (date) {
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
                  className={`bg-transparent border-none focus:ring-0 outline-none font-mono text-base sm:text-lg w-full text-center ${isAutoMode ? 'text-theme-primary/40 pointer-events-none' : 'text-theme-primary cursor-pointer'}`}
                  readOnly={isAutoMode}
                  disabled={isAutoMode}
                  popperPlacement="bottom"
                  shouldCloseOnSelect={false}
                  renderCustomHeader={({
                    date,
                    decreaseMonth,
                    increaseMonth,
                    prevMonthButtonDisabled,
                    nextMonthButtonDisabled,
                  }) => (
                    <div className="flex items-center justify-between px-4 h-[50px] bg-theme-bg box-border">
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
        </div>
      </header >

      <main className="w-full max-w-4xl">
        {qimenData ? (
          <div className="space-y-6">
            <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <InfoCard label="節氣" value={qimenData.solarTerm} />
              <InfoCard label="遁甲" value={qimenData.isYang ? '陽遁' : '陰遁'} />
              <InfoCard label="局數" value={`${qimenData.juNumber} 局`} />
              <InfoCard label="旬首" value={qimenData.xunShou} />
              <InfoCard label="值符" value={qimenData.zhiFu} />
              <InfoCard label="值使" value={qimenData.zhiShi} />
            </section>

            <section className="bg-theme-card rounded-xl p-4 border border-theme-border flex justify-center shadow-inner overflow-x-auto">
              <QimenChart
                palaces={qimenData.palaces}
                selectedPalaces={selectedPalaces}
                onPalaceClick={handlePalaceClick}
              />
            </section>

            {/* Analysis Results */}
            {selectedPalaces.length > 0 && (
              <section className="grid gap-4 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-bold text-theme-primary mb-2 flex items-center gap-2">
                  <span className="w-1 h-8 bg-theme-accent rounded-full inline-block"></span>
                  吉凶分析
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedPalaces.map(palaceNum => {
                    const isCenter = palaceNum === 5;
                    const targetPalaceNum = isCenter ? 2 : palaceNum;
                    const data = qimenData.palaces[targetPalaceNum];

                    if (!data) return null;

                    const analysisData = isCenter ? { ...data, name: "中五 (寄坤二)" } : data;
                    const result = analyzePalace(palaceNum, analysisData);

                    const resultColorClass = result.result === '大凶'
                      ? 'bg-red-500/20 border-red-700/50 text-red-100'
                      : result.result === '凶'
                        ? 'bg-theme-card border-theme-border text-theme-primary'
                        : 'bg-green-500/20 border-green-700/50 text-green-100';

                    const badgeColorClass = result.result === '大凶'
                      ? 'bg-red-600'
                      : result.result === '凶'
                        ? 'bg-theme-border text-theme-primary/70'
                        : 'bg-green-600';

                    return (
                      <div key={palaceNum} className={`p-4 rounded-xl border ${resultColorClass} shadow-md`}>
                        <div className="flex justify-between items-start mb-3 border-b border-theme-border/50 pb-2">
                          <h3 className="text-lg font-bold">
                            {result.palaceName}
                            {isCenter && <span className="text-xs opacity-60 ml-2">(寄宮)</span>}
                          </h3>
                          <div className={`px-3 py-1 rounded text-sm font-bold text-white shadow-lg ${badgeColorClass}`}>
                            {result.result}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {result.details.map((detail, idx) => (
                            <div key={idx} className="text-sm font-mono opacity-80 flex items-center gap-2">
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
          <div className="text-center text-theme-primary/50">計算中...</div>
        )}
      </main>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-theme-card p-4 rounded-lg border border-theme-border flex flex-col items-center justify-center shadow-md transition-shadow hover:shadow-lg">
      <span className="text-theme-primary/60 text-sm mb-1">{label}</span>
      <span className="text-theme-primary text-xl font-bold">{value}</span>
    </div>
  );
}

export default App;
