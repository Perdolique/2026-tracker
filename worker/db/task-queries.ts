import { eq, and, sql } from 'drizzle-orm'
import { tasks, dailyCompletions, progressCompletions, type TaskRow, type TaskType } from './schema'
import type { Task, DailyTask, ProgressTask, OneTimeTask, CreateTaskData } from '../../src/models/task'
import type { Database } from './queries'

// =============================================================================
// Task Queries (with user scoping)
// =============================================================================

/**
 * Transform DB row + completedDates/completedValues into discriminated union Task
 */
function rowToTask(
  row: TaskRow,
  completedDates: string[] = [],
  completedValues: { id: number; date: string; value: number }[] = []
): Task {
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
        completedValues,
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
  const dailyData =
    taskIds.length > 0
      ? await db.select().from(dailyCompletions)
      : []
  const progressData =
    taskIds.length > 0
      ? await db.select().from(progressCompletions)
      : []

  // Group completions by taskId
  const dailyByTask = new Map<string, string[]>()
  for (const completion of dailyData) {
    if (taskIds.includes(completion.taskId)) {
      const dates = dailyByTask.get(completion.taskId) ?? []
      dates.push(completion.completedDate)
      dailyByTask.set(completion.taskId, dates)
    }
  }

  const progressByTask = new Map<string, { id: number; date: string; value: number }[]>()
  for (const completion of progressData) {
    if (taskIds.includes(completion.taskId)) {
      const values = progressByTask.get(completion.taskId) ?? []
      values.push({ id: completion.id, date: completion.completedDate, value: completion.value })
      progressByTask.set(completion.taskId, values)
    }
  }

  return rows.map((row) => rowToTask(row, dailyByTask.get(row.id) ?? [], progressByTask.get(row.id) ?? []))
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
  let completedValues: { id: number; date: string; value: number }[] = []

  if (row.type === 'daily') {
    const completions = await db
      .select()
      .from(dailyCompletions)
      .where(eq(dailyCompletions.taskId, id))
    completedDates = completions.map((completion) => completion.completedDate)
  }

  if (row.type === 'progress') {
    const completions = await db
      .select()
      .from(progressCompletions)
      .where(eq(progressCompletions.taskId, id))
    completedValues = completions.map((completion) => ({ id: completion.id, date: completion.completedDate, value: completion.value }))
  }

  return rowToTask(row, completedDates, completedValues)
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
        [],
        [] // Empty completedValues with correct type
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
      // Don't sync completedValues - they are managed by separate delete endpoint
      // Only update task metadata
      result = await db
        .update(tasks)
        .set({
          ...baseUpdate,
          targetValue: task.targetValue,
          unit: task.unit,
          // CurrentValue is managed by check-in and deletion, don't override
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
  const today = now.split('T')[0] ?? ''
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
        // 1. Insert completion record
        await db.insert(progressCompletions).values({
          taskId,
          completedDate: now,
          value,
        })

        // 2. Recalculate currentValue from all completions
        const sumResult = await db
          .select({ total: sql<number>`COALESCE(SUM(${progressCompletions.value}), 0)` })
          .from(progressCompletions)
          .where(eq(progressCompletions.taskId, taskId))
        const newValue = sumResult[0]?.total ?? 0

        // 3. Update task
        await db
          .update(tasks)
          .set({ currentValue: newValue, updatedAt: now })
          .where(ownershipCondition)

        task.currentValue = newValue
        task.updatedAt = now
        // Note: id will be filled when re-fetching task, using 0 as placeholder
        task.completedValues.push({ id: 0, date: now, value })
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

/**
 * Add a new progress value to a progress task
 * Returns updated task or null if task not found or not a progress task
 */
export async function addProgressValue({
  db,
  userId,
  taskId,
  value,
}: {
  db: Database
  userId: string
  taskId: string
  value: number
}): Promise<Task | null> {
  // Verify ownership and task type
  const task = await getTaskById(db, taskId, userId)
  if (task?.type !== 'progress') {
    return null
  }

  const now = new Date().toISOString()

  // 1. Insert completion record
  await db.insert(progressCompletions).values({
    taskId,
    completedDate: now,
    value,
  })

  // 2. Recalculate currentValue from all completions
  const sumResult = await db
    .select({ total: sql<number>`COALESCE(SUM(${progressCompletions.value}), 0)` })
    .from(progressCompletions)
    .where(eq(progressCompletions.taskId, taskId))
  const newValue = sumResult[0]?.total ?? 0

  // 3. Update task
  await db
    .update(tasks)
    .set({ currentValue: newValue, updatedAt: now })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))

  // Return updated task with fresh data
  return getTaskById(db, taskId, userId)
}

/**
 * Delete a single progress completion and recalculate currentValue
 * Returns updated task or null if completion/task not found
 */
export async function deleteProgressCompletion({
  db,
  userId,
  taskId,
  completionId,
}: {
  db: Database
  userId: string
  taskId: string
  completionId: number
}): Promise<Task | null> {
  // Verify ownership
  const task = await getTaskById(db, taskId, userId)
  if (task?.type !== 'progress') {
    return null
  }

  // Delete the completion
  const result = await db
    .delete(progressCompletions)
    .where(and(eq(progressCompletions.id, completionId), eq(progressCompletions.taskId, taskId)))

  if (result.meta.changes === 0) {
    return null
  }

  // Recalculate currentValue from remaining completions
  const sumResult = await db
    .select({ total: sql<number>`COALESCE(SUM(${progressCompletions.value}), 0)` })
    .from(progressCompletions)
    .where(eq(progressCompletions.taskId, taskId))
  const newValue = sumResult[0]?.total ?? 0

  // Update task
  const now = new Date().toISOString()
  await db
    .update(tasks)
    .set({ currentValue: newValue, updatedAt: now })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))

  // Return updated task
  return getTaskById(db, taskId, userId)
}
