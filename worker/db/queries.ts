import { drizzle } from 'drizzle-orm/d1'
import { eq, and } from 'drizzle-orm'
import { tasks, dailyCompletions, users, sessions, type TaskRow, type TaskType } from './schema'
import type { Task, DailyTask, ProgressTask, OneTimeTask, CreateTaskData } from '../../src/models/task'

export type Database = ReturnType<typeof createDatabase>

export function createDatabase(d1: D1Database) {
  return drizzle(d1, { schema: { tasks, dailyCompletions, users, sessions } })
}

// =============================================================================
// User & Session Queries
// =============================================================================

export interface User {
  id: string
  twitchId: string
  displayName: string
  avatarUrl: string | null
  isPublic: boolean
  createdAt: string
}

export async function getUserByTwitchId(db: Database, twitchId: string): Promise<User | null> {
  const rows = await db.select().from(users).where(eq(users.twitchId, twitchId))
  return rows[0] ?? null
}

export async function getUserById(db: Database, id: string): Promise<User | null> {
  const rows = await db.select().from(users).where(eq(users.id, id))
  return rows[0] ?? null
}

export async function createUser(
  db: Database,
  data: { twitchId: string; displayName: string; avatarUrl?: string }
): Promise<User> {
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()

  await db.insert(users).values({
    id,
    twitchId: data.twitchId,
    displayName: data.displayName,
    avatarUrl: data.avatarUrl ?? null,
    isPublic: false,
    createdAt,
  })

  return {
    id,
    twitchId: data.twitchId,
    displayName: data.displayName,
    avatarUrl: data.avatarUrl ?? null,
    isPublic: false,
    createdAt,
  }
}

export async function updateUser(
  db: Database,
  id: string,
  data: { displayName?: string; avatarUrl?: string; isPublic?: boolean }
): Promise<User | null> {
  await db.update(users).set(data).where(eq(users.id, id))
  return getUserById(db, id)
}

export async function createSession(db: Database, userId: string): Promise<string> {
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days

  await db.insert(sessions).values({
    id,
    userId,
    expiresAt,
    createdAt,
  })

  return id
}

export async function getSessionWithUser(
  db: Database,
  sessionId: string
): Promise<{ session: { id: string; expiresAt: string }; user: User } | null> {
  const rows = await db
    .select()
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sessionId))

  if (rows.length === 0) return null

  const row = rows[0]!
  const session = row.sessions
  const user = row.users

  // Check if session expired
  if (new Date(session.expiresAt) < new Date()) {
    await deleteSession(db, sessionId)
    return null
  }

  return {
    session: { id: session.id, expiresAt: session.expiresAt },
    user,
  }
}

export async function deleteSession(db: Database, sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId))
}

export async function deleteUserSessions(db: Database, userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId))
}

// =============================================================================
// Task Queries (with user scoping)
// =============================================================================

/**
 * Transform DB row + completedDates into discriminated union Task
 */
function rowToTask(row: TaskRow, completedDates: string[] = []): Task {
  const base = {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    createdAt: row.createdAt,
  }

  switch (row.type) {
    case 'daily':
      return {
        ...base,
        type: 'daily',
        targetDays: row.targetDays ?? 30,
        completedDates,
      } satisfies DailyTask

    case 'progress':
      return {
        ...base,
        type: 'progress',
        targetValue: row.targetValue ?? 100,
        currentValue: row.currentValue ?? 0,
        unit: row.unit ?? 'units',
      } satisfies ProgressTask

    case 'one-time':
      return {
        ...base,
        type: 'one-time',
        completedAt: row.completedAt ?? undefined,
      } satisfies OneTimeTask
  }
}

/**
 * Get all tasks for a user with their completed dates
 */
export async function getAllTasks(db: Database, userId: string): Promise<Task[]> {
  const rows = await db.select().from(tasks).where(eq(tasks.userId, userId))

  // Get all daily completions in one query
  const taskIds = rows.map((r) => r.id)
  const completions =
    taskIds.length > 0
      ? await db.select().from(dailyCompletions)
      : []

  // Group completions by taskId
  const completionsByTask = new Map<string, string[]>()
  for (const c of completions) {
    if (taskIds.includes(c.taskId)) {
      const dates = completionsByTask.get(c.taskId) ?? []
      dates.push(c.completedDate)
      completionsByTask.set(c.taskId, dates)
    }
  }

  return rows.map((row) => rowToTask(row, completionsByTask.get(row.id) ?? []))
}



/**
 * Get single task by ID (with optional user check)
 */
export async function getTaskById(db: Database, id: string, userId?: string): Promise<Task | null> {
  const conditions = userId
    ? and(eq(tasks.id, id), eq(tasks.userId, userId))
    : eq(tasks.id, id)

  const rows = await db.select().from(tasks).where(conditions)
  const row = rows[0]

  if (!row) return null

  let completedDates: string[] = []
  if (row.type === 'daily') {
    const completions = await db
      .select()
      .from(dailyCompletions)
      .where(eq(dailyCompletions.taskId, id))
    completedDates = completions.map((c) => c.completedDate)
  }

  return rowToTask(row, completedDates)
}

/**
 * Create a new task for a user
 */
export async function createTask(db: Database, userId: string, data: CreateTaskData): Promise<Task> {
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()

  const baseRow = {
    id,
    userId,
    title: data.title,
    description: data.description ?? null,
    type: data.type as TaskType,
    createdAt,
    isArchived: false,
  }

  switch (data.type) {
    case 'daily':
      await db.insert(tasks).values({
        ...baseRow,
        targetDays: data.targetDays ?? 30,
      })
      return rowToTask(
        { ...baseRow, targetDays: data.targetDays ?? 30, targetValue: null, currentValue: null, unit: null, completedAt: null },
        []
      )

    case 'progress':
      await db.insert(tasks).values({
        ...baseRow,
        targetValue: data.targetValue ?? 100,
        currentValue: 0,
        unit: data.unit ?? 'units',
      })
      return rowToTask(
        { ...baseRow, targetDays: null, targetValue: data.targetValue ?? 100, currentValue: 0, unit: data.unit ?? 'units', completedAt: null },
        []
      )

    case 'one-time':
      await db.insert(tasks).values(baseRow)
      return rowToTask(
        { ...baseRow, targetDays: null, targetValue: null, currentValue: null, unit: null, completedAt: null },
        []
      )
  }
}

/**
 * Update a task (with user ownership check)
 * Returns the updated task, or null if task doesn't exist or doesn't belong to user
 */
export async function updateTask(db: Database, userId: string, task: Task): Promise<Task | null> {
  const baseUpdate = {
    title: task.title,
    description: task.description ?? null,
  }

  const ownershipCondition = and(eq(tasks.id, task.id), eq(tasks.userId, userId))

  let result: D1Result
  switch (task.type) {
    case 'daily':
      result = await db
        .update(tasks)
        .set({
          ...baseUpdate,
          targetDays: task.targetDays,
        })
        .where(ownershipCondition)

      if (result.meta.changes === 0) return null

      // Sync completed dates (only if task was updated)
      await db.delete(dailyCompletions).where(eq(dailyCompletions.taskId, task.id))
      if (task.completedDates.length > 0) {
        await db.insert(dailyCompletions).values(
          task.completedDates.map((date) => ({
            taskId: task.id,
            completedDate: date,
          }))
        )
      }
      break

    case 'progress':
      result = await db
        .update(tasks)
        .set({
          ...baseUpdate,
          targetValue: task.targetValue,
          currentValue: task.currentValue,
          unit: task.unit,
        })
        .where(ownershipCondition)

      if (result.meta.changes === 0) return null
      break

    case 'one-time':
      result = await db
        .update(tasks)
        .set({
          ...baseUpdate,
          completedAt: task.completedAt ?? null,
        })
        .where(ownershipCondition)

      if (result.meta.changes === 0) return null
      break
  }

  return task
}

/**
 * Delete a task (with user ownership check)
 * Returns true if task was deleted, false if not found or doesn't belong to user
 */
export async function deleteTask(db: Database, id: string, userId: string): Promise<boolean> {
  // Cascade delete will handle daily_completions
  const result = await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
  return result.meta.changes > 0
}

/**
 * Record a check-in for a task (with user ownership check)
 * Returns the updated task, or null if not found or doesn't belong to user
 */
export async function recordCheckIn(
  db: Database,
  taskId: string,
  userId: string,
  completed: boolean,
  value?: number
): Promise<Task | null> {
  const task = await getTaskById(db, taskId, userId)
  if (!task) return null

  if (!completed) return task

  const today = new Date().toISOString().split('T')[0]!
  const ownershipCondition = and(eq(tasks.id, taskId), eq(tasks.userId, userId))

  switch (task.type) {
    case 'daily':
      // Add today to completed dates if not already there
      if (!task.completedDates.includes(today)) {
        await db.insert(dailyCompletions).values({
          taskId,
          completedDate: today,
        })
        task.completedDates.push(today)
      }
      break

    case 'progress':
      // Add value to current progress
      if (value !== undefined && value > 0) {
        const newValue = task.currentValue + value
        await db
          .update(tasks)
          .set({ currentValue: newValue })
          .where(ownershipCondition)
        task.currentValue = newValue
      }
      break

    case 'one-time':
      // Mark as completed
      await db
        .update(tasks)
        .set({ completedAt: today })
        .where(ownershipCondition)
      task.completedAt = today
      break
  }

  return task
}
