import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'

// Task types enum values
export const taskTypes = ['daily', 'progress', 'one-time'] as const
export type TaskType = (typeof taskTypes)[number]

/**
 * Users table for Twitch OAuth
 */
// Supported languages
export const languages = ['en', 'ru'] as const
export type Language = (typeof languages)[number]

export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // UUID
  twitchId: text('twitch_id').unique().notNull(),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(false),
  language: text('language', { enum: languages }).notNull().default('en'),
  createdAt: text('created_at').notNull(), // ISO timestamp
})

/**
 * Sessions table for auth
 */
export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(), // Session token
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: text('expires_at').notNull(), // ISO timestamp
    createdAt: text('created_at').notNull(), // ISO timestamp
  },
  (table) => [index('sessions_user_id_idx').on(table.userId)]
)

/**
 * Main tasks table
 * Uses single-table design with nullable type-specific columns
 */
export const tasks = sqliteTable(
  'tasks',
  {
    id: text('id').primaryKey(), // UUID
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }), // Nullable for migration
    title: text('title').notNull(),
    description: text('description'),
    type: text('type', { enum: taskTypes }).notNull(),
    createdAt: text('created_at').notNull(), // ISO timestamp
    updatedAt: text('updated_at').notNull(), // ISO timestamp

    // Daily task fields
    targetDays: integer('target_days'),

    // Progress task fields
    targetValue: integer('target_value'),
    currentValue: integer('current_value'),
    unit: text('unit'),

    // One-time task fields
    completedAt: text('completed_at'),

    // Check-in control
    checkInEnabled: integer('check_in_enabled', { mode: 'boolean' }).notNull().default(false),
  },
  (table) => [index('tasks_user_id_idx').on(table.userId)]
)

/**
 * Daily task completion dates
 * Separate table because SQLite doesn't support array columns
 */
export const dailyCompletions = sqliteTable(
  'daily_completions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    taskId: text('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    completedDate: text('completed_date').notNull(), // YYYY-MM-DD format
  },
  (table) => [
    index('daily_completions_task_id_idx').on(table.taskId),
    index('daily_completions_task_date_idx').on(table.taskId, table.completedDate),
  ]
)

// TypeScript types inferred from schema
export type UserRow = typeof users.$inferSelect
export type NewUserRow = typeof users.$inferInsert
export type SessionRow = typeof sessions.$inferSelect
export type NewSessionRow = typeof sessions.$inferInsert
export type TaskRow = typeof tasks.$inferSelect
export type NewTaskRow = typeof tasks.$inferInsert
export type DailyCompletionRow = typeof dailyCompletions.$inferSelect
export type NewDailyCompletionRow = typeof dailyCompletions.$inferInsert
