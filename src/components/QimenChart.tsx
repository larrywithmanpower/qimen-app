import React from 'react';
import type { PalaceData } from '../hooks/useQiMen';

interface QimenChartProps {
  palaces: Record<number, PalaceData>;
  selectedPalaces: number[];
  onPalaceClick: (palaceNum: number) => void;
}

const QimenChart: React.FC<QimenChartProps> = ({ palaces, selectedPalaces, onPalaceClick }) => {
  // 九宮格位置對應的宮位號碼 (1-9)
  // Grid layout (3x3):
  // 4 (巽) | 9 (離) | 2 (坤)
  // 3 (震) | 5 (中) | 7 (兌)
  // 8 (艮) | 1 (坎) | 6 (乾)
  const gridMapping = [
    4, 9, 2, // Row 1
    3, 5, 7, // Row 2
    8, 1, 6  // Row 3
  ];

  return (
    <div className="grid grid-cols-3 gap-0.5 border-2 border-slate-700 bg-slate-900 rounded-lg overflow-hidden shadow-2xl w-full max-w-3xl mx-auto">
      {gridMapping.map((palaceNum) => {
        const palace = palaces[palaceNum];
        // Palace 5 is Center
        const isCenter = palaceNum === 5;
        const isSelected = selectedPalaces.includes(palaceNum);

        return (
          <PalaceCell
            key={palaceNum}
            data={palace}
            isCenter={isCenter}
            isSelected={isSelected}
            onClick={() => onPalaceClick(palaceNum)}
          />
        );
      })}
    </div>
  );
};

const PalaceCell: React.FC<{
  data: PalaceData;
  isCenter: boolean;
  isSelected: boolean;
  onClick: () => void;
}> = ({ data, isCenter, isSelected, onClick }) => {
  if (!data) return <div className="border border-slate-700 bg-slate-800"></div>;

  return (
    <button
      onClick={onClick}
      className={`relative border min-h-[110px] sm:min-h-[180px] p-1 sm:p-3 flex flex-col items-center justify-between transition-all w-full
        ${isCenter ? 'bg-slate-800/80' : 'bg-slate-800/50 hover:bg-slate-700/80'}
        ${isSelected
          ? 'border-yellow-400 ring-2 ring-yellow-400/50 z-10 scale-[1.02] shadow-[0_0_15px_rgba(250,204,21,0.3)]'
          : 'border-slate-700 hover:border-slate-500'
        }
      `}
    >
      {/* Background/Watermark Name (Top Left or Subtle) */}
      <div className={`absolute top-1 left-1 text-[10px] font-mono ${isSelected ? 'text-yellow-300 font-bold' : 'text-slate-600'}`}>
        {data.name}
      </div>

      {/* Top Section: God (Left) & Star (Right) */}
      <div className="w-full flex justify-between items-start px-1 mt-1 sm:mt-2">
        <div className="text-[10px] sm:text-sm text-amber-200/80 writing-vertical-rl" style={{ writingMode: 'vertical-rl' }}>
          {data.god}
        </div>
        <div className="text-[10px] sm:text-sm text-emerald-200/80 writing-vertical-rl" style={{ writingMode: 'vertical-rl' }}>
          {data.star}
        </div>
      </div>

      {/* Center Section: Stems & Door */}
      <div className="flex flex-col items-center justify-center flex-1 gap-0.5 sm:gap-1 py-1 sm:py-2">
        {/* Heaven Stem */}
        <div className="text-sm sm:text-lg font-bold text-sky-300 leading-none">
          {data.heavenStem}
        </div>

        {/* Door - Most Prominent */}
        <div className={`text-xl sm:text-3xl font-black leading-tight tracking-wider my-0.5 sm:my-1 drop-shadow-md ${isSelected ? 'text-yellow-400 animate-pulse' : 'text-amber-400'}`}>
          {data.door}
        </div>

        {/* Earth Stem */}
        <div className="text-sm sm:text-lg font-bold text-orange-200/80 leading-none">
          {data.earthStem}
        </div>
      </div>
    </button>
  );
};

export default QimenChart;
