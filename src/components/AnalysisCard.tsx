import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Loader2, ChevronDown, Copy, Check, Image as ImageIcon, Lightbulb } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { fetchMasterAnalysis, AnalysisValidationError } from '../services/aiService';
import { useHistory } from '../context/HistoryContext';
import { useSituation } from '../context/SituationContext';
import { exportElementAsImage } from '../utils/exportImage';
import { motion } from 'framer-motion';
import { triggerSuccessHaptic } from '../utils/haptics';
import TermHelp from './TermHelp';

/** 將 detail 文字中的奇門術語（神/星/門/干、用事宮、宮位得分）自動包上 TermHelp */
function renderDetailWithTerms(detail: string): React.ReactNode {
  // 匹配「（X·Y）」其中 X 是 神/星/門/干
  const TYPE_MAP: Record<string, 'god' | 'star' | 'door' | 'stem'> = {
    '神': 'god', '星': 'star', '門': 'door', '干': 'stem',
  };
  const parts: React.ReactNode[] = [];
  const regex = /（([神星門干])·([^）]+)）/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(detail)) !== null) {
    if (match.index > lastIdx) parts.push(detail.slice(lastIdx, match.index));
    const typeChar = match[1];
    const tierLabel = match[2];
    parts.push(
      <span key={`t-${key++}`}>
        （
        <TermHelp term={TYPE_MAP[typeChar]} iconSize={10}>
          <span className="underline decoration-dotted decoration-theme-primary/30 underline-offset-2">{typeChar}</span>
        </TermHelp>
        ·{tierLabel}）
      </span>
    );
    lastIdx = regex.lastIndex;
  }
  if (lastIdx < detail.length) parts.push(detail.slice(lastIdx));

  // 進一步處理「用事宮 2× 權重」與「宮位得分」關鍵字
  return parts.map((part, i) => {
    if (typeof part !== 'string') return <React.Fragment key={i}>{part}</React.Fragment>;
    const nodes: React.ReactNode[] = [];
    let rest = part;
    const patterns: Array<{ text: string; term: 'mainPalace' | 'weightedScore' | 'score' }> = [
      { text: '用事宮 2× 權重', term: 'weightedScore' },
      { text: '用事宮',         term: 'mainPalace' },
      { text: '宮位得分',       term: 'score' },
    ];
    let cursor = 0;
    while (cursor < rest.length) {
      let matched = false;
      for (const { text, term } of patterns) {
        if (rest.startsWith(text, cursor)) {
          nodes.push(
            <TermHelp key={`k-${i}-${cursor}`} term={term} iconSize={10}>
              <span className="underline decoration-dotted decoration-theme-primary/30 underline-offset-2">{text}</span>
            </TermHelp>
          );
          cursor += text.length;
          matched = true;
          break;
        }
      }
      if (!matched) {
        // 累積非關鍵字字元直到下一個關鍵字
        let nextHit = rest.length;
        for (const { text } of patterns) {
          const idx = rest.indexOf(text, cursor);
          if (idx !== -1 && idx < nextHit) nextHit = idx;
        }
        nodes.push(rest.slice(cursor, nextHit));
        cursor = nextHit;
      }
    }
    return <React.Fragment key={i}>{nodes}</React.Fragment>;
  });
}

interface AnalysisCardProps {
  palaceNum: number;
  palaceName: string;
  result: string;
  details: string[];
  userQuestion?: string;
  isCenter?: boolean;
  resultColorClass: string;
  badgeColorClass: string;
  palaceData: any;
  predefinedResult?: string | null;
  isMainPalace?: boolean;
  /** 一句話白話總結（由 verdictSummary 產生） */
  summary?: string;
  /** 建議行動標籤（主動出擊/謹慎行事/保守應對/暫緩等待） */
  actionTag?: string;
}

const AnalysisCard: React.FC<AnalysisCardProps> = ({
  palaceNum,
  palaceName,
  result,
  details,
  userQuestion,
  isCenter,
  resultColorClass,
  badgeColorClass,
  palaceData,
  predefinedResult,
  isMainPalace = false,
  summary,
  actionTag,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(predefinedResult || null);
  const [isExpanded, setIsExpanded] = useState(predefinedResult ? true : false);
  const [showFallback, setShowFallback] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const { addHistoryEntry } = useHistory();
  const { situationKey } = useSituation();

  // Sync with predefinedResult when it changes (e.g. on restoration)
  useEffect(() => {
    if (predefinedResult) {
      setAiResult(predefinedResult);
      setIsExpanded(true);
    }
  }, [predefinedResult]);

  const handleCopy = async () => {
    if (aiResult) {
      await navigator.clipboard.writeText(aiResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportElementAsImage('qimen-main-report', `奇門鑑定-${palaceName}-${new Date().getTime()}`);
    } catch (error) {
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleAskAI = async () => {
    setIsLoading(true);
    setAiResult(null);
    setShowFallback(false);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const text = await fetchMasterAnalysis({
        question: userQuestion || '',
        palaceData,
        contextKey: situationKey ?? 'general',
        signal: controller.signal,
      });
      setAiResult(text);
      setIsExpanded(true);

      // Save to history
      addHistoryEntry({
        date: palaceData.date || new Date().toISOString(),
        question: userQuestion || '',
        palaceNum,
        palaceName,
        aiResult: text,
        palaceData,
        resultScore: result
      });
    } catch (error: any) {
      console.error(error);
      if (error instanceof AnalysisValidationError) {
        setShowFallback(true);
      } else {
        const errorMsg = error.message || "大師目前忙線中，請稍後再試。";
        setAiResult(`⚠️ ${errorMsg}`);
        setIsExpanded(true);
      }
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isExpanded && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isExpanded, aiResult]);

  return (
    <div className={`p-6 rounded-3xl border transition-all duration-500 hover:shadow-xl flex flex-col ${resultColorClass}`}>
      <div className="flex justify-between items-center mb-5 border-b border-theme-border/30 pb-4">
        <h3 className="text-xl font-bold tracking-tight flex items-baseline gap-2">
          {palaceName}
          {isCenter && <span className="text-[10px] opacity-40 font-normal">(寄宮)</span>}
          {isMainPalace && (
            <TermHelp term="mainPalace">
              <span className="text-[11px] font-black tracking-widest whitespace-nowrap inline-flex items-center gap-0.5">
                <span aria-hidden className="opacity-80">★</span>
                <span>用事宮</span>
              </span>
            </TermHelp>
          )}
        </h3>
        <div className="flex flex-col items-end gap-1">
          <TermHelp term={result as any} placement="end">
            <div className={`px-4 py-1.5 rounded-full text-sm font-black tracking-widest shadow-md ${badgeColorClass}`}>
              {result}
            </div>
          </TermHelp>
          {actionTag && (
            <span className="text-[10px] font-bold text-theme-primary/50 tracking-widest">
              {actionTag}
            </span>
          )}
        </div>
      </div>

      {/* 白話一句話總結（新手最先看到） */}
      {summary && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-5 p-4 rounded-2xl bg-theme-accent/5 border border-theme-accent/20 flex items-start gap-3"
        >
          <Lightbulb size={18} className="text-theme-accent shrink-0 mt-0.5" />
          <p className="text-sm sm:text-base text-theme-primary font-medium leading-relaxed">
            {summary}
          </p>
        </motion.div>
      )}

      <div className="space-y-3 mb-6 flex-grow">
        <div className="text-[10px] font-bold text-theme-primary/40 tracking-widest uppercase flex items-center gap-2">
          四元素詳細分級
          <span className="flex-1 h-px bg-theme-border/30"></span>
          <TermHelp term="redGreen" iconSize={11} />
        </div>
        {details.map((detail, idx) => (
          <div key={idx} className="text-sm sm:text-base font-serif opacity-80 flex items-start gap-3 leading-relaxed">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current opacity-30 flex-shrink-0"></span>
            <span className="flex-1">{renderDetailWithTerms(detail)}</span>
          </div>
        ))}
      </div>

      {userQuestion && (
        <div className="mt-auto border-t border-theme-border/30 pt-4">
          {showFallback ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4 py-8 bg-red-500/5 rounded-2xl border border-red-500/20 w-full mb-4"
            >
              <div className="text-3xl">☁️</div>
              <div className="flex flex-col items-center gap-1 text-center px-4">
                <p className="text-sm font-bold text-red-400 tracking-wide">解盤遭遇干擾，請重試</p>
                <p className="text-xs text-theme-primary/40">天機暫時受阻，稍後再叩問大師</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAskAI}
                className="px-5 py-2 rounded-xl bg-theme-accent/10 border border-theme-accent/20 text-theme-accent text-sm font-bold flex items-center gap-2 hover:bg-theme-accent/20 transition-all"
              >
                <Sparkles size={14} />
                重新叩問
              </motion.button>
            </motion.div>
          ) : isLoading ? (
            <div className="flex flex-col items-center gap-4 py-8 bg-theme-accent/5 rounded-2xl border border-theme-accent/10 w-full animate-in fade-in duration-500 mb-4">
              <div className="relative w-20 h-20">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border-2 border-theme-accent/20 rounded-full border-dashed"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-2 border border-theme-accent/10 rounded-full"
                />
                <div className="absolute inset-0 flex items-center justify-center text-theme-accent">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-2xl font-black"
                  >
                    ☯️
                  </motion.div>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-theme-accent font-bold tracking-widest text-sm animate-pulse">大師正在推演天機...</span>
                <div className="w-48 h-1 bg-theme-accent/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="w-full h-full bg-theme-accent shadow-[0_0_10px_#eab308]"
                  />
                </div>
              </div>
            </div>
          ) : !aiResult || aiResult.startsWith('⚠️') ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAskAI}
              className="w-full py-3 px-4 rounded-xl bg-theme-accent/10 border border-theme-accent/20 text-theme-accent font-bold flex items-center justify-center gap-2 hover:bg-theme-accent/20 transition-all group mb-4"
            >
              <Sparkles size={18} className="group-hover:scale-110 transition-transform" />
              <span>{aiResult?.startsWith('⚠️') ? '✨ 重新詢問大師' : '✨ 詢問大師解析'}</span>
            </motion.button>
          ) : (
            <div className="space-y-2">
              <div
                className={`overflow-hidden transition-all duration-700 ease-in-out ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}
              >
                <motion.div
                  ref={resultRef}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onAnimationComplete={() => {
                    if (isExpanded) triggerSuccessHaptic();
                  }}
                  className="bg-theme-bg/50 rounded-2xl p-5 border border-theme-accent/10 mt-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex flex-wrap items-center gap-2 text-theme-accent text-sm font-bold">
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-theme-accent/5 border border-theme-accent/10">
                        <Sparkles size={14} />
                        <span>大師智慧解析</span>
                      </div>
                      {isMainPalace && (
                        <span className="px-2 py-1 rounded-lg bg-theme-accent/20 text-[10px] animate-pulse border border-theme-accent/30 shadow-glow-sm">✨ 心動之宮</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="text-theme-primary/40 hover:text-theme-accent transition-all p-2 rounded-xl hover:bg-theme-accent/10 flex items-center gap-1.5 text-xs font-bold border border-transparent hover:border-theme-accent/20 active:scale-95 disabled:opacity-50"
                        title="匯出圖文卡片"
                      >
                        {isExporting ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
                        <span className="hidden sm:inline">{isExporting ? '正在生成...' : '匯出圖片'}</span>
                      </button>
                      <button
                        onClick={handleCopy}
                        className="text-theme-primary/40 hover:text-theme-accent transition-all p-2 rounded-xl hover:bg-theme-accent/10 flex items-center gap-1.5 text-xs font-bold border border-transparent hover:border-theme-accent/20 active:scale-95"
                        title="複製解析內容"
                      >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        <span className="hidden sm:inline">複製文字</span>
                      </button>
                    </div>
                  </div>
                  <div className="prose prose-sm prose-invert max-w-none text-theme-primary/90 font-serif leading-relaxed max-h-96 overflow-y-auto pr-2 custom-scrollbar ios-smooth-scroll no-scrollbar">
                    <ReactMarkdown
                      components={{
                        strong: ({ node, ...props }) => <span className="text-theme-accent font-bold" {...props} />,
                        h3: ({ node, ...props }) => <h3 className="text-lg font-bold text-theme-primary mt-4 mb-2 border-b border-theme-border/30 pb-1" {...props} />,
                        ul: ({ node, ...props }) => <ul className="list-disc pl-4 space-y-1 my-2 opacity-90" {...props} />,
                        li: ({ node, ...props }) => <li className="marker:text-theme-accent" {...props} />,
                        p: ({ node, ...props }) => <p className="mb-2" {...props} />,
                      }}
                    >
                      {aiResult || ''}
                    </ReactMarkdown>
                  </div>
                </motion.div>
              </div>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full text-xs text-theme-primary/40 flex items-center justify-center gap-1 hover:text-theme-primary transition-colors py-1"
              >
                <ChevronDown size={14} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                {isExpanded ? '收合解析' : '展開 AI 解析結果'}
              </button>
            </div>
          )}
        </div>
      )
      }
    </div >
  );
};

export default AnalysisCard;
