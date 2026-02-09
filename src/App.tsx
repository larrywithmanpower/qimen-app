import React, { useState, useEffect } from 'react';
import { useQiMen } from './hooks/useQiMen';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import QimenChart from './components/QimenChart';
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
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8 flex flex-col items-center">
      <header className="mb-12 text-center w-full max-w-md">
        <h1 className="text-4xl font-bold text-amber-200 mb-6">奇門遁甲排盤</h1>

        <div className="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700 space-y-4">
          <div className="flex flex-col gap-4">

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setIsAutoMode(true);
                  setSelectedDate(new Date());
                  setSelectedPalaces([]);
                }}
                className={`flex-1 py-2 px-4 rounded-lg transition-all font-medium border ${isAutoMode
                  ? 'bg-amber-500 text-slate-900 border-amber-500 shadow-md'
                  : 'bg-slate-700/50 text-slate-400 border-slate-600 hover:text-slate-200 hover:bg-slate-700'
                  }`}
              >
                現在時間
              </button>

              <button
                ref={manualButtonRef}
                onClick={handleManualClick}
                className={`flex-1 py-2 px-4 rounded-lg transition-all font-medium border ${!isAutoMode
                  ? 'bg-amber-500 text-slate-900 border-amber-500 shadow-md'
                  : 'bg-slate-700/50 text-slate-400 border-slate-600 hover:text-slate-200 hover:bg-slate-700'
                  }`}
              >
                自行輸入
              </button>
            </div>

            <div
              ref={wrapperRef}
              className={`flex items-center justify-center gap-4 p-3 rounded-lg border transition-colors ${!isAutoMode ? 'bg-slate-700/50 border-amber-500/50 ring-2 ring-amber-500/20' : 'bg-slate-700/30 border-slate-600/50'
                }`}
            >
              <button
                onClick={handleManualClick}
                className={`p-2 rounded-full hover:bg-slate-600/50 transition-colors ${isAutoMode ? "text-slate-500" : "text-amber-400"}`}
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
                  className={`bg-transparent border-none focus:ring-0 outline-none font-mono text-base sm:text-lg w-full text-center ${isAutoMode ? 'text-slate-400 pointer-events-none' : 'text-amber-100 cursor-pointer'}`}
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
                    <div className="flex items-center justify-between px-4 h-[50px] bg-slate-900 box-border">
                      <button
                        onClick={decreaseMonth}
                        disabled={prevMonthButtonDisabled}
                        type="button"
                        className="p-2 hover:bg-slate-700 rounded-full text-amber-500 transition-colors disabled:opacity-50"
                      >
                        <ChevronLeft size={20} />
                      </button>

                      <span className="text-amber-500 font-bold text-lg">
                        {format(date, "MMMM yyyy", { locale: zhTW })}
                      </span>

                      <button
                        onClick={increaseMonth}
                        disabled={nextMonthButtonDisabled}
                        type="button"
                        className="p-2 hover:bg-slate-700 rounded-full text-amber-500 transition-colors disabled:opacity-50"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  )}
                >
                  <div className="border-t border-slate-700 p-2 flex justify-end bg-slate-900">
                    <button
                      onClick={() => {
                        if (datePickerRef.current) {
                          datePickerRef.current.setOpen(false);
                        }
                      }}
                      className="bg-amber-500 text-slate-900 px-4 py-1 rounded font-bold hover:bg-amber-400 transition-colors text-sm"
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

            <section className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex justify-center">
              <QimenChart
                palaces={qimenData.palaces}
                selectedPalaces={selectedPalaces}
                onPalaceClick={handlePalaceClick}
              />
            </section>

            {/* Analysis Results */}
            {selectedPalaces.length > 0 && (
              <section className="grid gap-4 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-bold text-amber-100 mb-2 flex items-center gap-2">
                  <span className="w-1 h-8 bg-amber-500 rounded-full inline-block"></span>
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

                    return (
                      <div key={palaceNum} className={`p-4 rounded-xl border ${result.result === '大凶' ? 'bg-red-900/20 border-red-700/50' : result.result === '凶' ? 'bg-slate-800 border-slate-700' : 'bg-green-900/20 border-green-700/50'}`}>
                        <div className="flex justify-between items-start mb-3 border-b border-slate-700/50 pb-2">
                          <h3 className="text-lg font-bold text-slate-200">
                            {result.palaceName}
                            {isCenter && <span className="text-xs text-slate-400 ml-2">(寄宮)</span>}
                          </h3>
                          <div className={`px-3 py-1 rounded text-sm font-bold ${result.result === '大凶' ? 'bg-red-500 text-white shadow-red-500/20 shadow-lg' :
                            result.result === '凶' ? 'bg-slate-600 text-slate-300' :
                              'bg-green-500 text-white shadow-green-500/20 shadow-lg'
                            }`}>
                            {result.result}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {result.details.map((detail, idx) => (
                            <div key={idx} className="text-sm font-mono text-slate-300 flex items-center gap-2">
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
          <div className="text-center text-slate-400">計算中...</div>
        )}
      </main>
    </div >
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex flex-col items-center justify-center shadow-md">
      <span className="text-slate-400 text-sm mb-1">{label}</span>
      <span className="text-amber-100 text-xl font-bold">{value}</span>
    </div>
  );
}

export default App;
