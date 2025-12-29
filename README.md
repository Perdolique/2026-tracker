# 2026 Tracker 🎯

Mobile-first task tracker for 2026 goals with three completion types.

## Features

- **📅 Daily tasks** — Track completing N days total (e.g., 300/365 days)
- **📊 Progress tasks** — Accumulate values toward a goal (e.g., 1M steps)
- **✅ One-time tasks** — Single completion actions
- **🎮 Check-in wizard** — Daily review of all active tasks one-by-one
- **📦 Archive** — Completed goals move to archive automatically

## Tech Stack

- Vue 3 + Composition API + TypeScript
- Pinia for state management
- Vue Router 4 for SPA navigation
- CSS Modules (no frameworks)
- localStorage for persistence
- Vitest for testing
- Vite + Rolldown for blazing fast builds

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm run test

# Run browser tests (Playwright)
npm run test:browser

# Run tests with UI
npm run test:ui

# Run tests in watch mode
npm run test:watch
```

## Project Structure

```text
src/
├── api/           # localStorage-based API client
├── components/    # Reusable Vue components
├── models/        # TypeScript interfaces/types
│   └── __tests__/ # Unit tests
├── stores/        # Pinia stores
├── views/         # Page components (routed)
│   └── __tests__/ # Browser tests
├── router/        # Vue Router config
├── App.vue        # Root component
└── main.ts        # Entry point
```

See [AGENTS.md](AGENTS.md) for AI coding agent instructions.
