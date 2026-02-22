import { api } from './client'
import type { Task, CreateTaskData } from '@/models/task'

interface UpdateTaskPayload {
  id: string
  title: string
  description?: string
  type: Task['type']
  checkInEnabled: boolean
  targetDays?: number
  targetValue?: number
  unit?: string
  completedAt?: string
}

// Get current ISO date string (YYYY-MM-DD)
export function getCurrentDate(): string {
  const [date] = new Date().toISOString().split('T')
  return date ?? ''
}

// Get all tasks
export async function getAllTasks(): Promise<Task[]> {
  return api.get('tasks').json<Task[]>()
}

// Get single task by ID
export async function getTaskById(id: string): Promise<Task | undefined> {
  try {
    return await api.get(`tasks/${id}`).json<Task>()
  } catch {
    return undefined
  }
}

// Create new task
export async function createTask(data: CreateTaskData): Promise<Task> {
  return api.post('tasks', { json: data }).json<Task>()
}

// Update existing task
export async function updateTask(task: Task): Promise<Task> {
  const taskData = toUpdateTaskPayload(task)
  return api.put(`tasks/${task.id}`, { json: taskData }).json<Task>()
}

// Delete task
export async function deleteTask(id: string): Promise<void> {
  await api.delete(`tasks/${id}`)
}

// Record daily check-in for a task
export async function recordCheckIn(
  taskId: string,
  completed: boolean,
  value?: number
): Promise<Task> {
  return api.post(`tasks/${taskId}/checkin`, { json: { completed, value } }).json<Task>()
}

// Add single daily completion date
export async function addDailyCompletion(taskId: string, date: string): Promise<Task> {
  return api.post(`tasks/${taskId}/daily-completions`, { json: { date } }).json<Task>()
}

// Delete single daily completion date
export async function deleteDailyCompletion(taskId: string, date: string): Promise<Task> {
  const encodedDate = encodeURIComponent(date)
  return api.delete(`tasks/${taskId}/daily-completions/${encodedDate}`).json<Task>()
}

// Add new progress value
export async function addProgressValue(taskId: string, value: number): Promise<Task> {
  return api.post(`tasks/${taskId}/completions`, { json: { value } }).json<Task>()
}

// Delete single progress completion
export async function deleteProgressCompletion(taskId: string, completionId: number): Promise<Task> {
  return api.delete(`tasks/${taskId}/completions/${completionId}`).json<Task>()
}

function toUpdateTaskPayload(task: Task): UpdateTaskPayload {
  const basePayload = {
    id: task.id,
    title: task.title,
    description: task.description,
    type: task.type,
    checkInEnabled: task.checkInEnabled,
  }

  switch (task.type) {
    case 'daily': {
      return {
        ...basePayload,
        targetDays: task.targetDays,
      }
    }

    case 'progress': {
      return {
        ...basePayload,
        targetValue: task.targetValue,
        unit: task.unit,
      }
    }

    case 'one-time': {
      return {
        ...basePayload,
        completedAt: task.completedAt,
      }
    }
  }
}
