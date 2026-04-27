import React from 'react';
import { Heart, Briefcase, TrendingUp, CloudSun } from 'lucide-react';
import type { SituationKey } from '../../context/SituationContext';

interface CardConfig {
  key: Exclude<SituationKey, null>;
  label: string;
  sub: string;
  Icon: React.FC<{ size?: number; className?: string }>;
  palette: {
    border: string;
    activeBorder: string;
    iconBg: string;
    iconColor: string;
    badge: string;
  };
}

const CARDS: CardConfig[] = [
  {
    key: 'love',
    label: '感情',
    sub: '愛情、桃花、婚姻',
    Icon: Heart,
    palette: {
      border: 'border-pink-900/30',
      activeBorder: 'border-pink-400',
      iconBg: 'bg-pink-500/10',
      iconColor: 'text-pink-400',
      badge: 'bg-pink-500/10 text-pink-300',
    },
  },
  {
    key: 'career',
    label: '事業',
    sub: '貴人、升遷、求職',
    Icon: Briefcase,
    palette: {
      border: 'border-blue-900/30',
      activeBorder: 'border-blue-400',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-400',
      badge: 'bg-blue-500/10 text-blue-300',
    },
  },
  {
    key: 'invest',
    label: '投資',
    sub: '財運、風險、時機',
    Icon: TrendingUp,
    palette: {
      border: 'border-emerald-900/30',
      activeBorder: 'border-emerald-400',
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-400',
      badge: 'bg-emerald-500/10 text-emerald-300',
    },
  },
  {
    key: 'weather',
    label: '氣象',
    sub: '天候、出行、節氣',
    Icon: CloudSun,
    palette: {
      border: 'border-sky-900/30',
      activeBorder: 'border-sky-400',
      iconBg: 'bg-sky-500/10',
      iconColor: 'text-sky-400',
      badge: 'bg-sky-500/10 text-sky-300',
    },
  },
];

interface ContextSelectorProps {
  selected: SituationKey;
  onSelect: (key: Exclude<SituationKey, null>) => void;
}

const ContextSelector: React.FC<ContextSelectorProps> = ({ selected, onSelect }) => {
  return (
    <div className="w-full max-w-lg">
      <p className="text-center text-theme-primary/40 text-sm font-medium mb-6 tracking-widest uppercase">
        選擇您的問題情境
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {CARDS.map(({ key, label, sub, Icon, palette }) => {
          const isActive = selected === key;
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={`relative flex flex-col items-center gap-2 p-3 sm:p-5 rounded-2xl border bg-theme-card transition-all duration-200 cursor-pointer focus:outline-none hover:scale-[1.03] active:scale-[0.97] ${
                isActive
                  ? `${palette.activeBorder} shadow-lg scale-[1.04]`
                  : `${palette.border} hover:border-theme-border`
              }`}
            >
              {isActive && (
                <div
                  className="absolute inset-0 rounded-2xl opacity-10 pointer-events-none bg-current"
                />
              )}
              <div className={`p-2 sm:p-2.5 rounded-xl ${palette.iconBg}`}>
                <Icon size={20} className={palette.iconColor} />
              </div>
              <div className="text-center">
                <div className="text-theme-primary font-bold text-sm sm:text-base">{label}</div>
                <div className="text-theme-primary/40 text-[10px] sm:text-xs mt-0.5 leading-tight">{sub}</div>
              </div>
              {isActive && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-in fade-in zoom-in-75 duration-200 ${palette.badge}`}>
                  已選擇
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ContextSelector;
