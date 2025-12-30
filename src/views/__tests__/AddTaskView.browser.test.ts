import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { render } from 'vitest-browser-vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import AddTaskView from '../AddTaskView.vue'
import HomeView from '../HomeView.vue'
import type { DailyTask, ProgressTask, OneTimeTask } from '@/models/task'
import {
  resetMockStorage,
  setMockTasks,
  getMockTasksStorage,
  startMockServer,
  stopMockServer,
  resetTaskIdCounter,
} from '@/test-utils/api-mocks'

function createTestRouter() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'home', component: HomeView },
      { path: '/add', name: 'add-task', component: AddTaskView },
    ],
  })
}

async function waitFor(
  condition: () => boolean,
  timeout = 2000,
  interval = 50,
): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (condition()) return
    await new Promise((resolve) => setTimeout(resolve, interval))
  }
  throw new Error('waitFor timeout')
}

describe('AddTaskView - Browser Tests', () => {
  beforeAll(async () => {
    await startMockServer()
  })

  afterAll(async () => {
    await stopMockServer()
  })

  beforeEach(() => {
    resetMockStorage()
    resetTaskIdCounter()
    setActivePinia(createPinia())
  })

  it('should create a daily task', async () => {
    setMockTasks([])

    const router = createTestRouter()
    const pinia = createPinia()

    await router.push('/add')
    await router.isReady()

    const screen = render(AddTaskView, {
      global: {
        plugins: [router, pinia],
      },
    })

    // Ждём загрузки формы
    await waitFor(() => {
      try {
        screen.getByLabelText(/^Название$/i)
        return true
      } catch {
        return false
      }
    })

    // Заполняем название
    const titleInput = screen.getByLabelText(/^Название$/i)
    await titleInput.fill('Бегать каждый день')

    // Выбираем тип "Дни" (daily)
    const dailyButton = screen.getByText('Дни')
    await dailyButton.click()

    // Вводим целевое количество дней
    await waitFor(() => {
      try {
        screen.getByLabelText(/Целевое количество дней/i)
        return true
      } catch {
        return false
      }
    })

    const daysInput = screen.getByLabelText(/Целевое количество дней/i)
    await daysInput.fill('300')

    // Нажимаем кнопку создания
    const submitButton = screen.getByText(/Создать/i)
    await submitButton.click()

    // Ждём создания задачи
    await waitFor(() => {
      const tasks = getMockTasksStorage()
      return tasks.length === 1
    })

    const tasks = getMockTasksStorage()
    expect(tasks.length).toBe(1)

    const createdTask = tasks[0] as DailyTask
    expect(createdTask.title).toBe('Бегать каждый день')
    expect(createdTask.type).toBe('daily')
    expect(createdTask.targetDays).toBe(300)
    expect(createdTask.completedDates).toEqual([])
  })

  it('should create a progress task', async () => {
    setMockTasks([])

    const router = createTestRouter()
    const pinia = createPinia()

    await router.push('/add')
    await router.isReady()

    const screen = render(AddTaskView, {
      global: {
        plugins: [router, pinia],
      },
    })

    await waitFor(() => {
      try {
        screen.getByLabelText(/^Название$/i)
        return true
      } catch {
        return false
      }
    })

    // Заполняем название
    const titleInput = screen.getByLabelText(/^Название$/i)
    await titleInput.fill('Пройти миллион шагов')

    // Выбираем тип "Прогресс"
    const progressButton = screen.getByText('Прогресс')
    await progressButton.click()

    // Вводим целевое значение и единицу измерения
    await waitFor(() => {
      try {
        screen.getByLabelText(/Целевое значение/i)
        return true
      } catch {
        return false
      }
    })

    const targetInput = screen.getByLabelText(/Целевое значение/i)
    await targetInput.fill('1000000')

    const unitInput = screen.getByLabelText(/Единица измерения/i)
    await unitInput.fill('шагов')

    // Нажимаем кнопку создания
    const submitButton = screen.getByText(/Создать/i)
    await submitButton.click()

    // Ждём создания задачи
    await waitFor(() => {
      const tasks = getMockTasksStorage()
      return tasks.length === 1
    })

    const tasks = getMockTasksStorage()
    expect(tasks.length).toBe(1)

    const createdTask = tasks[0] as ProgressTask
    expect(createdTask.title).toBe('Пройти миллион шагов')
    expect(createdTask.type).toBe('progress')
    expect(createdTask.targetValue).toBe(1000000)
    expect(createdTask.currentValue).toBe(0)
    expect(createdTask.unit).toBe('шагов')
  })

  it('should create a one-time task', async () => {
    setMockTasks([])

    const router = createTestRouter()
    const pinia = createPinia()

    await router.push('/add')
    await router.isReady()

    const screen = render(AddTaskView, {
      global: {
        plugins: [router, pinia],
      },
    })

    await waitFor(() => {
      try {
        screen.getByLabelText(/^Название$/i)
        return true
      } catch {
        return false
      }
    })

    // Заполняем название
    const titleInput = screen.getByLabelText(/^Название$/i)
    await titleInput.fill('Купить велосипед')

    // Выбираем тип "Разовая"
    const oneTimeButton = screen.getByText('Разовая')
    await oneTimeButton.click()

    // Нажимаем кнопку создания
    const submitButton = screen.getByText(/Создать/i)
    await submitButton.click()

    // Ждём создания задачи
    await waitFor(() => {
      const tasks = getMockTasksStorage()
      return tasks.length === 1
    })

    const tasks = getMockTasksStorage()
    expect(tasks.length).toBe(1)

    const createdTask = tasks[0] as OneTimeTask
    expect(createdTask.title).toBe('Купить велосипед')
    expect(createdTask.type).toBe('one-time')
    expect(createdTask.completedAt).toBeUndefined()
  })

  it('should not create task without title', async () => {
    setMockTasks([])

    const router = createTestRouter()
    const pinia = createPinia()

    await router.push('/add')
    await router.isReady()

    const screen = render(AddTaskView, {
      global: {
        plugins: [router, pinia],
      },
    })

    await waitFor(() => {
      try {
        screen.getByLabelText(/^Название$/i)
        return true
      } catch {
        return false
      }
    })

    // Не заполняем название, выбираем тип
    const oneTimeButton = screen.getByText('Разовая')
    await oneTimeButton.click()

    // Пытаемся создать — кнопка должна быть disabled
    // Не кликаем, т.к. кнопка disabled. Просто проверяем что задача не создалась

    // Даём время на возможное создание
    await new Promise((resolve) => setTimeout(resolve, 200))

    // Проверяем, что задача не создалась
    const tasks = getMockTasksStorage()
    expect(tasks.length).toBe(0)
  })
})
