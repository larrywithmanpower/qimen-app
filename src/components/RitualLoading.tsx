import React from 'react';
import { motion } from 'framer-motion';

interface RitualLoadingProps {
  message?: string;
}

const RitualLoading: React.FC<RitualLoadingProps> = ({ message = "大師正在推演時空局數..." }) => {
  return (
    <div className="w-full py-32 flex flex-col items-center justify-center gap-8 animate-in fade-in duration-500">
      <div className="relative w-24 h-24 sm:w-32 sm:h-32">
        {/* Outer concentric rings */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 border-2 border-theme-accent/20 rounded-full border-dashed"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute inset-4 border border-theme-accent/10 rounded-full"
        />

        {/* Center Bagua */}
        <div className="absolute inset-0 flex items-center justify-center text-theme-accent">
          <motion.div
            animate={{
              scale: [1, 1.15, 1],
              rotate: [0, 360],
              opacity: [0.6, 1, 0.6]
            }}
            transition={{
              scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
              rotate: { duration: 8, repeat: Infinity, ease: "linear" },
              opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" }
            }}
            className="text-5xl sm:text-7xl drop-shadow-[0_0_15px_rgba(234,179,8,0.3)]"
          >
            ☯️
          </motion.div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <motion.span
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-theme-accent font-bold tracking-[0.3em] text-lg sm:text-xl font-serif italic"
        >
          {message}
        </motion.span>

        {/* Progress bar */}
        <div className="w-48 sm:w-64 h-1 bg-theme-accent/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-full h-full bg-gradient-to-r from-transparent via-theme-accent to-transparent shadow-[0_0_10px_#eab308]"
          />
        </div>
      </div>
    </div>
  );
};

export default RitualLoading;
