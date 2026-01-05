import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'node:url'
import { createHash, type BinaryLike } from 'node:crypto'
import { basename } from 'node:path'
import { generateVersionPlugin } from './vite-plugins/generate-version'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    generateVersionPlugin(),

    // oxlint-disable-next-line new-cap
    VitePWA({
      devOptions: {
        enabled: true
      },

      registerType: 'prompt',
      injectRegister: null,

      manifest: {
        name: '2026 Tracker',
        short_name: '2026 Tracker',
        description: 'Track your 2026 goals and tasks',
        theme_color: '#1a1a1a',
        background_color: '#1a1a1a',
        display: 'standalone',
        start_url: '/',

        icons: [{
          src: '/pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any'
        }, {
          src: '/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any'
        }]
      }
    })
  ],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },

  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787'
      }
    }
  },

  css: {
    modules: {
      generateScopedName(className: string, filename: string, data: BinaryLike) : string {
        const hash = createHash('sha256')
          .update(data)
          .digest('hex')
          .slice(0, 6)

        const filePath = filename
          .replace(/\.vue(?:\?.+?)?$/u, '')
          .replaceAll(/\[|\]/gu, '')

        const baseName = basename(filePath)

        return `${baseName}_${className}_${hash}`
      }
    }
  }
})
