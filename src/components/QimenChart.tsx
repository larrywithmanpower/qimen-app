import React from 'react';
import type { PalaceData } from '../hooks/useQiMen';
import { getElementStatus } from '../utils/analysis';
import { Check } from 'lucide-react';

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
    <div className="grid grid-cols-3 gap-px border-2 border-theme-border bg-theme-border rounded-xl overflow-hidden shadow-2xl w-full max-w-3xl mx-auto ring-1 ring-theme-border">
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
  if (!data) return <div className="bg-theme-bg"></div>;

  const getStatusColor = (type: 'god' | 'star' | 'door' | 'stem', value: string, baseColor: string) => {
    const status = getElementStatus(type, value);
    if (status === 'auspicious') return 'text-red-500 font-bold drop-shadow-[0_0_1px_rgba(239,68,68,0.5)]';
    if (status === 'ominous') return 'text-green-500 font-bold drop-shadow-[0_0_1px_rgba(34,197,94,0.5)]';
    return baseColor;
  };

  return (
    <button
      onClick={onClick}
      className={`palace-cell-btn relative min-h-[125px] sm:min-h-[200px] p-2 sm:p-5 flex flex-col items-center justify-between transition-all w-full outline-none group
        ${isCenter ? 'bg-theme-card/95' : 'bg-theme-card/70 hover:bg-theme-card/90'}
        ${isSelected
          ? 'z-20 bg-theme-accent/10 ring-2 ring-inset ring-theme-accent shadow-[inset_0_0_20px_rgba(var(--color-accent-rgb),0.1)]'
          : ''
        }
      `}
    >
      {/* Background/Watermark Name - Increased size for better readability */}
      <div className={`absolute top-1 left-1/2 -translate-x-1/2 text-xs sm:text-base font-semibold opacity-30 select-none transition-opacity group-hover:opacity-50 whitespace-nowrap ${isSelected ? 'text-theme-accent opacity-60' : 'text-theme-primary'}`}>
        {data.name}
      </div>

      {/* Selection Indicator (Checkmark) */}
      {isSelected && (
        <div className="absolute top-1.5 right-1.5 text-theme-accent animate-in fade-in zoom-in duration-300">
          <Check size={14} strokeWidth={3} />
        </div>
      )}

      {/* Top Section: God (Left) & Star (Right) */}
      <div className="w-full flex justify-between items-start px-0.5 mt-1">
        <div
          className={`text-sm sm:text-xl writing-vertical-rl transition-colors ${getStatusColor('god', data.god, 'text-theme-primary/80')}`}
          style={{ writingMode: 'vertical-rl' }}
        >
          {data.god}
        </div>
        <div
          className={`text-sm sm:text-xl writing-vertical-rl transition-colors ${getStatusColor('star', data.star, 'text-theme-primary/80')}`}
          style={{ writingMode: 'vertical-rl' }}
        >
          {data.star}
        </div>
      </div>

      {/* Center Section: Stems & Door */}
      <div className="flex flex-col items-center justify-center flex-1 gap-1.5 sm:gap-3 py-1">
        {/* Heaven Stem */}
        <div className={`text-xl sm:text-3xl font-bold leading-none ${getStatusColor('stem', data.heavenStem, 'text-sky-400')}`}>
          {data.heavenStem}
        </div>

        {/* Door - Most Prominent */}
        <div className={`text-3xl sm:text-5xl font-black leading-tight tracking-[0.15em] my-1 drop-shadow-xl transition-transform group-hover:scale-105 ${getStatusColor('door', data.door, 'text-cyan-500')} ${isSelected && 'drop-shadow-[0_0_8px_rgba(var(--color-accent-rgb),0.3)]'}`}>
          {data.door}
        </div>

        {/* Earth Stem */}
        <div className="text-base sm:text-xl font-bold text-theme-primary/50 leading-none">
          {data.earthStem}
        </div>
      </div>
    </button>
  );
};

export default QimenChart;
