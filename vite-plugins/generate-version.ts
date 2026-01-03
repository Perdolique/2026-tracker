import type { Plugin } from 'vite'
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

interface VersionInfo {
  version: string;
  gitHash: string;
}

function getGitHash() {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'dev'
  }
}

function getPackageVersion() {
  try {
    const filePath = new URL('../package.json', import.meta.url)

    const packageJson = JSON.parse(
      readFileSync(filePath, 'utf8')
    )

    return packageJson.version ?? '?.?.?'
  } catch {
    return '?.?.?'
  }
}

export function generateVersionPlugin(): Plugin {
  return {
    name: 'generate-version',

    generateBundle() {
      const version : VersionInfo = {
        version: getPackageVersion(),
        gitHash: getGitHash(),
      }

      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify(version, null, 2),
      })
    },

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/version.json') {
          const version : VersionInfo = {
            version: `${getPackageVersion()}-dev`,
            gitHash: getGitHash(),
          }
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(version, null, 2))
          return
        }

        next()
      })
    },
  }
}
