import { z } from 'zod';

export const AnalysisResponseSchema = z.object({
  successRate: z.number().min(0).max(100),
  riskIndex: z.number().min(0).max(100),
  suggestions: z.array(z.string()),
  summary: z.string(),
});

export type AnalysisResponse = z.infer<typeof AnalysisResponseSchema>;
