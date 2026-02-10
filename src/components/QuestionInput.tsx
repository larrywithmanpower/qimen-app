import React, { useState } from 'react';
import { Sparkles, Briefcase, Coins, Heart, MessageSquare, ArrowRight } from 'lucide-react';

export type QuestionType = 'career' | 'wealth' | 'love' | 'general';

interface QuestionInputProps {
  onStart: (question: string, type: QuestionType) => void;
}

const QuestionInput: React.FC<QuestionInputProps> = ({ onStart }) => {
  const [question, setQuestion] = useState('');

  const quickTypes = [
    { id: 'wealth', label: '求財', icon: <Coins size={20} />, preset: '我想問財運發展', color: 'text-amber-500' },
    { id: 'career', label: '事業', icon: <Briefcase size={20} />, preset: '我想問事業前程', color: 'text-blue-500' },
    { id: 'love', label: '感情', icon: <Heart size={20} />, preset: '我想問感情緣分', color: 'text-red-500' },
  ] as const;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) {
      onStart(question, 'general');
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="text-center mb-10">
        <div className="inline-block p-3 rounded-2xl bg-theme-accent/10 text-theme-accent mb-4">
          <Sparkles size={32} />
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold text-theme-primary mb-3 leading-tight">請於心中默想您的問題</h2>
        <p className="text-theme-primary/60 font-medium">專注於此時此刻的意念，讓奇門遁甲為您解惑</p>
      </div>

      <div className="space-y-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-theme-card p-1 rounded-2xl border border-theme-border shadow-2xl focus-within:ring-2 ring-theme-accent/30 transition-all">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="例如：我最近的事業發展如何？"
              className="w-full h-44 p-6 bg-transparent text-theme-primary text-xl sm:text-2xl resize-none outline-none placeholder:text-theme-primary/10 leading-relaxed font-serif"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={!question.trim()}
            className="w-full py-5 px-8 rounded-2xl bg-theme-primary text-theme-bg font-bold text-xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:grayscale disabled:hover:scale-100 shadow-xl shadow-theme-primary/10 group"
          >
            開始排盤
            <ArrowRight className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="flex justify-center flex-col items-center gap-4">
          <span className="text-xs uppercase tracking-[0.3em] text-theme-primary/30 font-black">
            快速詢問或直接排盤
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
            {quickTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => onStart(type.preset, type.id)}
                className="group flex flex-col items-center gap-3 p-5 rounded-2xl border border-theme-border bg-theme-card hover:border-theme-accent/50 hover:bg-theme-accent/5 transition-all duration-300 shadow-lg hover:shadow-theme-accent/5"
              >
                <div className={`p-3 rounded-xl bg-theme-bg group-hover:scale-110 transition-transform ${type.color}`}>
                  {type.icon}
                </div>
                <span className="font-bold text-theme-primary/70 group-hover:text-theme-primary transition-colors">{type.label}</span>
              </button>
            ))}

            <button
              type="button"
              onClick={() => onStart('', 'general')}
              className="group flex flex-col items-center gap-3 p-5 rounded-2xl border border-dashed border-theme-border bg-transparent hover:border-theme-primary/50 hover:bg-theme-card transition-all duration-300"
            >
              <div className="p-3 rounded-xl bg-theme-card text-theme-primary/40 group-hover:rotate-12 transition-transform">
                <MessageSquare size={20} />
              </div>
              <span className="font-bold text-theme-primary/40 group-hover:text-theme-primary/80 transition-colors">其他/手動</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionInput;
