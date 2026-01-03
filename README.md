# 2026 Tracker 🎯

Mobile-first task tracker for 2026 goals with three completion types.

## Features

- **📅 Daily tasks** — Track completing N days total (e.g., 300/365 days)
- **📊 Progress tasks** — Accumulate values toward a goal (e.g., 1M steps)
- **✅ One-time tasks** — Single completion actions
- **🎮 Check-in wizard** — Daily review of all active tasks one-by-one
- **🏆 Completed section** — Track achieved goals separately
- **🔐 Twitch OAuth** — Login via Twitch account
- **🔗 Public profiles** — Share your progress via `/user/:userId` link
- **📱 PWA support** — Install as standalone app, works offline

## Tech Stack

### Frontend

- Vue 3 + Composition API + TypeScript
- Pinia for state management
- Vue Router 4 for SPA navigation
- vue-i18n for internationalization (en/ru)
- CSS Modules (no frameworks)
- Vitest for testing
- Vite + Rolldown for blazing fast builds
- vite-plugin-pwa for PWA support
- oxlint for linting
- husky for git hooks

### Backend

- Cloudflare Workers (serverless)
- Hono (web framework)
- D1 (SQLite database)
- Drizzle ORM
- Valibot (validation)

## Development

```bash
# Install dependencies
pnpm install

# Start Vite dev server (frontend only)
pnpm run dev

# Start Cloudflare Worker locally (full stack)
pnpm run dev:worker

# Build for production
pnpm run build

# Deploy to Cloudflare
pnpm run deploy

# Preview production build
pnpm run preview

# Run unit tests
pnpm run test

# Run browser tests (Playwright)
pnpm run test:browser

# Run tests with UI
pnpm run test:ui

# Run tests in watch mode
pnpm run test:watch

# Lint code
pnpm run lint

# Lint and auto-fix
pnpm run lint:fix

# Update all dependencies to latest versions
pnpm run update:all
```

### Database Commands

```bash
# Generate migrations and convert to wrangler format
pnpm run db:generate

# Apply migrations to local D1 database
pnpm run db:migrate

# Apply migrations to production D1
pnpm run db:migrate:prod

# Open Drizzle Studio to browse database
pnpm run db:studio
```

### Environment Variables

For local development, copy a `.env.example` to a `.env` file and set your Twitch credentials:

```bash
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret
```

For production, set secrets via Wrangler:

```bash
wrangler secret put TWITCH_CLIENT_ID
wrangler secret put TWITCH_CLIENT_SECRET
```

Get Twitch credentials at https://dev.twitch.tv/console

## Project Structure

```text
src/
├── api/           # API client (ky-based)
├── components/    # Reusable Vue components
├── composables/   # Vue composables (useLocale, etc.)
├── locales/       # i18n translations (en.ts, ru.ts)
├── models/        # TypeScript interfaces/types
│   └── __tests__/ # Unit tests
├── stores/        # Pinia stores (task-store, auth-store)
├── views/         # Page components (routed)
│   └── __tests__/ # Browser tests
├── router/        # Vue Router config
├── App.vue        # Root component
└── main.ts        # Entry point
worker/
├── index.ts       # Hono app entry point (API + OAuth)
└── db/
    ├── schema.ts  # Drizzle schema (users, sessions, tasks)
    └── queries.ts # DB query functions
drizzle/           # Generated SQL migrations
```

See [AGENTS.md](AGENTS.md) for AI coding agent instructions.
