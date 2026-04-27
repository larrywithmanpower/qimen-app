import React, { useState } from 'react';
import { Sparkles, MessageSquare, ArrowRight, ChevronDown, X, Plus } from 'lucide-react';
import { useSituation } from '../context/SituationContext';
import { usePhrases } from '../context/PhrasesContext';
import type { PhraseKey } from '../context/PhrasesContext';

export type QuestionType = 'career' | 'wealth' | 'love' | 'general';

interface QuestionInputProps {
  onStart: (question: string, type: QuestionType) => void;
}

type SituationSlug = 'love' | 'career' | 'invest' | 'weather';

const PLACEHOLDER_BY_SITUATION: Record<SituationSlug, string> = {
  love: '例如：我最近的感情運勢如何？',
  career: '例如：我最近的事業發展如何？',
  invest: '例如：近期的投資時機是否成熟？',
  weather: '例如：今日天候如何？適合出行嗎？',
};

const EXAMPLES_BY_SITUATION: Record<SituationSlug, string[]> = {
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
  weather: [
    '今日天候如何？',
    '近日是否會有大雨？',
    '週末適合戶外活動嗎？',
  ],
};

const TYPE_BY_SITUATION: Record<SituationSlug, QuestionType> = {
  love: 'love',
  career: 'career',
  invest: 'wealth',
  weather: 'general',
};

const LABEL_BY_SITUATION: Record<SituationSlug, string> = {
  love: '感情',
  career: '事業',
  invest: '投資',
  weather: '氣象',
};

const QuestionInput: React.FC<QuestionInputProps> = ({ onStart }) => {
  const [question, setQuestion] = useState('');
  const [isPhrasesOpen, setIsPhrasesOpen] = useState(false);
  const [newPhrase, setNewPhrase] = useState('');
  const { situationKey } = useSituation();
  const { phrases, addPhrase, deletePhrase } = usePhrases();

  const sk = situationKey ?? 'career';
  const placeholder = PLACEHOLDER_BY_SITUATION[sk];
  const examples = EXAMPLES_BY_SITUATION[sk];
  const questionType = TYPE_BY_SITUATION[sk];

  // 合併當前情境 + 全域自訂話語
  const situationPhrases = phrases[sk as PhraseKey] ?? [];
  const globalPhrases = phrases.global ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) {
      onStart(question, questionType);
    }
  };

  const handleAddPhrase = () => {
    if (!newPhrase.trim()) return;
    addPhrase(sk as PhraseKey, newPhrase);
    setNewPhrase('');
  };

  const handleAddPhraseKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddPhrase();
    }
  };

  const hasPhrases = situationPhrases.length > 0 || globalPhrases.length > 0;

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

        {/* 系統範例 */}
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
        </div>

        {/* 我的常用話語 */}
        <div className="border border-theme-border rounded-2xl overflow-hidden bg-theme-card/30">
          <button
            type="button"
            onClick={() => setIsPhrasesOpen(prev => !prev)}
            className="w-full flex items-center justify-between px-5 py-4 text-theme-primary/60 hover:text-theme-primary transition-colors"
          >
            <div className="flex items-center gap-2">
              <MessageSquare size={15} />
              <span className="text-sm font-semibold tracking-wide">我的常用話語</span>
              {hasPhrases && (
                <span className="text-[10px] bg-theme-accent/15 text-theme-accent px-1.5 py-0.5 rounded-full font-bold">
                  {situationPhrases.length + globalPhrases.length}
                </span>
              )}
            </div>
            <ChevronDown
              size={16}
              className={`transition-transform duration-200 ${isPhrasesOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {isPhrasesOpen && (
            <div className="px-5 pb-5 space-y-4">
              {/* 新增輸入 */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPhrase}
                  onChange={(e) => setNewPhrase(e.target.value)}
                  onKeyDown={handleAddPhraseKeyDown}
                  placeholder="輸入新話語..."
                  className="flex-1 min-w-0 px-4 py-2.5 rounded-xl border border-theme-border bg-theme-bg text-theme-primary text-sm placeholder:text-theme-primary/25 outline-none focus:ring-2 ring-theme-accent/30 transition-all"
                />
                <button
                  type="button"
                  onClick={handleAddPhrase}
                  disabled={!newPhrase.trim()}
                  className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-theme-accent text-theme-bg text-sm font-bold disabled:opacity-30 hover:opacity-90 transition-opacity"
                >
                  <Plus size={14} />
                  確認
                </button>
              </div>

              {/* 當前情境話語 */}
              {situationPhrases.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-theme-primary/30 font-bold">
                    {LABEL_BY_SITUATION[sk]} · 我的
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {situationPhrases.map((phrase, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 group"
                      >
                        <button
                          type="button"
                          onClick={() => setQuestion(phrase)}
                          className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-lg border border-theme-border bg-theme-card/60 hover:border-theme-accent/50 hover:bg-theme-accent/5 transition-all text-sm text-theme-primary/80 hover:text-theme-primary"
                        >
                          <span className="text-[9px] bg-theme-accent/20 text-theme-accent px-1 py-0.5 rounded font-bold leading-none">我的</span>
                          <span className="leading-snug">{phrase}</span>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => { e.stopPropagation(); deletePhrase(sk as PhraseKey, idx); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); deletePhrase(sk as PhraseKey, idx); } }}
                            className="ml-0.5 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all rounded p-0.5"
                          >
                            <X size={11} />
                          </span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 全域話語 */}
              {globalPhrases.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-theme-primary/30 font-bold">全域 · 我的</p>
                  <div className="flex flex-wrap gap-2">
                    {globalPhrases.map((phrase, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 group"
                      >
                        <button
                          type="button"
                          onClick={() => setQuestion(phrase)}
                          className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-lg border border-theme-border bg-theme-card/60 hover:border-theme-accent/50 hover:bg-theme-accent/5 transition-all text-sm text-theme-primary/80 hover:text-theme-primary"
                        >
                          <span className="text-[9px] bg-theme-primary/10 text-theme-primary/50 px-1 py-0.5 rounded font-bold leading-none">我的</span>
                          <span className="leading-snug">{phrase}</span>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => { e.stopPropagation(); deletePhrase('global', idx); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); deletePhrase('global', idx); } }}
                            className="ml-0.5 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all rounded p-0.5"
                          >
                            <X size={11} />
                          </span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!hasPhrases && (
                <p className="text-xs text-theme-primary/30 text-center py-2">尚未新增常用話語，輸入後點確認即可儲存</p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-center">
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
