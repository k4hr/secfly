import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './apps/ground-control/e2e',
  use: { baseURL: 'http://127.0.0.1:4300' },
  webServer: [
    {
      command: 'corepack pnpm --filter @secfly/simulator dev',
      url: 'http://127.0.0.1:4102/health',
      reuseExistingServer: true,
    },
    {
      command: 'corepack pnpm --filter @secfly/ground-control exec next dev -p 4300',
      url: 'http://127.0.0.1:4300',
      reuseExistingServer: true,
    },
  ],
});
