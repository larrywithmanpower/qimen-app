import { z } from 'zod';

export const GeminiResponseSchema = z.string().min(50, '回應內容過短，可能為異常輸出');

export type GeminiResponse = z.infer<typeof GeminiResponseSchema>;

// Legacy JSON structure schema (for future structured output migration)
export const AnalysisResponseSchema = z.object({
  successRate: z.number().min(0).max(100),
  riskIndex: z.number().min(0).max(100),
  suggestions: z.array(z.string()),
  summary: z.string(),
});

export type AnalysisResponse = z.infer<typeof AnalysisResponseSchema>;
