import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Clock, Smartphone, Cake } from 'lucide-react';
import { triggerLightHaptic } from '../utils/haptics';

export type ChartingMethod = 'intuition' | 'time' | 'phone' | 'birth';

interface MethodSelectorProps {
  onSelect: (method: ChartingMethod) => void;
}

interface MethodCard {
  id: ChartingMethod;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  subtitle: string;
  description: string;
  hint: string;
  featured?: boolean;
}

const METHODS: MethodCard[] = [
  {
    id: 'intuition',
    Icon: Sparkles,
    title: '心動感應起卦',
    subtitle: '憑直覺選 1-9',
    description: '屏氣凝神，天機顯靈',
    hint: '適合：當下靈感、一念之事',
    featured: true,
  },
  {
    id: 'time',
    Icon: Clock,
    title: '時間直出起卦',
    subtitle: '當下時空為盤',
    description: '用事宮由你點選',
    hint: '適合：想看整體盤勢、擇時辨方',
  },
  {
    id: 'phone',
    Icon: Smartphone,
    title: '手機號起卦',
    subtitle: '取尾數定用事宮',
    description: '看人、看事、看運勢',
    hint: '適合：觀察特定人或合作對象',
  },
  {
    id: 'birth',
    Icon: Cake,
    title: '出生日起卦',
    subtitle: '依生日取宮',
    description: '探一生大勢',
    hint: '適合：命盤式長期分析',
  },
];

const MethodSelector: React.FC<MethodSelectorProps> = ({ onSelect }) => {
  const handleClick = (m: ChartingMethod) => {
    triggerLightHaptic();
    onSelect(m);
  };

  const container = {
    hidden: { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { staggerChildren: 0.07, delayChildren: 0.15 },
    },
  };

  const card = {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 240, damping: 22 },
    },
  };

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-3xl mx-auto p-4 animate-in fade-in zoom-in duration-500">
      <div className="text-center space-y-2">
        <h3 className="text-2xl sm:text-3xl font-black text-theme-primary tracking-tight">選擇起卦方式</h3>
        <p className="text-theme-primary/50 text-sm italic">四法任選，各有所感</p>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full"
      >
        {METHODS.map(({ id, Icon, title, subtitle, description, hint, featured }) => (
          <motion.button
            key={id}
            variants={card}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleClick(id)}
            className={`relative group text-left p-5 sm:p-6 rounded-2xl border transition-all shadow-xl overflow-hidden
              ${featured
                ? 'bg-theme-accent/10 border-theme-accent/40 hover:border-theme-accent hover:shadow-[0_0_24px_rgba(var(--color-accent-rgb),0.25)]'
                : 'bg-theme-card border-theme-border/50 hover:border-theme-accent/50 hover:bg-theme-card/90'
              }`}
          >
            {featured && (
              <span className="absolute top-3 right-3 text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full bg-theme-accent text-theme-bg">
                推薦
              </span>
            )}

            <div className="flex items-start gap-4">
              <div className={`shrink-0 p-3 rounded-xl transition-colors
                ${featured ? 'bg-theme-accent/20 text-theme-accent' : 'bg-theme-bg/50 text-theme-primary/70 group-hover:text-theme-accent'}
              `}>
                <Icon size={24} />
              </div>
              <div className="flex-1 space-y-1 min-w-0">
                <div className="flex items-baseline flex-wrap gap-x-2">
                  <h4 className="text-lg font-black text-theme-primary">{title}</h4>
                  <span className="text-xs font-medium text-theme-primary/50">{subtitle}</span>
                </div>
                <p className="text-sm text-theme-primary/80 font-serif leading-relaxed">{description}</p>
                <p className="text-[11px] text-theme-primary/40 pt-1 border-t border-theme-border/30 mt-2">
                  {hint}
                </p>
              </div>
            </div>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
};

export default MethodSelector;
