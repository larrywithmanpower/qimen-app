import React from 'react';
import type { PalaceData } from '../hooks/useQiMen';
import { getElementStatus } from '../utils/analysis';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';

interface QimenChartProps {
  palaces: Record<number, PalaceData>;
  selectedPalaces: number[];
  onPalaceClick: (palaceNum: number) => void;
}

const QimenChart: React.FC<QimenChartProps> = ({ palaces, selectedPalaces, onPalaceClick }) => {
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
    </motion.div>
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
      className={`palace-cell-btn relative min-h-[125px] sm:min-h-[200px] p-2 sm:p-5 flex flex-col items-center justify-between transition-all w-full outline-none group
        ${isCenter ? 'bg-theme-card/95' : 'bg-theme-card/70 hover:bg-theme-card/90'}
        ${isSelected
          ? 'z-20 bg-theme-accent/10 ring-2 ring-inset ring-theme-accent shadow-[inset_0_0_20px_rgba(var(--color-accent-rgb),0.1)]'
          : ''
        }
      `}
      whileHover={{ scale: 0.98 }}
      whileTap={{ scale: 0.95 }}
    >
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
          animate={isImportant('god', data.god) ? { opacity: [0.6, 1, 0.6] } : {}}
          transition={{ repeat: Infinity, duration: 2.5 }}
          className={`text-sm sm:text-xl writing-vertical-rl transition-colors ${getStatusColor('god', data.god, 'text-theme-primary/80')}`}
          style={{ writingMode: 'vertical-rl' }}
        >
          {data.god}
        </motion.div>
        <motion.div
          variants={symbolVariants}
          animate={isImportant('star', data.star) ? { opacity: [0.6, 1, 0.6] } : {}}
          transition={{ repeat: Infinity, duration: 3 }}
          className={`text-sm sm:text-xl writing-vertical-rl transition-colors ${getStatusColor('star', data.star, 'text-theme-primary/80')}`}
          style={{ writingMode: 'vertical-rl' }}
        >
          {data.star}
        </motion.div>
      </div>

      <div className="flex flex-col items-center justify-center flex-1 gap-1 py-1">
        <motion.div
          variants={symbolVariants}
          className={`text-xl sm:text-3xl font-bold leading-none ${getStatusColor('stem', data.heavenStem, 'text-sky-400')}`}
        >
          {data.heavenStem}
        </motion.div>

        <motion.div
          variants={symbolVariants}
          className={`text-3xl sm:text-5xl font-black leading-tight tracking-[0.15em] my-1 drop-shadow-xl transition-transform group-hover:scale-105 ${getStatusColor('door', data.door, 'text-cyan-500')} ${isSelected && 'drop-shadow-[0_0_8px_rgba(var(--color-accent-rgb),0.3)]'}`}
        >
          <motion.span
            animate={isImportant('door', data.door) ? {
              textShadow: ["0 0 4px rgba(239,68,68,0)", "0 0 12px rgba(239,68,68,0.35)", "0 0 4px rgba(239,68,68,0)"]
            } : {}}
            transition={{ repeat: Infinity, duration: 3 }}
          >
            {data.door}
          </motion.span>
        </motion.div>

        <motion.div
          variants={symbolVariants}
          className="text-base sm:text-xl font-bold text-theme-primary/50 leading-none"
        >
          {data.earthStem}
        </motion.div>
      </div>
    </motion.button>
  );
};

export default QimenChart;
