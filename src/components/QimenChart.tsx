import React from 'react';
import type { PalaceData } from '../hooks/useQiMen';
import { getElementMeta } from '../utils/analysis';
import type { ElementType } from '../utils/analysis';
import { Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QimenChartProps {
  palaces: Record<number, PalaceData>;
  selectedPalaces: number[];
  onPalaceClick: (palaceNum: number) => void;
  isRevealed?: boolean;
  mainSelectedNum?: number | null;
}

const QimenChart: React.FC<QimenChartProps> = ({
  palaces,
  selectedPalaces,
  onPalaceClick,
  isRevealed = true,
  mainSelectedNum = null
}) => {
  const gridMapping = [
    4, 9, 2, // Row 1
    3, 5, 7, // Row 2
    8, 1, 6  // Row 3
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1
      }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-3 gap-px border-2 border-theme-border bg-theme-border rounded-xl overflow-hidden shadow-2xl w-full max-w-3xl mx-auto ring-1 ring-theme-border"
    >
      {gridMapping.map((palaceNum) => {
        const palace = palaces[palaceNum];
        return (
          <PalaceCell
            key={palaceNum}
            data={palace}
            isCenter={palaceNum === 5}
            isSelected={selectedPalaces.includes(palaceNum)}
            isMainSelected={mainSelectedNum === palaceNum}
            isRevealed={isRevealed}
            onClick={() => onPalaceClick(palaceNum)}
          />
        );
      })}
    </motion.div>
  );
};

const PalaceCell: React.FC<{
  data: PalaceData;
  isCenter: boolean;
  isSelected: boolean;
  isMainSelected: boolean;
  isRevealed: boolean;
  onClick: () => void;
}> = ({ data, isCenter, isSelected, isMainSelected, isRevealed, onClick }) => {
  if (!data) return <div className="bg-theme-bg"></div>;

  // 依七層分級對應不同視覺強度：
  //  +3 大吉 → 最強紅光；+2 吉 → 中強；+1 小吉 → 微光
  //   0 中性 → 維持 baseColor
  //  -1 小凶 → 微綠；-2 凶 → 中強；-3 大凶 → 最強綠光
  const getStatusColor = (type: ElementType, value: string, baseColor: string) => {
    if (!isRevealed) return baseColor;
    const { score } = getElementMeta(type, value);
    switch (score) {
      case 3:
        return 'text-red-500 font-bold drop-shadow-[0_0_6px_rgba(239,68,68,0.6)]';
      case 2:
        return 'text-red-500 font-semibold drop-shadow-[0_0_3px_rgba(239,68,68,0.45)]';
      case 1:
        return 'text-red-400 drop-shadow-[0_0_1px_rgba(239,68,68,0.3)]';
      case -1:
        return 'text-green-400 drop-shadow-[0_0_1px_rgba(34,197,94,0.3)]';
      case -2:
        return 'text-green-500 font-semibold drop-shadow-[0_0_3px_rgba(34,197,94,0.45)]';
      case -3:
        return 'text-green-500 font-bold drop-shadow-[0_0_6px_rgba(34,197,94,0.6)]';
      default:
        return baseColor;
    }
  };

  // 強度 2 以上才做呼吸動畫，避免弱吉凶也瘋狂閃爍
  const isStrong = (type: ElementType, value: string) => {
    return Math.abs(getElementMeta(type, value).score) >= 2;
  };

  // 大吉/大凶才套用最強烈的光暈框
  const isExtreme = (type: ElementType, value: string) => {
    return Math.abs(getElementMeta(type, value).score) >= 3;
  };

  const getDoorDirection = (value: string): 'positive' | 'negative' | 'neutral' => {
    const { score } = getElementMeta('door', value);
    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'neutral';
  };

  const cellVariants = {
    hidden: { opacity: 0, scale: 0.96, y: 12 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { type: "spring", damping: 20, stiffness: 80 } as any
    }
  };

  const symbolVariants = {
    hidden: { opacity: 0, scale: 0.85 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.4, ease: "easeOut" } as any
    }
  };

  return (
    <motion.button
      variants={cellVariants}
      onClick={onClick}
      className={`palace-cell-btn relative min-h-[125px] sm:min-h-[200px] p-2 sm:p-5 flex flex-col items-center justify-between transition-all w-full outline-none group overflow-hidden
        ${isCenter ? 'bg-theme-card/95' : 'bg-theme-card/70 hover:bg-theme-card/90'}
        ${isSelected
          ? 'z-20 bg-theme-accent/10 ring-2 ring-inset ring-theme-accent shadow-[inset_0_0_20px_rgba(var(--color-accent-rgb),0.1)]'
          : ''
        }
        ${isMainSelected && isRevealed ? 'ring-4 ring-theme-accent shadow-[0_0_30px_rgba(var(--color-accent-rgb),0.4)] z-30' : ''}
      `}
      whileHover={isRevealed ? { scale: 0.98 } : {}}
      whileTap={isRevealed ? { scale: 0.95 } : {}}
    >
      {/* Mask Layer */}
      <AnimatePresence>
        {!isRevealed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-theme-bg/40 backdrop-blur-xl flex flex-col items-center justify-center pointer-events-none"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-theme-accent/20 animate-pulse"></div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 用事宮 外層呼吸光環 */}
      {isMainSelected && isRevealed && (
        <motion.div
          aria-hidden
          className="absolute inset-0 pointer-events-none rounded-[inherit]"
          initial={{ opacity: 0 }}
          animate={{
            boxShadow: [
              '0 0 0 0 rgba(var(--color-accent-rgb), 0.55), inset 0 0 24px rgba(var(--color-accent-rgb), 0.18)',
              '0 0 36px 4px rgba(var(--color-accent-rgb), 0.35), inset 0 0 30px rgba(var(--color-accent-rgb), 0.28)',
              '0 0 0 0 rgba(var(--color-accent-rgb), 0.55), inset 0 0 24px rgba(var(--color-accent-rgb), 0.18)',
            ],
            opacity: 1,
          }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* 頂部標籤：用事宮時顯示功能徽章，否則顯示宮位名 */}
      {isMainSelected && isRevealed ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25, type: 'spring', stiffness: 220 }}
          className="absolute top-1 left-1/2 -translate-x-1/2 z-40 px-2 py-0.5 rounded-full bg-theme-accent text-theme-bg text-[9px] sm:text-[10px] font-black tracking-widest shadow-[0_0_10px_rgba(var(--color-accent-rgb),0.55)] whitespace-nowrap"
        >
          ★ 用事宮
        </motion.div>
      ) : (
        <div className={`absolute top-1 left-1/2 -translate-x-1/2 text-xs sm:text-base font-semibold opacity-30 select-none transition-opacity group-hover:opacity-50 whitespace-nowrap ${isSelected ? 'text-theme-accent opacity-60' : 'text-theme-primary'}`}>
          {data.name}
        </div>
      )}

      {isSelected && !isMainSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-1.5 right-1.5 text-theme-accent shadow-glow"
        >
          <Check size={14} strokeWidth={3} />
        </motion.div>
      )}

      <div className="w-full flex justify-between items-start px-0.5 mt-1">
        <motion.div
          variants={symbolVariants}
          animate={(isRevealed && isStrong('god', data.god)) ? { opacity: [0.6, 1, 0.6] } : {}}
          transition={{ repeat: Infinity, duration: 2.5 }}
          className={`text-sm sm:text-xl writing-vertical-rl transition-colors ${getStatusColor('god', data.god, 'text-theme-primary/80')} ${!isRevealed && 'blur-sm opacity-10'}`}
          style={{ writingMode: 'vertical-rl' }}
          aria-label={`奇門遁甲 - ${data.god}(神) - ${getElementMeta('god', data.god).tierLabel}`}
        >
          {data.god}
        </motion.div>
        <motion.div
          variants={symbolVariants}
          animate={(isRevealed && isStrong('star', data.star)) ? { opacity: [0.6, 1, 0.6] } : {}}
          transition={{ repeat: Infinity, duration: 3 }}
          className={`text-sm sm:text-xl writing-vertical-rl transition-colors ${getStatusColor('star', data.star, 'text-theme-primary/80')} ${!isRevealed && 'blur-sm opacity-10'}`}
          style={{ writingMode: 'vertical-rl' }}
          aria-label={`奇門遁甲 - ${data.star}(星) - ${getElementMeta('star', data.star).tierLabel}`}
        >
          {data.star}
        </motion.div>
      </div>

      <div className="flex flex-col items-center justify-center flex-1 gap-1 py-1">
        <motion.div
          variants={symbolVariants}
          className={`text-xl sm:text-3xl font-bold leading-none ${getStatusColor('stem', data.heavenStem, 'text-sky-400')} ${!isRevealed && 'blur-sm opacity-10'}`}
        >
          {data.heavenStem}
        </motion.div>

        <motion.div
          variants={symbolVariants}
          className={`flex items-center justify-center text-3xl sm:text-5xl font-black leading-none my-1 transition-transform group-hover:scale-105 ${getStatusColor('door', data.door, 'text-cyan-500')}
            ${isRevealed && isExtreme('door', data.door) && getDoorDirection(data.door) === 'positive' ? 'red-indicator-breathing rounded-2xl px-4 py-2' : ''}
            ${isRevealed && isExtreme('door', data.door) && getDoorDirection(data.door) === 'negative' ? 'green-indicator-breathing rounded-2xl px-4 py-2' : ''}
            ${isSelected ? 'ring-2 ring-theme-accent ring-offset-4 ring-offset-theme-card' : ''}
            ${isMainSelected && isRevealed ? 'scale-110' : ''}
            ${!isRevealed && 'blur-lg opacity-10'}
          `}
          aria-label={`奇門遁甲 - ${data.door}(門) - ${getElementMeta('door', data.door).tierLabel}`}
        >
          <motion.span
            className="flex items-center justify-center"
            animate={(isRevealed && isStrong('door', data.door)) ? (
              getDoorDirection(data.door) === 'positive'
                ? { textShadow: ['0 0 4px rgba(239,68,68,0)', '0 0 14px rgba(239,68,68,0.45)', '0 0 4px rgba(239,68,68,0)'] }
                : { textShadow: ['0 0 4px rgba(34,197,94,0)', '0 0 14px rgba(34,197,94,0.45)', '0 0 4px rgba(34,197,94,0)'] }
            ) : {}}
            transition={{ repeat: Infinity, duration: 3 }}
          >
            {data.door}
          </motion.span>
        </motion.div>

        <motion.div
          variants={symbolVariants}
          className={`text-base sm:text-xl font-bold text-theme-primary/50 leading-none ${!isRevealed && 'blur-sm opacity-10'}`}
        >
          {data.earthStem}
        </motion.div>
      </div>
    </motion.button>
  );
};

export default QimenChart;
