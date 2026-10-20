import { defineConfig } from 'vitest/config'

// 命理 App 單元測試（排盤、牌序），只收 src/mingli 底下的測試
export default defineConfig({
  test: {
    include: ['src/mingli/**/*.test.ts'],
    environment: 'node',
  },
})
