import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'

// Task types enum values
export const taskTypes = ['daily', 'progress', 'one-time'] as const
export type TaskType = (typeof taskTypes)[number]

/**
 * Main tasks table
 * Uses single-table design with nullable type-specific columns
 */
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(), // UUID
  title: text('title').notNull(),
  description: text('description'),
  type: text('type', { enum: taskTypes }).notNull(),
  createdAt: text('created_at').notNull(), // ISO timestamp
  isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),

  // Daily task fields
  targetDays: integer('target_days'),

  // Progress task fields
  targetValue: integer('target_value'),
  currentValue: integer('current_value'),
  unit: text('unit'),

  // One-time task fields
  completedAt: text('completed_at'),
})

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
export type TaskRow = typeof tasks.$inferSelect
export type NewTaskRow = typeof tasks.$inferInsert
export type DailyCompletionRow = typeof dailyCompletions.$inferSelect
export type NewDailyCompletionRow = typeof dailyCompletions.$inferInsert
