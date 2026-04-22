import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles } from 'lucide-react';

interface ComparisonResultProps {
  result: string;
  onReset: () => void;
}

const ComparisonResult: React.FC<ComparisonResultProps> = ({ result, onReset }) => {
  return (
    <div className="bg-theme-card/30 rounded-3xl border border-theme-accent/20 p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-theme-accent/10 text-theme-accent">
          <Sparkles size={20} />
        </div>
        <h3 className="text-xl font-bold">大師綜合比對建議</h3>
        <button
          onClick={onReset}
          className="ml-auto text-xs text-theme-primary/30 hover:text-theme-primary"
        >
          重新比對
        </button>
      </div>
      <div className="prose prose-invert max-w-none text-theme-primary/90 font-serif leading-relaxed ios-smooth-scroll no-scrollbar overflow-y-auto max-h-[60vh]">
        <ReactMarkdown
          components={{
            strong: ({ node: _node, ...props }) => <span className="text-theme-accent font-bold" {...props} />,
            h3: ({ node: _node, ...props }) => <h3 className="text-xl font-bold text-theme-primary mt-6 mb-3 border-b border-theme-border/30 pb-2" {...props} />,
            ul: ({ node: _node, ...props }) => <ul className="list-disc pl-5 space-y-2 my-4" {...props} />,
            p: ({ node: _node, ...props }) => <p className="mb-4" {...props} />,
          }}
        >
          {result}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default ComparisonResult;
