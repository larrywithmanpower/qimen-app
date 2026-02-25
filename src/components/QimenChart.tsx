import React from 'react';
import type { PalaceData } from '../hooks/useQiMen';
import { getElementStatus } from '../utils/analysis';
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

  const getStatusColor = (type: 'god' | 'star' | 'door' | 'stem', value: string, baseColor: string) => {
    if (!isRevealed) return baseColor; // Hide auspicious/ominous colors when masked
    const status = getElementStatus(type, value);
    if (status === 'auspicious') return 'text-red-500 font-bold drop-shadow-[0_0_1px_rgba(239,68,68,0.5)]';
    if (status === 'ominous') return 'text-green-500 font-bold drop-shadow-[0_0_1px_rgba(34,197,94,0.5)]';
    return baseColor;
  };

  const isImportant = (type: 'god' | 'star' | 'door', value: string) => {
    return (getElementStatus(type, value) as string) !== 'normal';
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

      <div className={`absolute top-1 left-1/2 -translate-x-1/2 text-xs sm:text-base font-semibold opacity-30 select-none transition-opacity group-hover:opacity-50 whitespace-nowrap ${isSelected ? 'text-theme-accent opacity-60' : 'text-theme-primary'}`}>
        {data.name}
      </div>

      {isSelected && (
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
          animate={(isRevealed && isImportant('god', data.god)) ? { opacity: [0.6, 1, 0.6] } : {}}
          transition={{ repeat: Infinity, duration: 2.5 }}
          className={`text-sm sm:text-xl writing-vertical-rl transition-colors ${getStatusColor('god', data.god, 'text-theme-primary/80')} ${!isRevealed && 'blur-sm opacity-10'}`}
          style={{ writingMode: 'vertical-rl' }}
          aria-label={`奇門遁甲 - ${data.god}(神) - 吉兆指標`}
        >
          {data.god}
        </motion.div>
        <motion.div
          variants={symbolVariants}
          animate={(isRevealed && isImportant('star', data.star)) ? { opacity: [0.6, 1, 0.6] } : {}}
          transition={{ repeat: Infinity, duration: 3 }}
          className={`text-sm sm:text-xl writing-vertical-rl transition-colors ${getStatusColor('star', data.star, 'text-theme-primary/80')} ${!isRevealed && 'blur-sm opacity-10'}`}
          style={{ writingMode: 'vertical-rl' }}
          aria-label={`奇門遁甲 - ${data.star}(星) - 吉兆指標`}
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
            ${isRevealed && getStatusColor('door', data.door, '').includes('text-red-500') ? 'red-indicator-breathing rounded-2xl px-4 py-2' : ''}
            ${isRevealed && getStatusColor('door', data.door, '').includes('text-green-500') ? 'green-indicator-breathing rounded-2xl px-4 py-2' : ''}
            ${isSelected ? 'ring-2 ring-theme-accent ring-offset-4 ring-offset-theme-card' : ''}
            ${isMainSelected && isRevealed ? 'scale-110' : ''}
            ${!isRevealed && 'blur-lg opacity-10'}
          `}
          aria-label={`奇門遁甲 - ${data.door}(門) - 吉兆指標`}
        >
          <motion.span
            className="flex items-center justify-center"
            animate={(isRevealed && isImportant('door', data.door)) ? {
              textShadow: ["0 0 4px rgba(239,68,68,0)", "0 0 12px rgba(239,68,68,0.35)", "0 0 4px rgba(239,68,68,0)"]
            } : {}}
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
