import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Loader2, ChevronDown, Copy, Check, Image as ImageIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { fetchMasterAnalysis } from '../services/aiService';
import { useHistory } from '../context/HistoryContext';
import { exportElementAsImage } from '../utils/exportImage';
import { motion } from 'framer-motion';

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
  predefinedResult
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(predefinedResult || null);
  const [isExpanded, setIsExpanded] = useState(predefinedResult ? true : false);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const { addHistoryEntry } = useHistory();

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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const text = await fetchMasterAnalysis(
        userQuestion || '',
        palaceData,
        result,
        controller.signal
      );
      setAiResult(text);
      setIsExpanded(true);

      // Save to history
      addHistoryEntry({
        date: palaceData.date || new Date().toISOString(), // Fallback if not provided
        question: userQuestion || '',
        palaceNum,
        palaceName,
        aiResult: text,
        palaceData,
        resultScore: result
      });
    } catch (error: any) {
      console.error(error);
      const errorMsg = error.message || "大師目前忙線中，請稍後再試。";
      setAiResult(`⚠️ ${errorMsg}`);
      setIsExpanded(true);
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
        <h3 className="text-xl font-bold tracking-tight">
          {palaceName}
          {isCenter && <span className="text-[10px] opacity-40 ml-2 font-normal">(寄宮)</span>}
        </h3>
        <div className={`px-4 py-1.5 rounded-full text-sm font-black tracking-widest shadow-md ${badgeColorClass}`}>
          {result}
        </div>
      </div>

      <div className="space-y-4 mb-6 flex-grow">
        {details.map((detail, idx) => (
          <div key={idx} className="text-base font-serif opacity-80 flex items-start gap-3 leading-relaxed">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current opacity-30 flex-shrink-0"></span>
            {detail}
          </div>
        ))}
      </div>

      {userQuestion && (
        <div className="mt-auto border-t border-theme-border/30 pt-4">
          {isLoading ? (
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
                <div ref={resultRef} className="bg-theme-bg/50 rounded-2xl p-5 border border-theme-accent/10 mt-2">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-theme-accent text-sm font-bold">
                      <Sparkles size={14} />
                      <span>大師智慧解析</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="text-theme-primary/40 hover:text-theme-accent transition-colors p-1.5 rounded-md hover:bg-theme-accent/10 flex items-center gap-1.5 text-[10px] font-bold"
                        title="匯出圖文卡片"
                      >
                        {isExporting ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                        {isExporting ? '正在生成...' : '📸 匯出圖片'}
                      </button>
                      <button
                        onClick={handleCopy}
                        className="text-theme-primary/40 hover:text-theme-accent transition-colors p-1.5 rounded-md hover:bg-theme-accent/10"
                        title="複製解析內容"
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                  <div className="prose prose-sm prose-invert max-w-none text-theme-primary/90 font-serif leading-relaxed max-h-96 overflow-y-auto pr-2 custom-scrollbar">
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
                </div>
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
      )}
    </div>
  );
};

export default AnalysisCard;
