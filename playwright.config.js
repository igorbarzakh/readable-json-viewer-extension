import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 15_000,
  fullyParallel: false,
  use: {
    headless: false,
  },
});
