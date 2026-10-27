import { defineConfig } from 'vitest/config'

// 真 AI 實測專用（會花錢，不在 npm test 裡）：npm run ai-eval
export default defineConfig({
  test: {
    include: ['scripts/**/*.eval.ts'],
    environment: 'node',
    // 依序呼叫、每次間隔 1 秒，一整組要跑很久
    testTimeout: 4 * 60 * 60 * 1000,
    hookTimeout: 60_000,
  },
})
