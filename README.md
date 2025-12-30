# 2026 Tracker 🎯

Mobile-first task tracker for 2026 goals with three completion types.

## Features

- **📅 Daily tasks** — Track completing N days total (e.g., 300/365 days)
- **📊 Progress tasks** — Accumulate values toward a goal (e.g., 1M steps)
- **✅ One-time tasks** — Single completion actions
- **🎮 Check-in wizard** — Daily review of all active tasks one-by-one
- **📦 Archive** — Completed goals move to archive automatically

## Tech Stack

### Frontend

- Vue 3 + Composition API + TypeScript
- Pinia for state management
- Vue Router 4 for SPA navigation
- CSS Modules (no frameworks)
- Vitest for testing
- Vite + Rolldown for blazing fast builds

### Backend

- Cloudflare Workers (serverless)
- Hono (web framework)
- D1 (SQLite database)
- Drizzle ORM
- Valibot (validation)

## Development

```bash
# Install dependencies
npm install

# Start Vite dev server (frontend only)
npm run dev

# Start Cloudflare Worker locally (full stack)
npm run dev:worker

# Build for production
npm run build

# Deploy to Cloudflare
npm run deploy

# Preview production build
npm run preview

# Run unit tests
npm run test

# Run browser tests (Playwright)
npm run test:browser

# Run tests with UI
npm run test:ui

# Run tests in watch mode
npm run test:watch
```

### Database Commands

```bash
# Generate migrations and convert to wrangler format
npm run db:generate

# Apply migrations to local D1 database
npm run db:migrate

# Apply migrations to production D1
npm run db:migrate:prod

# Open Drizzle Studio to browse database
npm run db:studio
```

## Project Structure

```text
src/
├── api/           # API client (fetch-based)
├── components/    # Reusable Vue components
├── models/        # TypeScript interfaces/types
│   └── __tests__/ # Unit tests
├── stores/        # Pinia stores
├── views/         # Page components (routed)
│   └── __tests__/ # Browser tests
├── router/        # Vue Router config
├── App.vue        # Root component
└── main.ts        # Entry point
worker/
├── index.ts       # Hono app entry point
└── db/
    ├── schema.ts  # Drizzle schema
    └── queries.ts # DB query functions
drizzle/           # Generated SQL migrations
```

See [AGENTS.md](AGENTS.md) for AI coding agent instructions.
