import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Isolated servers with AI keys blanked so E2E runs deterministically on the mock pipeline.
  webServer: {
    command: 'npx concurrently "vite --port 5174 --strictPort" "node server/index.js"',
    env: { PORT: '5055', FAL_KEY: '', FASHN_API_KEY: '', OPENAI_API_KEY: '', GEMINI_API_KEY: '' },
    url: 'http://localhost:5174',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
