# AGENTS.md — 2026 Tracker

AI coding agents instructions for this project.

## Project Overview

Mobile-first SPA task tracker with three goal types:

- **Daily tasks** — complete N days total (e.g., 300/365 days)
- **Progress tasks** — accumulate value (e.g., 1,000,000 steps)
- **One-time tasks** — single completion

### Authentication

- **Twitch OAuth** — users login via Twitch
- **Session-based auth** — httpOnly cookies with D1 session storage
- **Public profiles** — users can share their progress via `/user/:userId` link

## Agent Guidelines

### Critical Evaluation

Before implementing any task:

1. **Evaluate rationality** — assess if the requested solution is optimal
2. **Identify alternatives** — if better approaches exist, present them to the user
3. **Flag potential issues** — point out if the proposed solution may cause problems

### Communication Rules

- **Never write praise or compliments** — they add no value
- **Never highlight what's done well** — focus only on issues
- **Report only problems** — identify bugs, edge cases, code smells, architectural concerns
- **Report controversial points** — flag debatable design decisions or unclear requirements
- **Be direct and critical** — challenge assumptions, suggest improvements

The user wants actionable feedback on issues, not positive reinforcement.

### Task Completion

A task is considered complete only when you have personally verified:

- **Functionality works** — tested the implementation
- **Tests pass** — all test suites run successfully
- **No linter errors** — code passes linting checks
- **No type errors** — TypeScript compilation succeeds
- **No runtime issues** — application runs without errors
- **Documentation updated** — AGENTS.md and README.md updated if changes affect them

Do not mark a task as done until you have checked all of these criteria.

### Documentation Maintenance

Keep project documentation up to date when making changes:

- **Update AGENTS.md** when architecture, workflows, or agent guidelines change
- **Update README.md** when commands, features, or tech stack change
- **Keep both files in sync** — if you add/remove/modify commands, update both files
- **Reflect structural changes** — new directories, removed modules, architectural shifts must be documented

Documentation is part of the task — outdated docs are a bug.

Changes that don't require documentation updates:

- Bug fixes that don't change public behavior
- Internal refactoring without architectural impact
- Styling/CSS adjustments
- Component implementation details that don't affect usage

## Tech Stack

### Frontend

- **Vue 3** — Composition API only, `<script setup lang="ts">`
- **TypeScript** — strict mode, ES2024 target
- **Pinia** — state management
- **Vue Router 4** — SPA routing
- **CSS Modules** — component-scoped styles
- **Vite** — build tool
- **Vitest** — testing framework

### Backend

- **Cloudflare Workers** — serverless API runtime
- **Hono** — lightweight web framework
- **D1** — SQLite database (Cloudflare)
- **Drizzle ORM** — type-safe database queries
- **Valibot** — request validation

## Architecture

```text
Vue Components → Pinia Stores → API Client (fetch) → Cloudflare Worker (Hono) → D1 (SQLite)
```

All data mutations go through Pinia actions. API client uses `fetch('/api/...')` to communicate with the backend.

## Project Structure

```text
src/
├── api/           # API client (fetch-based)
├── components/    # Reusable Vue components
├── models/        # TypeScript interfaces/types
│   └── __tests__/ # Unit tests for models
├── stores/        # Pinia stores (task-store, auth-store)
├── views/         # Page components (routed)
│   └── __tests__/ # Browser tests for views
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

### Testing Convention

- Tests live in `__tests__/` directories next to the code they test
- Unit tests: `*.test.ts`
- Browser tests (Playwright): `*.browser.test.ts`

### Browser Test Coverage

#### ControlView (Check-in Flow)

**✅ Working Tests:**

- One-time tasks: completion, skipping, multiple tasks in sequence
- Daily tasks: adding completion dates, skipping, auto-archiving, duplicate prevention
- Progress tasks: value input display, accumulation, skipping, auto-archiving (exact and exceeded targets)

**⏸️ TODO (Known Issues):**

- Mixed task types in single check-in session (daily + progress + one-time)
- Multiple auto-archiving tasks in one session

**Root Cause:** CheckInWizard uses reactive `props.tasks` computed property which filters out archived tasks mid-session. When a task auto-archives during check-in, it disappears from `tasksForCheckIn`, causing index mismatch between wizard state and available tasks.

**Future Fix Options:**

1. Snapshot task IDs at mount, fetch fresh data on each render
2. Pass completion handler as prop instead of event emission
3. Refactor `tasksForCheckIn` to include tasks being processed in current session
4. Implement state machine for wizard progression independent of task list changes

Пока marked as `.todo()` в тестах до реализации архитектурного фикса💡

## Naming Conventions

| Entity | Convention | Example |
| ------ | ---------- | ------- |
| Files (TS, CSS) | kebab-case | `task-api.ts`, `task-store.ts` |
| Vue components | PascalCase | `TaskCard.vue`, `CheckInWizard.vue` |
| CSS modules | kebab-case | `task-card.module.css` |
| TypeScript types/interfaces | PascalCase | `Task`, `DailyTask` |
| Pinia stores | camelCase with "use" prefix | `useTaskStore` |
| CSS classes (in modules) | camelCase | `.taskCard`, `.progressBar` |

## Code Style

### Vue Components

```vue
<template>
  <!-- Single root element preferred -->
</template>

<script setup lang="ts">
  // 1. Imports
  import { ref, computed } from 'vue'
  import type { Task } from '@/models/task'

  // 2. Props & Emits
  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  // 3. Composables & Stores
  const store = useTaskStore()

  // 4. Refs & Reactive
  const isLoading = ref(false)

  // 5. Computed
  const progress = computed(() => /* ... */)

  // 6. Functions
  function handleClick() { /* ... */ }
</script>

<style module>
  .container {
    /* mobile-first: base styles for mobile */
  }

  @media (min-width: 768px) {
    .container {
      /* tablet+ overrides */
    }
  }
</style>
```

### TypeScript

- Use `type` for unions, `interface` for objects
- Prefer discriminated unions for task types
- No `any`, use `unknown` if needed
- Use `satisfies` for type-safe object literals

### CSS

- Mobile-first approach (min-width media queries)
- CSS custom properties for theming in `:root`
- No CSS frameworks or UI libraries
- Use CSS modules (`$style.className`)

## Commands

```bash
# Frontend
npm run dev            # Start Vite dev server
npm run build          # Production build
npm run preview        # Preview production build

# Backend
npm run dev:worker     # Start Cloudflare Worker locally
npm run deploy         # Build & deploy to Cloudflare

# Database
npm run db:generate    # Generate migrations + convert to wrangler format
npm run db:migrate     # Apply migrations to local D1
npm run db:migrate:prod # Apply migrations to production D1
npm run db:studio      # Open Drizzle Studio

# Testing
npm run test           # Run unit tests once
npm run test:browser   # Run browser tests (Playwright)
npm run test:ui        # Run tests with UI
npm run test:watch     # Run tests in watch mode
```

## Data Models

### Task Types (Discriminated Union)

```typescript
type TaskType = 'daily' | 'progress' | 'one-time'

interface BaseTask {
  id: string
  title: string
  description?: string
  type: TaskType
  createdAt: string      // ISO date
  isArchived: boolean
}

interface DailyTask extends BaseTask {
  type: 'daily'
  targetDays: number       // e.g., 300
  completedDates: string[] // ISO dates when completed
}

interface ProgressTask extends BaseTask {
  type: 'progress'
  targetValue: number      // e.g., 1000000
  currentValue: number     // accumulated
  unit: string             // e.g., "steps"
}

interface OneTimeTask extends BaseTask {
  type: 'one-time'
  completedAt?: string     // ISO date when done
}

type Task = DailyTask | ProgressTask | OneTimeTask
```

### Completion Logic

| Type | Completed When |
| ---- | -------------- |
| Daily | `completedDates.length >= targetDays` |
| Progress | `currentValue >= targetValue` |
| One-time | `completedAt` is set |

## Database Schema

### Tables

Tables can be found in `worker/db/schema.ts`.

### API Endpoints

#### Auth Routes (public)

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/api/auth/twitch` | Redirect to Twitch OAuth |
| GET | `/api/auth/twitch/callback` | OAuth callback handler |
| GET | `/api/auth/me` | Get current user (or null) |
| POST | `/api/auth/logout` | Logout, clear session |
| PATCH | `/api/users/me` | Update user settings (isPublic) |

#### Public Profile

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/api/users/:userId/profile` | Get public user profile with tasks |

#### Task Routes (require auth)

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/api/tasks` | Get all tasks (optional `?archived=true/false`) |
| GET | `/api/tasks/:id` | Get single task |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| PATCH | `/api/tasks/:id/archive` | Archive task |
| POST | `/api/tasks/:id/checkin` | Record check-in |

## Key Flows

### Check-in Flow (ControlView)

1. Load active (non-archived) tasks
2. Show tasks one-by-one in wizard
3. For each task:
   - Show task info
   - Ask "Completed today?" (Yes/No)
   - If Yes + Progress task → ask for value input
   - Record check-in, update task
4. Auto-archive if goal reached
5. Next task or finish

### Task Creation

1. Enter title, optional description
2. Select type (daily/progress/one-time)
3. If daily → enter target days
4. If progress → enter target value + unit
5. Save to store → API (POST /api/tasks) → D1 database
