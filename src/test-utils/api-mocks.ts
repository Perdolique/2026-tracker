import { http, HttpResponse, type PathParams } from 'msw'
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
const DAILY_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

interface UpdateTaskRequest {
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

function generateTaskId(): string {
  taskIdCounter += 1
  return `test-task-${taskIdCounter}`
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
    updatedAt: overrides.updatedAt ?? '2026-01-01',
    checkInEnabled: true,
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
    updatedAt: overrides.updatedAt ?? '2026-01-01',
    checkInEnabled: true,
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
    completedValues: [],
    createdAt: '2026-01-01',
    updatedAt: overrides.updatedAt ?? '2026-01-01',
    checkInEnabled: true,
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
    updatedAt: TEST_DATE,
    checkInEnabled: data.checkInEnabled ?? false,
  }

  switch (data.type) {
    case 'daily': {
      return {
        ...base,
        type: 'daily',
        targetDays: data.targetDays ?? 1,
        completedDates: [],
      } satisfies DailyTask
    }
    case 'progress': {
      return {
        ...base,
        type: 'progress',
        targetValue: data.targetValue ?? 1,
        currentValue: 0,
        unit: data.unit ?? '',
        completedValues: [],
      } satisfies ProgressTask
    }
    case 'one-time': {
      return {
        ...base,
        type: 'one-time',
      } satisfies OneTimeTask
    }
  }
}

// --- MSW Handlers ---
export const handlers = [
  // GET /api/tasks — список задач
  http.get('*/api/tasks', () => HttpResponse.json(mockTasksStorage)),

  // POST /api/tasks — создание задачи
  http.post<PathParams, CreateTaskData>('*/api/tasks', async ({ request }) => {
    const data = await request.json()
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

  // PUT /api/tasks/:id — обновление метаданных задачи (без истории completion)
  http.put<PathParams, UpdateTaskRequest>('*/api/tasks/:id', async ({ params, request }) => {
    const { id } = params
    const requestTask = await request.json()

    const index = mockTasksStorage.findIndex(t => t.id === id)
    if (index === -1) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const currentTask = mockTasksStorage[index]
    if (!currentTask || requestTask.id !== currentTask.id || requestTask.type !== currentTask.type) {
      return HttpResponse.json({ error: 'Invalid task update payload' }, { status: 400 })
    }

    const baseTask = {
      ...currentTask,
      title: requestTask.title,
      description: requestTask.description,
      checkInEnabled: requestTask.checkInEnabled,
      updatedAt: TEST_DATE,
    }

    switch (currentTask.type) {
      case 'daily': {
        mockTasksStorage[index] = {
          ...baseTask,
          type: 'daily',
          targetDays: requestTask.targetDays ?? currentTask.targetDays,
          completedDates: [...currentTask.completedDates],
        }
        break
      }

      case 'progress': {
        mockTasksStorage[index] = {
          ...baseTask,
          type: 'progress',
          targetValue: requestTask.targetValue ?? currentTask.targetValue,
          currentValue: currentTask.currentValue,
          unit: requestTask.unit ?? currentTask.unit,
          completedValues: [...currentTask.completedValues],
        }
        break
      }

      case 'one-time': {
        mockTasksStorage[index] = {
          ...baseTask,
          type: 'one-time',
          completedAt: requestTask.completedAt,
        } satisfies OneTimeTask
        break
      }
    }

    return HttpResponse.json(mockTasksStorage[index])
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
  http.post<PathParams, { completed: boolean; value?: number }>('*/api/tasks/:id/checkin', async ({ params, request }) => {
    const { id } = params
    const task = mockTasksStorage.find(t => t.id === id)

    if (!task) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await request.json()
    const { completed, value } = body

    if (completed) {
      switch (task.type) {
        case 'daily': {
          const dailyTask = task
          if (!dailyTask.completedDates.includes(TEST_DATE)) {
            dailyTask.completedDates.push(TEST_DATE)
            dailyTask.updatedAt = TEST_DATE
          }
          break
        }
        case 'progress': {
          const progressTask = task
          if (value !== undefined && value > 0) {
            // Use TEST_DATE-based timestamp for consistency
            const timestamp = `${TEST_DATE}T12:00:00.000Z`
            const newId = Math.max(0, ...progressTask.completedValues.map(cv => cv.id)) + 1
            progressTask.completedValues.push({ id: newId, date: timestamp, value })
            progressTask.currentValue += value
            progressTask.updatedAt = TEST_DATE
          }
          break
        }
        case 'one-time': {
          const oneTimeTask = task
          oneTimeTask.completedAt = TEST_DATE
          oneTimeTask.updatedAt = TEST_DATE
          break
        }
      }
    }

    return HttpResponse.json(task)
  }),

  // POST /api/tasks/:id/daily-completions — добавить дату daily-задаче
  http.post<PathParams, { date: string }>('*/api/tasks/:id/daily-completions', async ({ params, request }) => {
    const { id } = params
    const task = mockTasksStorage.find(t => t.id === id)

    if (task?.type !== 'daily') {
      return HttpResponse.json({ error: 'Task not found or not a daily task' }, { status: 404 })
    }

    const { date } = await request.json()
    const hasValidDateFormat = DAILY_DATE_PATTERN.test(date)
    if (!hasValidDateFormat) {
      return HttpResponse.json({ error: 'Invalid date' }, { status: 400 })
    }

    if (!task.completedDates.includes(date)) {
      task.completedDates.push(date)
      task.updatedAt = TEST_DATE
    }

    return HttpResponse.json(task)
  }),

  // DELETE /api/tasks/:taskId/daily-completions/:date — удалить одну дату
  http.delete('*/api/tasks/:taskId/daily-completions/:date', ({ params }) => {
    const { taskId: taskIdParam, date: rawDateParam } = params
    const taskId = Array.isArray(taskIdParam) ? (taskIdParam[0] ?? '') : (taskIdParam ?? '')
    const rawDate = Array.isArray(rawDateParam) ? rawDateParam[0] : rawDateParam
    const date = rawDate === undefined ? '' : decodeURIComponent(rawDate)
    const task = mockTasksStorage.find(t => t.id === taskId)

    if (task?.type !== 'daily') {
      return HttpResponse.json({ error: 'Task not found or not a daily task' }, { status: 404 })
    }

    const hasValidDateFormat = DAILY_DATE_PATTERN.test(date)
    if (!hasValidDateFormat) {
      return HttpResponse.json({ error: 'Invalid date' }, { status: 400 })
    }

    const index = task.completedDates.indexOf(date)
    if (index === -1) {
      return HttpResponse.json({ error: 'Date not found' }, { status: 404 })
    }

    task.completedDates.splice(index, 1)
    task.updatedAt = TEST_DATE

    return HttpResponse.json(task)
  }),

  // GET /api/auth/me — текущий пользователь (для аутентификации)
  http.get('*/api/auth/me', () => HttpResponse.json({
      id: 'test-user-1',
      twitchId: '12345',
      username: 'test_user',
      displayName: 'Test User',
      avatarUrl: 'https://example.com/avatar.png',
      isPublic: false,
    })),
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

export function stopMockServer() {
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
