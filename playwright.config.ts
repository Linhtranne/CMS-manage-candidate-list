import { defineConfig, devices } from '@playwright/test';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function findLocalChromium() {
  const root = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'ms-playwright') : undefined;
  if (!root || !existsSync(root)) return undefined;
  const versions = readdirSync(root).filter((name) => /^chromium-\d+$/.test(name)).sort().reverse();
  for (const version of versions) {
    const executable = join(root, version, 'chrome-win64', 'chrome.exe');
    if (existsSync(executable)) return executable;
  }
  return undefined;
}

const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH ?? findLocalChromium();
const webPort = Number(process.env.PLAYWRIGHT_WEB_PORT ?? 3001);
const webHost = process.env.PLAYWRIGHT_HOST ?? '127.0.0.1';
const baseURL = `http://${webHost}:${webPort}`;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    launchOptions: executablePath ? { executablePath } : undefined,
    ...devices['Desktop Chrome']
  },
  webServer: {
    command: `npm --prefix apps/web run dev -- --hostname ${webHost} --port ${webPort}`,
    url: `${baseURL}/api/health`,
    // Existing UI contract tests are intentionally isolated from infrastructure.
    // Runtime/local Docker uses NEXT_PUBLIC_MSW_ENABLED=false by default.
    env: { NEXT_PUBLIC_MSW_ENABLED: 'true' },
    reuseExistingServer: !process.env.CI || process.env.PLAYWRIGHT_USE_EXISTING_SERVER === 'true',
    timeout: 120_000
  }
});
