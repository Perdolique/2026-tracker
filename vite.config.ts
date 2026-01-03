import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { createHash, type BinaryLike } from 'node:crypto'
import { basename } from 'node:path'
import { generateVersionPlugin } from './vite-plugins/generate-version'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), generateVersionPlugin()],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },

  css: {
    modules: {
      generateScopedName(className: string, filename: string, data: BinaryLike) : string {
        const hash = createHash('sha256')
          .update(data)
          .digest('hex')
          .slice(0, 6);

        const filePath = filename
          .replace(/\.vue(?:\?.+?)?$/u, '')
          .replaceAll(/\[|\]/gu, '');

        const baseName = basename(filePath);

        return `${baseName}_${className}_${hash}`;
      }
    }
  }
})
