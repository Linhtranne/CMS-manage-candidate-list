import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const appRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: true
  },
  resolve: {
    alias: {
      '@': path.resolve(appRoot, './src'),
      '@cms/contracts': path.resolve(appRoot, '../../packages/contracts/src/index.ts')
    }
  }
});
