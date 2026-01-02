import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { createHash, type BinaryLike } from 'node:crypto';
import { basename, resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

function generateVersionPlugin(): Plugin {
  return {
    name: 'generate-version',
    buildStart() {
      const getGitHash = () => {
        try {
          return execSync('git rev-parse --short HEAD').toString().trim();
        } catch {
          return 'dev';
        }
      };

      const version = {
        version: process.env.npm_package_version ?? '1.0.0',
        gitHash: getGitHash(),
      };

      const outputPath = resolve(__dirname, 'public/version.json');
      writeFileSync(outputPath, JSON.stringify(version, null, 2));
    },
  };
}

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
