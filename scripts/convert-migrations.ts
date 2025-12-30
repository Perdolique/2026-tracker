#!/usr/bin/env node
/* eslint-disable eslint/no-console -- CLI script needs console output */

/**
 * Convert Drizzle migrations to Wrangler D1 format
 * Drizzle: drizzle/TIMESTAMP_NAME/migration.sql
 * Wrangler: drizzle/migrations/NNNN_name.sql
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const DRIZZLE_DIR = './drizzle'
const WRANGLER_MIGRATIONS_DIR = './drizzle/migrations'

// Ensure migrations dir exists
if (!existsSync(WRANGLER_MIGRATIONS_DIR)) {
  mkdirSync(WRANGLER_MIGRATIONS_DIR, { recursive: true })
}

// Get existing wrangler migrations to determine next number
const existingMigrations = existsSync(WRANGLER_MIGRATIONS_DIR)
  ? readdirSync(WRANGLER_MIGRATIONS_DIR).filter(file => file.endsWith('.sql'))
  : []

const getNextNumber = () => {
  if (existingMigrations.length === 0) {return 1}
  const numbers = existingMigrations.map(file => Number.parseInt(file.split('_')[0], 10))
  return Math.max(...numbers) + 1
}

// Find drizzle migration folders (TIMESTAMP_NAME format)
const drizzleFolders = readdirSync(DRIZZLE_DIR)
  .filter(folder => {
    try {
      const stat = readdirSync(join(DRIZZLE_DIR, folder))
      return /^\d{14}_/.test(folder) && stat.includes('migration.sql')
    } catch {
      return false
    }
  })
  .toSorted()

// Track which drizzle migrations already converted
const convertedFile = join(WRANGLER_MIGRATIONS_DIR, '.converted')
const converted = existsSync(convertedFile)
  ? new Set(readFileSync(convertedFile, 'utf8').split('\n').filter(Boolean))
  : new Set()

let nextNum = getNextNumber()
const newlyConverted: string[] = []

for (const folder of drizzleFolders) {
  if (converted.has(folder)) {
    // Already converted, skip
  } else {
    const sqlPath = join(DRIZZLE_DIR, folder, 'migration.sql')
    if (existsSync(sqlPath)) {
      // Extract name from folder (remove timestamp)
      const name = folder.replace(/^\d{14}_/, '').replaceAll('_', '-')
      const wranglerName = `${String(nextNum).padStart(4, '0')}_${name}.sql`

      // Read and clean SQL (remove drizzle markers)
      let sql = readFileSync(sqlPath, 'utf8')
      sql = sql.replaceAll(/--> statement-breakpoint\n?/g, '\n')

      writeFileSync(join(WRANGLER_MIGRATIONS_DIR, wranglerName), sql)
      console.log(`✓ ${folder} → ${wranglerName}`)

      newlyConverted.push(folder)
      nextNum += 1
    }
  }
}

// Update converted tracker
if (newlyConverted.length > 0) {
  const allConverted = [...converted, ...newlyConverted]
  writeFileSync(convertedFile, allConverted.join('\n'))
  console.log(`\nConverted ${newlyConverted.length} migration(s)`)
} else {
  console.log('No new migrations to convert')
}
