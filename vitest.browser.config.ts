import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { playwright } from '@vitest/browser-playwright'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  test: {
    include: ['**/__tests__/*.browser.test.ts'],

    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,

      instances: [{
        browser: 'chromium'
      }],
    },
  },
})
