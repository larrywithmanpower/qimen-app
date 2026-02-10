import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Loader2, ChevronDown, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { fetchMasterAnalysis } from '../services/aiService';

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
}

const AnalysisCard: React.FC<AnalysisCardProps> = ({
  palaceName,
  result,
  details,
  userQuestion,
  isCenter,
  resultColorClass,
  badgeColorClass,
  palaceData
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    if (aiResult) {
      await navigator.clipboard.writeText(aiResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAskAI = async () => {
    setIsLoading(true);
    setAiResult(null);
    try {
      const text = await fetchMasterAnalysis(
        userQuestion || '',
        palaceData,
        result
      );
      setAiResult(text);
      setIsExpanded(true);
    } catch (error) {
      console.error(error);
      setAiResult("⚠️ 大師目前忙線中，請稍後再試。");
      setIsExpanded(true);
    } finally {
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
          {!aiResult ? (
            <button
              onClick={handleAskAI}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-theme-accent/10 border border-theme-accent/20 text-theme-accent font-bold flex items-center justify-center gap-2 hover:bg-theme-accent/20 transition-all group disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>大師分析中...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} className="group-hover:scale-110 transition-transform" />
                  <span>✨ 詢問大師解析</span>
                </>
              )}
            </button>
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
                    <button
                      onClick={handleCopy}
                      className="text-theme-primary/40 hover:text-theme-accent transition-colors p-1 rounded-md hover:bg-theme-accent/10"
                      title="複製解析內容"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
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
