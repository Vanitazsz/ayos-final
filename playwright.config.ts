import { defineConfig, devices } from '@playwright/test';

const localSupabaseUrl = process.env.SUPABASE_URL ?? 'https://qsurouiyvisykjkgjqmz.supabase.co';
const localSupabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? 'local-playwright-key';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'test-results/playwright-report' }]],
  outputDir: 'test-results/playwright',
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'mobile-web-chromium',
      testMatch: '**/mobile-e2e/*.spec.ts',
      use: { ...devices['Pixel 7'], baseURL: 'http://localhost:8081' },
    },
  ],
  webServer: [
    {
      command: 'pnpm start:web --port 8081',
      url: 'http://localhost:8081/landing',
      env: {
        EXPO_PUBLIC_SUPABASE_URL: localSupabaseUrl,
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: localSupabaseKey,
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
