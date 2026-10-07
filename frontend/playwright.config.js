import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:5173'
const port = new URL(baseURL).port || '5173'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  timeout: 90000,
  expect: { timeout: 10000 },
  reporter: 'list',
  use: {
    baseURL,
    ...devices['Desktop Chrome'],
    screenshot: 'off',
    trace: 'off',
    video: 'off',
  },
  webServer: {
    command: `npm run dev -- --host 0.0.0.0 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120000,
  },
})