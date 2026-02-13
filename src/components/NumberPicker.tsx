import React from 'react';
import { motion } from 'framer-motion';
import { triggerLightHaptic } from '../utils/haptics';

interface NumberPickerProps {
  onSelect: (num: number) => void;
}

const NumberPicker: React.FC<NumberPickerProps> = ({ onSelect }) => {
  const numbers = [
    [4, 9, 2],
    [3, 5, 7],
    [8, 1, 6]
  ];

  const handleSelect = (num: number) => {
    triggerLightHaptic();
    onSelect(num);
  };

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 20 }
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-md mx-auto p-4 animate-in fade-in zoom-in duration-500">
      <div className="text-center space-y-2">
        <h3 className="text-2xl sm:text-3xl font-black text-theme-primary tracking-tight">請感應心動之數</h3>
        <p className="text-theme-primary/50 text-sm italic">屏氣凝神，直覺選取一個數字進行起卦</p>
      </div>

      <motion.div
        variants={containerVariants as any}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-3 gap-4 w-full aspect-square"
      >
        {numbers.flat().map((num) => (
          <motion.button
            key={num}
            variants={itemVariants as any}
            whileHover={{ scale: 1.05, backgroundColor: "rgba(var(--color-accent-rgb), 0.15)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSelect(num)}
            className="flex items-center justify-center text-3xl sm:text-4xl font-black rounded-3xl bg-theme-card border border-theme-border/50 text-theme-primary shadow-xl hover:border-theme-accent/50 hover:text-theme-accent transition-colors"
          >
            {num}
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
};

export default NumberPicker;
