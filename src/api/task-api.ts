import type { Task, CreateTaskData } from '@/models/task'

const API_BASE = '/api'

// Get current ISO date string (YYYY-MM-DD)
export function getCurrentDate(): string {
  const [date] = new Date().toISOString().split('T')
  return date ?? ''
}

// Helper for API requests
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error((error as { error?: string }).error ?? `HTTP ${response.status}`)
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

// Get all tasks
export async function getAllTasks(): Promise<Task[]> {
  return apiFetch<Task[]>('/tasks')
}

// Get single task by ID
export async function getTaskById(id: string): Promise<Task | undefined> {
  try {
    return await apiFetch<Task>(`/tasks/${id}`)
  } catch {
    return undefined
  }
}

// Create new task
export async function createTask(data: CreateTaskData): Promise<Task> {
  return apiFetch<Task>('/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// Update existing task
export async function updateTask(task: Task): Promise<Task> {
  return apiFetch<Task>(`/tasks/${task.id}`, {
    method: 'PUT',
    body: JSON.stringify(task),
  })
}

// Delete task
export async function deleteTask(id: string): Promise<void> {
  await apiFetch<void>(`/tasks/${id}`, {
    method: 'DELETE',
  })
}

// Record daily check-in for a task
export async function recordCheckIn(
  taskId: string,
  completed: boolean,
  value?: number
): Promise<Task> {
  return apiFetch<Task>(`/tasks/${taskId}/checkin`, {
    method: 'POST',
    body: JSON.stringify({ completed, value }),
  })
}
