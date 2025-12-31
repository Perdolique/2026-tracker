import { api } from './client'
import type { Task, CreateTaskData } from '@/models/task'

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
  return api.put(`tasks/${task.id}`, { json: task }).json<Task>()
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
