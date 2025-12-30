import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  out: './drizzle',
  schema: './worker/db/schema.ts',
  dialect: 'sqlite',
})
