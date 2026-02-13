export interface HistoryEntry {
  id: string;
  timestamp: number; // 儲存紀錄的時間
  date: string; // 排盤的時間 (ISO string)
  question: string;
  palaceNum: number;
  palaceName: string;
  aiResult: string;
  palaceData: any;
  resultScore: string;
}
