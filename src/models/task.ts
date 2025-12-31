// Task type discriminator
export type TaskType = 'daily' | 'progress' | 'one-time'

// Base task interface
export interface BaseTask {
  id: string
  title: string
  description?: string
  type: TaskType
  createdAt: string // ISO date
  checkInEnabled: boolean // Include in daily check-in
}

// Daily task — complete N days total
export interface DailyTask extends BaseTask {
  type: 'daily'
  targetDays: number // e.g., 300
  completedDates: string[] // ISO dates when completed
}

// Progress task — accumulate value toward goal
export interface ProgressTask extends BaseTask {
  type: 'progress'
  targetValue: number // e.g., 1000000
  currentValue: number // accumulated so far
  unit: string // e.g., "steps", "pages", "km"
}

// One-time task — single completion
export interface OneTimeTask extends BaseTask {
  type: 'one-time'
  completedAt?: string // ISO date when done
}

// Discriminated union of all task types
export type Task = DailyTask | ProgressTask | OneTimeTask

// Form data for creating a new task
export interface CreateTaskData {
  title: string
  description?: string
  type: TaskType
  targetDays?: number // for daily
  targetValue?: number // for progress
  unit?: string // for progress
  checkInEnabled?: boolean // Include in daily check-in (default: false)
}

// Check-in result for a single task
export interface CheckInResult {
  taskId: string
  date: string // ISO date
  completed: boolean
  value?: number // for progress tasks
}

// Type guards
export function isDailyTask(task: Task): task is DailyTask {
  return task.type === 'daily'
}

export function isProgressTask(task: Task): task is ProgressTask {
  return task.type === 'progress'
}

export function isOneTimeTask(task: Task): task is OneTimeTask {
  return task.type === 'one-time'
}

// Check if task goal is reached
export function isTaskCompleted(task: Task): boolean {
  switch (task.type) {
    case 'daily': {
      return task.completedDates.length >= task.targetDays
    }
    case 'progress': {
      return task.currentValue >= task.targetValue
    }
    case 'one-time': {
      return task.completedAt !== undefined
    }
  }
}

// Get task progress as percentage (0-100)
export function getTaskProgress(task: Task): number {
  switch (task.type) {
    case 'daily': {
      return Math.min(100, (task.completedDates.length / task.targetDays) * 100)
    }
    case 'progress': {
      return Math.min(100, (task.currentValue / task.targetValue) * 100)
    }
    case 'one-time': {
      return task.completedAt ? 100 : 0
    }
  }
}

// Get current date in YYYY-MM-DD format (UTC)
export function getCurrentDate(): string {
  const [date] = new Date().toISOString().split('T')
  return date ?? ''
}

// Check if daily task was already completed today
export function isDailyTaskCompletedToday(task: DailyTask): boolean {
  const today = getCurrentDate()
  return task.completedDates.includes(today)
}
