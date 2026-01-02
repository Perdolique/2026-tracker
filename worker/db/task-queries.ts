import { eq, and } from 'drizzle-orm'
import { tasks, dailyCompletions, type TaskRow, type TaskType } from './schema'
import type { Task, DailyTask, ProgressTask, OneTimeTask, CreateTaskData } from '../../src/models/task'
import type { Database } from './queries'

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
    updatedAt: row.updatedAt,
    checkInEnabled: row.checkInEnabled ?? false,
  }

  switch (row.type) {
    case 'daily': {
      return {
        ...base,
        type: 'daily',
        targetDays: row.targetDays ?? 30,
        completedDates,
      } satisfies DailyTask
    }

    case 'progress': {
      return {
        ...base,
        type: 'progress',
        targetValue: row.targetValue ?? 100,
        currentValue: row.currentValue ?? 0,
        unit: row.unit ?? 'units',
      } satisfies ProgressTask
    }

    case 'one-time': {
      return {
        ...base,
        type: 'one-time',
        completedAt: row.completedAt ?? undefined,
      } satisfies OneTimeTask
    }
  }
}

/**
 * Get all tasks for a user with their completed dates
 */
export async function getAllTasks(db: Database, userId: string): Promise<Task[]> {
  const rows = await db.select().from(tasks).where(eq(tasks.userId, userId))

  // Get all daily completions in one query
  const taskIds = rows.map((row) => row.id)
  const completions =
    taskIds.length > 0
      ? await db.select().from(dailyCompletions)
      : []

  // Group completions by taskId
  const completionsByTask = new Map<string, string[]>()
  for (const completion of completions) {
    if (taskIds.includes(completion.taskId)) {
      const dates = completionsByTask.get(completion.taskId) ?? []
      dates.push(completion.completedDate)
      completionsByTask.set(completion.taskId, dates)
    }
  }

  return rows.map((row) => rowToTask(row, completionsByTask.get(row.id) ?? []))
}

/**
 * Get single task by ID (with optional user check)
 */
export async function getTaskById(db: Database, id: string, userId?: string): Promise<Task | null> {
  const conditions = userId === undefined
    ? eq(tasks.id, id)
    : and(eq(tasks.id, id), eq(tasks.userId, userId))

  const rows = await db.select().from(tasks).where(conditions)
  const [row] = rows

  if (!row) {
    return null
  }

  let completedDates: string[] = []
  if (row.type === 'daily') {
    const completions = await db
      .select()
      .from(dailyCompletions)
      .where(eq(dailyCompletions.taskId, id))
    completedDates = completions.map((completion) => completion.completedDate)
  }

  return rowToTask(row, completedDates)
}

/**
 * Create a new task for a user
 */
export async function createTask(db: Database, userId: string, data: CreateTaskData): Promise<Task> {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  const baseRow = {
    id,
    userId,
    title: data.title,
    description: data.description ?? null,
    type: data.type as TaskType,
    createdAt: now,
    updatedAt: now,
    checkInEnabled: data.checkInEnabled ?? false,
  }

  switch (data.type) {
    case 'daily': {
      await db.insert(tasks).values({
        ...baseRow,
        targetDays: data.targetDays ?? 30,
      })
      return rowToTask(
        {
          ...baseRow,
          targetDays: data.targetDays ?? 30,
          targetValue: null,
          currentValue: null,
          unit: null,
          completedAt: null,
        },
        []
      )
    }

    case 'progress': {
      await db.insert(tasks).values({
        ...baseRow,
        targetValue: data.targetValue ?? 100,
        currentValue: 0,
        unit: data.unit ?? 'units',
      })
      return rowToTask(
        {
          ...baseRow,
          targetDays: null,
          targetValue: data.targetValue ?? 100,
          currentValue: 0,
          unit: data.unit ?? 'units',
          completedAt: null,
        },
        []
      )
    }

    case 'one-time': {
      await db.insert(tasks).values(baseRow)
      return rowToTask(
        {
          ...baseRow,
          targetDays: null,
          targetValue: null,
          currentValue: null,
          unit: null,
          completedAt: null,
        },
        []
      )
    }
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
    checkInEnabled: task.checkInEnabled,
    updatedAt: new Date().toISOString(),
  }

  const ownershipCondition = and(eq(tasks.id, task.id), eq(tasks.userId, userId))

  let result: D1Result | null = null
  switch (task.type) {
    case 'daily': {
      result = await db
        .update(tasks)
        .set({
          ...baseUpdate,
          targetDays: task.targetDays,
        })
        .where(ownershipCondition)

      if (result.meta.changes === 0) {
        return null
      }

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
    }

    case 'progress': {
      result = await db
        .update(tasks)
        .set({
          ...baseUpdate,
          targetValue: task.targetValue,
          currentValue: task.currentValue,
          unit: task.unit,
        })
        .where(ownershipCondition)

      if (result.meta.changes === 0) {
        return null
      }
      break
    }

    case 'one-time': {
      result = await db
        .update(tasks)
        .set({
          ...baseUpdate,
          completedAt: task.completedAt ?? null,
        })
        .where(ownershipCondition)

      if (result.meta.changes === 0) {
        return null
      }
      break
    }
  }

  // Fetch and return the updated task with fresh server timestamp
  return getTaskById(db, task.id, userId)
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
export interface CheckInParams {
  db: Database
  taskId: string
  userId: string
  completed: boolean
  value?: number
}

export async function recordCheckIn(params: CheckInParams): Promise<Task | null> {
  const { db, taskId, userId, completed, value } = params
  const task = await getTaskById(db, taskId, userId)

  if (!task) {
    return null
  }

  if (!completed) {
    return task
  }

  const now = new Date().toISOString()
  const todayParts = now.split('T')
  const today = todayParts[0] ?? ''
  const ownershipCondition = and(eq(tasks.id, taskId), eq(tasks.userId, userId))

  switch (task.type) {
    case 'daily': {
      // Add today to completed dates if not already there
      if (!task.completedDates.includes(today)) {
        await db.insert(dailyCompletions).values({
          taskId,
          completedDate: today,
        })
        await db.update(tasks).set({ updatedAt: now }).where(ownershipCondition)
        task.completedDates.push(today)
        task.updatedAt = now
      }
      break
    }

    case 'progress': {
      // Add value to current progress
      if (value !== undefined && value > 0) {
        const newValue = task.currentValue + value
        await db
          .update(tasks)
          .set({ currentValue: newValue, updatedAt: now })
          .where(ownershipCondition)
        task.currentValue = newValue
        task.updatedAt = now
      }
      break
    }

    case 'one-time': {
      // Mark as completed
      await db
        .update(tasks)
        .set({ completedAt: today, updatedAt: now })
        .where(ownershipCondition)
      task.completedAt = today
      task.updatedAt = now
      break
    }
  }

  return task
}
