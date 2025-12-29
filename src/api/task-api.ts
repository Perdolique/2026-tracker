import type { Task, CreateTaskData } from '@/models/task'

const STORAGE_KEY = '2026-tracker:tasks'

// Simulate network delay for realism
function delay(ms: number = 50): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Generate unique ID
function generateId(): string {
  return crypto.randomUUID()
}

// Get current ISO date string (YYYY-MM-DD)
export function getCurrentDate(): string {
  const [date] = new Date().toISOString().split('T')
  return date ?? ''
}

// Load tasks from localStorage
async function loadTasks(): Promise<Task[]> {
  await delay()
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as Task[]
  } catch {
    return []
  }
}

// Save tasks to localStorage
async function saveTasks(tasks: Task[]): Promise<void> {
  await delay()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

// Get all tasks
export async function getAllTasks(): Promise<Task[]> {
  return loadTasks()
}

// Get active (non-archived) tasks
export async function getActiveTasks(): Promise<Task[]> {
  const tasks = await loadTasks()
  return tasks.filter((t) => !t.isArchived)
}

// Get archived tasks
export async function getArchivedTasks(): Promise<Task[]> {
  const tasks = await loadTasks()
  return tasks.filter((t) => t.isArchived)
}

// Get single task by ID
export async function getTaskById(id: string): Promise<Task | undefined> {
  const tasks = await loadTasks()
  return tasks.find((t) => t.id === id)
}

// Create new task
export async function createTask(data: CreateTaskData): Promise<Task> {
  const tasks = await loadTasks()

  const baseTask = {
    id: generateId(),
    title: data.title,
    description: data.description,
    createdAt: new Date().toISOString(),
    isArchived: false,
  }

  let task: Task

  switch (data.type) {
    case 'daily':
      task = {
        ...baseTask,
        type: 'daily',
        targetDays: data.targetDays ?? 30,
        completedDates: [],
      }
      break
    case 'progress':
      task = {
        ...baseTask,
        type: 'progress',
        targetValue: data.targetValue ?? 100,
        currentValue: 0,
        unit: data.unit ?? 'units',
      }
      break
    case 'one-time':
      task = {
        ...baseTask,
        type: 'one-time',
      }
      break
  }

  tasks.push(task)
  await saveTasks(tasks)
  return task
}

// Update existing task
export async function updateTask(updatedTask: Task): Promise<Task> {
  const tasks = await loadTasks()
  const index = tasks.findIndex((t) => t.id === updatedTask.id)

  if (index === -1) {
    throw new Error(`Task not found: ${updatedTask.id}`)
  }

  tasks[index] = updatedTask
  await saveTasks(tasks)
  return updatedTask
}

// Delete task
export async function deleteTask(id: string): Promise<void> {
  const tasks = await loadTasks()
  const filtered = tasks.filter((t) => t.id !== id)
  await saveTasks(filtered)
}

// Archive task (mark as completed/archived)
export async function archiveTask(id: string): Promise<Task> {
  const tasks = await loadTasks()
  const task = tasks.find((t) => t.id === id)

  if (!task) {
    throw new Error(`Task not found: ${id}`)
  }

  task.isArchived = true
  await saveTasks(tasks)
  return task
}

// Record daily check-in for a task
export async function recordCheckIn(
  taskId: string,
  completed: boolean,
  value?: number
): Promise<Task> {
  const tasks = await loadTasks()
  const task = tasks.find((t) => t.id === taskId)

  if (!task) {
    throw new Error(`Task not found: ${taskId}`)
  }

  if (!completed) {
    // No changes if not completed
    return task
  }

  const today = getCurrentDate()

  switch (task.type) {
    case 'daily':
      // Add today to completed dates if not already there
      if (!task.completedDates.includes(today)) {
        task.completedDates.push(today)
      }
      break
    case 'progress':
      // Add value to current progress
      if (value !== undefined && value > 0) {
        task.currentValue += value
      }
      break
    case 'one-time':
      // Mark as completed
      task.completedAt = today
      break
  }

  await saveTasks(tasks)
  return task
}
