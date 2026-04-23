import React, { useState } from 'react';
import { Sparkles, MessageSquare, ArrowRight } from 'lucide-react';
import { useSituation } from '../context/SituationContext';

export type QuestionType = 'career' | 'wealth' | 'love' | 'general';

interface QuestionInputProps {
  onStart: (question: string, type: QuestionType) => void;
}

// 情境對應的 placeholder 範例
const PLACEHOLDER_BY_SITUATION: Record<'love' | 'career' | 'invest', string> = {
  love: '例如：我最近的感情運勢如何？',
  career: '例如：我最近的事業發展如何？',
  invest: '例如：近期的投資時機是否成熟？',
};

// 情境專屬範例題（點擊後填入輸入框，使用者可再編輯）
const EXAMPLES_BY_SITUATION: Record<'love' | 'career' | 'invest', string[]> = {
  love: [
    '我的桃花運如何？',
    '這段關係能否走到最後？',
    '對方對我的心意如何？',
  ],
  career: [
    '這次升遷機會大嗎？',
    '該不該換工作？',
    '目前的職場貴人在哪？',
  ],
  invest: [
    '近期進場時機合適嗎？',
    '這項投資風險如何？',
    '我的財運走勢如何？',
  ],
};

// situationKey 對應的 QuestionType（讓 onStart 收到正確的類型，而非統一 general）
const TYPE_BY_SITUATION: Record<'love' | 'career' | 'invest', QuestionType> = {
  love: 'love',
  career: 'career',
  invest: 'wealth',
};

const QuestionInput: React.FC<QuestionInputProps> = ({ onStart }) => {
  const [question, setQuestion] = useState('');
  const { situationKey } = useSituation();

  // 理論上進到此元件時 situationKey 必定已選，保底 fallback 為 career
  const sk = situationKey ?? 'career';
  const placeholder = PLACEHOLDER_BY_SITUATION[sk];
  const examples = EXAMPLES_BY_SITUATION[sk];
  const questionType = TYPE_BY_SITUATION[sk];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) {
      onStart(question, questionType);
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
              placeholder={placeholder}
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

        <div className="flex flex-col items-center gap-4">
          <span className="text-xs uppercase tracking-[0.3em] text-theme-primary/30 font-black">
            參考範例
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
            {examples.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setQuestion(example)}
                className="group text-left px-4 py-3 rounded-xl border border-theme-border bg-theme-card/50 hover:border-theme-accent/40 hover:bg-theme-accent/5 transition-all duration-300 shadow-sm"
              >
                <span className="text-sm text-theme-primary/70 group-hover:text-theme-primary transition-colors font-medium leading-snug">
                  {example}
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onStart('', 'general')}
            className="group inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm text-theme-primary/40 hover:text-theme-primary/80 transition-all"
          >
            <MessageSquare size={14} className="group-hover:rotate-12 transition-transform" />
            <span>無特定問題，直接排盤</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestionInput;
