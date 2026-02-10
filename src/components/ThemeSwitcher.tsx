import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun, Leaf } from 'lucide-react';

const ThemeSwitcher: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 rounded-full bg-theme-card border border-theme-border text-theme-primary hover:scale-110 transition-all duration-300 shadow-lg group overflow-hidden"
      title={`切換主題 (目前: ${theme === 'dark' ? '玄冥黑' : theme === 'light' ? '宣紙白' : '青鸞綠'})`}
    >
      <div className="relative z-10">
        {theme === 'dark' && <Moon size={20} className="animate-in fade-in zoom-in duration-300" />}
        {theme === 'light' && <Sun size={20} className="animate-in fade-in zoom-in duration-300" />}
        {theme === 'emerald' && <Leaf size={20} className="animate-in fade-in zoom-in duration-300" />}
      </div>

      {/* Subtle background glow effect */}
      <div className="absolute inset-0 bg-theme-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </button>
  );
};

export default ThemeSwitcher;
