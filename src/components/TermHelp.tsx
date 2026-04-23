import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Info } from 'lucide-react';

/**
 * 奇門術語白話辭典。點 ⓘ 顯示 popover，讓新手秒懂。
 */

type TermKey =
  | 'god' | 'star' | 'door' | 'stem'
  | 'mainPalace' | 'weightedScore' | 'score'
  | '大吉' | '吉' | '平' | '小凶' | '凶' | '大凶'
  | 'redGreen';

interface TermEntry {
  title: string;
  body: string;
}

const TERMS: Record<TermKey, TermEntry> = {
  god: {
    title: '神（八神）',
    body: '代表「神助」維度——做這件事有什麼隱性力量在暗助或暗阻。像是：誰給你貴人運？誰在背後使絆子？',
  },
  star: {
    title: '星（九星）',
    body: '代表「天時」維度——當下的時機好壞。星旺則事成，星衰則事敗。',
  },
  door: {
    title: '門（八門）',
    body: '代表「人和」維度——你採取的行動方式是否恰當。門是八個主題：開、休、生、傷、杜、景、死、驚，每個門有專屬的吉凶能量。',
  },
  stem: {
    title: '干（天干）',
    body: '代表當下可用的資源或阻礙。乙丙丁稱「三奇」，是最有力的助緣；庚癸則多為阻力。',
  },
  mainPalace: {
    title: '用事宮',
    body: '你所問之事對應的核心宮位，是整個盤面的主角。用事宮的權重被放大 2 倍，其他宮位只做輔助參考。',
  },
  weightedScore: {
    title: '加權分',
    body: '用事宮的原始分數 × 2。用來凸顯「這件事核心是吉是凶」，避免被旁宮拉低整體判斷。',
  },
  score: {
    title: '宮位得分',
    body: '四個元素（神/星/門/干）各自分級後加總，範圍 -12 ~ +12。分數越高，事情越順；越低，阻礙越大。',
  },
  '大吉': {
    title: '大吉（+3）',
    body: '七層分級中最高等級，代表該元素在此宮是最有力的助緣。例：值符、開門、生門、天心、天輔、乙、丙、丁。',
  },
  '吉': {
    title: '吉（+2）',
    body: '正向助力但不及大吉。例：六合、天禽、休門。',
  },
  '平': {
    title: '平（0）',
    body: '中性，吉凶交錯。這個局面有利有弊，要謹慎行事。',
  },
  '小凶': {
    title: '小凶（-1）',
    body: '輕微阻力，不致命但要留心。例：天英、杜門、辛、壬。',
  },
  '凶': {
    title: '凶（-2）',
    body: '明顯阻力，建議保守應對。例：螣蛇、天柱、驚門、傷門、庚、癸。',
  },
  '大凶': {
    title: '大凶（-3）',
    body: '七層分級中最低等級，強烈負向能量。例：白虎、玄武、朱雀、勾陳、天蓬、天芮、死門。',
  },
  redGreen: {
    title: '紅吉綠凶',
    body: '九宮奇門的核心心法：不用背術語，看顏色就能斷吉凶。紅字符號 → 可找對應的人事物與方法；綠字符號 → 避開或化解。',
  },
};

interface TermHelpProps {
  term: TermKey;
  /** 顯示文字；若不給則只顯示 ⓘ icon */
  children?: React.ReactNode;
  /** icon 大小 */
  iconSize?: number;
  className?: string;
  /** @deprecated 已改為自動以按鈕為中心並鉗制視口，此 prop 保留以避免破壞呼叫端 */
  placement?: 'auto' | 'start' | 'end';
}

const TermHelp: React.FC<TermHelpProps> = ({ term, children, iconSize = 12, className = '' }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; width: number }>({ left: 0, top: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const entry = TERMS[term];

  // 點外側關閉（含 tooltip 本身，這樣內部可點）
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        (buttonRef.current && buttonRef.current.contains(target)) ||
        (tooltipRef.current && tooltipRef.current.contains(target))
      ) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // 開啟時計算 tooltip 視口座標，鉗制在可視範圍內
  useEffect(() => {
    if (!open || !buttonRef.current) return;

    const compute = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const margin = 8;
      const desiredWidth = vw >= 640 ? 320 : 288;  // sm 斷點
      const width = Math.min(desiredWidth, vw - margin * 2);

      // 預設對齊：以按鈕中心為目標中心點展開
      let left = rect.left + rect.width / 2 - width / 2;
      // 鉗制到視口邊界內
      left = Math.max(margin, Math.min(left, vw - width - margin));
      const top = rect.bottom + 6;

      setPos({ left, top, width });
    };

    compute();
    window.addEventListener('resize', compute);
    window.addEventListener('scroll', compute, true);
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('scroll', compute, true);
    };
  }, [open]);

  return (
    <span className={`inline ${className}`}>
      {children}
      <button
        ref={buttonRef}
        type="button"
        onClick={e => {
          e.stopPropagation();
          setOpen(v => !v);
        }}
        aria-label={`什麼是 ${entry.title}？`}
        className="inline-flex items-center justify-center text-theme-primary/40 hover:text-theme-accent transition-colors ml-0.5 align-middle"
      >
        <Info size={iconSize} />
      </button>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={tooltipRef}
              role="tooltip"
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'fixed',
                left: `${pos.left}px`,
                top: `${pos.top}px`,
                width: `${pos.width}px`,
              }}
              className="z-[100] bg-theme-bg/95 backdrop-blur-md border-2 border-theme-accent/50 rounded-xl shadow-2xl shadow-black/40 p-3.5 text-left"
            >
              <div className="text-theme-accent text-xs font-black tracking-wider mb-1">
                {entry.title}
              </div>
              <div className="text-theme-primary/85 text-xs leading-relaxed font-sans">
                {entry.body}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </span>
  );
};

export default TermHelp;
