import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'
import type { Task, DailyTask, ProgressTask, OneTimeTask, CreateTaskData } from '@/models/task'

// Фиксированная дата для тестов — делает их детерминированными
export const TEST_DATE = '2026-01-15'

// In-memory хранилище для тестов
let mockTasksStorage: Task[] = []

// Получить текущее состояние mock storage
export function getMockTasksStorage(): Task[] {
  return structuredClone(mockTasksStorage)
}

// Сбросить storage
export function resetMockStorage(): void {
  mockTasksStorage = []
}

// Установить начальные данные
export function setMockTasks(tasks: Task[]): void {
  mockTasksStorage = structuredClone(tasks)
}

// --- ID генератор ---
let taskIdCounter = 0

function generateTaskId(): string {
  return `test-task-${++taskIdCounter}`
}

export function resetTaskIdCounter(): void {
  taskIdCounter = 0
}

// --- Helpers для создания задач ---
export function createMockOneTimeTask(overrides: Partial<OneTimeTask> = {}): OneTimeTask {
  return {
    id: generateTaskId(),
    title: 'Test One-Time Task',
    type: 'one-time',
    createdAt: '2026-01-01',
    ...overrides,
  }
}

export function createMockDailyTask(overrides: Partial<DailyTask> = {}): DailyTask {
  return {
    id: generateTaskId(),
    title: 'Test Daily Task',
    type: 'daily',
    targetDays: 100,
    completedDates: [],
    createdAt: '2026-01-01',
    ...overrides,
  }
}

export function createMockProgressTask(overrides: Partial<ProgressTask> = {}): ProgressTask {
  return {
    id: generateTaskId(),
    title: 'Test Progress Task',
    type: 'progress',
    targetValue: 1000,
    currentValue: 0,
    unit: 'units',
    createdAt: '2026-01-01',
    ...overrides,
  }
}

// Создать задачу из CreateTaskData (как это делает реальный API)
function createTaskFromData(data: CreateTaskData): Task {
  const base = {
    id: generateTaskId(),
    title: data.title,
    description: data.description,
    createdAt: TEST_DATE,
  }

  switch (data.type) {
    case 'daily':
      return {
        ...base,
        type: 'daily',
        targetDays: data.targetDays ?? 1,
        completedDates: [],
      } as DailyTask
    case 'progress':
      return {
        ...base,
        type: 'progress',
        targetValue: data.targetValue ?? 1,
        currentValue: 0,
        unit: data.unit ?? '',
      } as ProgressTask
    case 'one-time':
      return {
        ...base,
        type: 'one-time',
      } as OneTimeTask
  }
}

// --- MSW Handlers ---
export const handlers = [
  // GET /api/tasks — список задач
  http.get('*/api/tasks', () => {
    return HttpResponse.json(mockTasksStorage)
  }),

  // POST /api/tasks — создание задачи
  http.post('*/api/tasks', async ({ request }) => {
    const data = await request.json() as CreateTaskData
    const newTask = createTaskFromData(data)
    mockTasksStorage.push(newTask)

    return HttpResponse.json(newTask, { status: 201 })
  }),

  // GET /api/tasks/:id — получение задачи
  http.get('*/api/tasks/:id', ({ params }) => {
    const { id } = params
    const task = mockTasksStorage.find(t => t.id === id)

    if (!task) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return HttpResponse.json(task)
  }),

  // PUT /api/tasks/:id — обновление задачи
  http.put('*/api/tasks/:id', async ({ params, request }) => {
    const { id } = params
    const updatedTask = await request.json() as Task

    const index = mockTasksStorage.findIndex(t => t.id === id)
    if (index === -1) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    }

    mockTasksStorage[index] = updatedTask
    return HttpResponse.json(updatedTask)
  }),

  // DELETE /api/tasks/:id — удаление задачи
  http.delete('*/api/tasks/:id', ({ params }) => {
    const { id } = params
    const index = mockTasksStorage.findIndex(t => t.id === id)

    if (index !== -1) {
      mockTasksStorage.splice(index, 1)
    }

    return new HttpResponse(null, { status: 204 })
  }),

  // POST /api/tasks/:id/checkin — check-in
  http.post('*/api/tasks/:id/checkin', async ({ params, request }) => {
    const { id } = params
    const task = mockTasksStorage.find(t => t.id === id)

    if (!task) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await request.json() as { completed: boolean; value?: number }
    const { completed, value } = body

    if (completed) {
      switch (task.type) {
        case 'daily': {
          const dailyTask = task as DailyTask
          if (!dailyTask.completedDates.includes(TEST_DATE)) {
            dailyTask.completedDates.push(TEST_DATE)
          }
          break
        }
        case 'progress': {
          const progressTask = task as ProgressTask
          if (value !== undefined && value > 0) {
            progressTask.currentValue += value
          }
          break
        }
        case 'one-time': {
          const oneTimeTask = task as OneTimeTask
          oneTimeTask.completedAt = TEST_DATE
          break
        }
      }
    }

    return HttpResponse.json(task)
  }),

  // GET /api/auth/me — текущий пользователь (для аутентификации)
  http.get('*/api/auth/me', () => {
    return HttpResponse.json({
      id: 'test-user-1',
      twitchId: '12345',
      username: 'test_user',
      displayName: 'Test User',
      avatarUrl: 'https://example.com/avatar.png',
      isPublic: false,
    })
  }),
]

// --- Worker instance ---
let worker: ReturnType<typeof setupWorker> | null = null

export async function startMockServer(): Promise<void> {
  if (worker) {
    // Уже запущен
    return
  }

  worker = setupWorker(...handlers)

  await worker.start({
    onUnhandledRequest: 'bypass', // Пропускаем необработанные запросы (для статики и т.д.)
    quiet: true, // Не спамим в консоль
  })
}

export async function stopMockServer(): Promise<void> {
  if (worker) {
    worker.stop()
    worker = null
  }
}

export function resetHandlers(): void {
  if (worker) {
    worker.resetHandlers()
  }
}
