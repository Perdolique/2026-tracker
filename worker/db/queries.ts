import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { tasks, dailyCompletions, type TaskRow, type TaskType } from './schema'
import type { Task, DailyTask, ProgressTask, OneTimeTask, CreateTaskData } from '../../src/models/task'

export type Database = ReturnType<typeof createDatabase>

export function createDatabase(d1: D1Database) {
  return drizzle(d1, { schema: { tasks, dailyCompletions } })
}

/**
 * Transform DB row + completedDates into discriminated union Task
 */
function rowToTask(row: TaskRow, completedDates: string[] = []): Task {
  const base = {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    createdAt: row.createdAt,
    isArchived: row.isArchived,
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
 * Get all tasks with their completed dates
 */
export async function getAllTasks(db: Database): Promise<Task[]> {
  const rows = await db.select().from(tasks)

  // Get all daily completions in one query
  const completions = await db.select().from(dailyCompletions)

  // Group completions by taskId
  const completionsByTask = new Map<string, string[]>()
  for (const c of completions) {
    const dates = completionsByTask.get(c.taskId) ?? []
    dates.push(c.completedDate)
    completionsByTask.set(c.taskId, dates)
  }

  return rows.map((row) => rowToTask(row, completionsByTask.get(row.id) ?? []))
}

/**
 * Get active (non-archived) tasks
 */
export async function getActiveTasks(db: Database): Promise<Task[]> {
  const rows = await db.select().from(tasks).where(eq(tasks.isArchived, false))

  const taskIds = rows.map((r) => r.id)
  const completions =
    taskIds.length > 0
      ? await db.select().from(dailyCompletions)
      : []

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
 * Get archived tasks
 */
export async function getArchivedTasks(db: Database): Promise<Task[]> {
  const rows = await db.select().from(tasks).where(eq(tasks.isArchived, true))

  const taskIds = rows.map((r) => r.id)
  const completions =
    taskIds.length > 0
      ? await db.select().from(dailyCompletions)
      : []

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
 * Get single task by ID
 */
export async function getTaskById(db: Database, id: string): Promise<Task | null> {
  const rows = await db.select().from(tasks).where(eq(tasks.id, id))
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
 * Create a new task
 */
export async function createTask(db: Database, data: CreateTaskData): Promise<Task> {
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()

  const baseRow = {
    id,
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
 * Update a task
 */
export async function updateTask(db: Database, task: Task): Promise<Task> {
  const baseUpdate = {
    title: task.title,
    description: task.description ?? null,
    isArchived: task.isArchived,
  }

  switch (task.type) {
    case 'daily':
      await db
        .update(tasks)
        .set({
          ...baseUpdate,
          targetDays: task.targetDays,
        })
        .where(eq(tasks.id, task.id))

      // Sync completed dates
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
      await db
        .update(tasks)
        .set({
          ...baseUpdate,
          targetValue: task.targetValue,
          currentValue: task.currentValue,
          unit: task.unit,
        })
        .where(eq(tasks.id, task.id))
      break

    case 'one-time':
      await db
        .update(tasks)
        .set({
          ...baseUpdate,
          completedAt: task.completedAt ?? null,
        })
        .where(eq(tasks.id, task.id))
      break
  }

  return task
}

/**
 * Delete a task
 */
export async function deleteTask(db: Database, id: string): Promise<void> {
  // Cascade delete will handle daily_completions
  await db.delete(tasks).where(eq(tasks.id, id))
}

/**
 * Archive a task
 */
export async function archiveTask(db: Database, id: string): Promise<Task | null> {
  await db.update(tasks).set({ isArchived: true }).where(eq(tasks.id, id))
  return getTaskById(db, id)
}

/**
 * Record a check-in for a task
 */
export async function recordCheckIn(
  db: Database,
  taskId: string,
  completed: boolean,
  value?: number
): Promise<Task | null> {
  const task = await getTaskById(db, taskId)
  if (!task) return null

  if (!completed) return task

  const today = new Date().toISOString().split('T')[0]!

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
          .where(eq(tasks.id, taskId))
        task.currentValue = newValue
      }
      break

    case 'one-time':
      // Mark as completed
      await db
        .update(tasks)
        .set({ completedAt: today })
        .where(eq(tasks.id, taskId))
      task.completedAt = today
      break
  }

  return task
}
