import React from 'react';
import { X, Trash2, Clock, History as HistoryIcon, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale/zh-TW';
import { useHistory } from '../context/HistoryContext';
import type { HistoryEntry } from '../types/history';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore: (entry: HistoryEntry) => void;
}

const HistoryDrawer: React.FC<HistoryDrawerProps> = ({ isOpen, onClose, onRestore }) => {
  const { history, deleteHistoryEntry, clearHistory } = useHistory();

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`fixed right-0 top-0 h-full w-full max-w-sm bg-theme-bg border-l border-theme-border z-50 transform transition-transform duration-500 ease-out shadow-2xl flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 border-b border-theme-border flex justify-between items-center bg-theme-card/30">
          <div className="flex items-center gap-2 text-theme-primary">
            <HistoryIcon size={20} className="text-theme-accent" />
            <h2 className="text-xl font-bold">歷史紀錄</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-theme-accent/10 text-theme-primary/40 hover:text-theme-accent transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar p-4 space-y-4">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-theme-primary/20 space-y-4 opacity-50">
              <HistoryIcon size={48} />
              <p className="font-serif italic">尚無歷史紀錄</p>
            </div>
          ) : (
            history.map((entry) => (
              <div
                key={entry.id}
                className="group relative bg-theme-card border border-theme-border rounded-2xl p-4 hover:border-theme-accent/50 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => {
                  onRestore(entry);
                  onClose();
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-theme-primary/30 uppercase tracking-widest">
                    <Clock size={10} />
                    {format(entry.timestamp, 'yyyy/MM/dd HH:mm', { locale: zhTW })}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteHistoryEntry(entry.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-theme-primary/20 hover:text-red-500 hover:bg-red-500/10 transition-all"
                    title="刪除紀錄"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="flex gap-2 items-start">
                  <MessageSquare size={16} className="text-theme-accent mt-1 flex-shrink-0" />
                  <p className="text-sm font-medium text-theme-primary/90 line-clamp-2 leading-relaxed">
                    {entry.question}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between text-[10px]">
                  <span className="px-2 py-0.5 rounded-md bg-theme-accent/5 text-theme-accent border border-theme-accent/10">
                    {entry.palaceName} · {entry.resultScore}
                  </span>
                  <span className="text-theme-primary/30 font-mono">
                    {format(new Date(entry.date), 'HH:mm')} 排盤
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {history.length > 0 && (
          <div className="p-4 border-t border-theme-border bg-theme-card/10">
            <button
              onClick={() => {
                if (window.confirm('確定要清除所有歷史紀錄嗎？')) {
                  clearHistory();
                }
              }}
              className="w-full py-2.5 text-xs font-bold text-theme-primary/30 hover:text-red-500 transition-colors"
            >
              清除所有紀錄
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default HistoryDrawer;
