import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './apps/ground-control/e2e',
  use: { baseURL: 'http://127.0.0.1:3000' },
  webServer: {
    command: 'corepack pnpm --filter @secfly/ground-control dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: true,
  },
});
