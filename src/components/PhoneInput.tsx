import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Smartphone, ArrowRight } from 'lucide-react';
import { palaceFromPhone } from '../utils/palaceFromInput';
import { triggerLightHaptic, triggerWarningHaptic } from '../utils/haptics';

interface PhoneInputProps {
  onSubmit: (palace: number, rawInput: string) => void;
  onBack: () => void;
}

const PALACE_NAMES: Record<number, string> = {
  1: '坎一', 2: '坤二', 3: '震三', 4: '巽四', 5: '中五',
  6: '乾六', 7: '兌七', 8: '艮八', 9: '離九',
};

const PhoneInput: React.FC<PhoneInputProps> = ({ onSubmit, onBack }) => {
  const [phone, setPhone] = useState('');
  const digits = phone.replace(/\D/g, '');
  const hasEnough = digits.length >= 4;
  const previewPalace = hasEnough ? palaceFromPhone(phone) : null;

  const handleSubmit = () => {
    if (!hasEnough) {
      triggerWarningHaptic();
      return;
    }
    triggerLightHaptic();
    onSubmit(palaceFromPhone(phone), phone);
  };

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-md mx-auto p-4 animate-in fade-in zoom-in duration-500">
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 rounded-2xl bg-theme-accent/10 text-theme-accent mb-2">
          <Smartphone size={28} />
        </div>
        <h3 className="text-2xl sm:text-3xl font-black text-theme-primary tracking-tight">手機號起卦</h3>
        <p className="text-theme-primary/50 text-sm italic">輸入完整號碼，取末位為用事宮</p>
      </div>

      <div className="w-full space-y-4">
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          placeholder="例：0912345678"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          className="w-full px-5 py-4 rounded-2xl bg-theme-card border-2 border-theme-border/50 focus:border-theme-accent/70 focus:ring-2 focus:ring-theme-accent/20 text-theme-primary text-2xl font-mono tracking-widest text-center outline-none transition-all"
          aria-label="手機號碼輸入"
        />

        {hasEnough && previewPalace && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-theme-accent/5 border border-theme-accent/20 rounded-2xl p-4 text-center"
          >
            <div className="text-[10px] font-bold text-theme-accent/70 uppercase tracking-widest mb-1">
              取末位 {digits[digits.length - 1]} → 用事宮
            </div>
            <div className="text-2xl font-black text-theme-accent">
              {PALACE_NAMES[previewPalace]}
            </div>
          </motion.div>
        )}
      </div>

      <div className="flex gap-3 w-full">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-xl bg-theme-card border border-theme-border text-theme-primary/70 font-bold hover:border-theme-primary/30 transition-colors"
        >
          返回
        </button>
        <motion.button
          whileHover={hasEnough ? { scale: 1.02 } : {}}
          whileTap={hasEnough ? { scale: 0.98 } : {}}
          onClick={handleSubmit}
          disabled={!hasEnough}
          className="flex-[2] py-3 rounded-xl bg-theme-accent text-theme-bg font-black text-lg shadow-xl shadow-theme-accent/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          起卦推演
          <ArrowRight size={18} />
        </motion.button>
      </div>
    </div>
  );
};

export default PhoneInput;
