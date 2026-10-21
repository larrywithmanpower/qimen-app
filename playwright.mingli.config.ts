import { defineConfig, devices } from 'playwright/test';

// 命理 App 畫面測試：獨立 port 5180，一律 headless
const port = 5180;

export default defineConfig({
  testDir: './e2e/mingli',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    headless: true,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], headless: true } }],
  webServer: {
    command: `npx vite --port ${port} --strictPort`,
    url: `http://localhost:${port}/`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
