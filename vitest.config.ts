import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['src/**/__tests__/*.test.ts'],
    exclude: ['**/__tests__/*.browser.test.ts', 'node_modules/**'],
  }
});
