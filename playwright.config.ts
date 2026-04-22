import { defineConfig, devices } from 'playwright/test';

const isCI = !!process.env.CI;
const MOCK_GEMINI = '/api/gemini-mock';
const testPort = isCI ? 4173 : 5174;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? 'github' : 'html',
  use: {
    baseURL: `http://localhost:${testPort}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: isCI
    ? {
        // CI: npm run build 已在獨立步驟完成（含 VITE_GEMINI_PROXY_URL 注入），此處只起 preview
        command: `npx vite preview --port ${testPort} --strictPort`,
        url: `http://localhost:${testPort}`,
        timeout: 30_000,
      }
    : {
        // Local: 啟動 dev server，注入 mock proxy URL
        command: `VITE_GEMINI_PROXY_URL=${MOCK_GEMINI} npx vite --port ${testPort} --strictPort`,
        url: `http://localhost:${testPort}`,
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
