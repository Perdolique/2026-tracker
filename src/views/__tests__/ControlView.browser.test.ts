import { describe, it, expect, beforeEach } from 'vitest'
import { render } from 'vitest-browser-vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import ControlView from '../ControlView.vue'
import HomeView from '../HomeView.vue'
import type { OneTimeTask, DailyTask, ProgressTask } from '@/models/task'

const STORAGE_KEY = '2026-tracker:tasks'

function createTestRouter() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'home', component: HomeView },
      { path: '/control', name: 'control', component: ControlView },
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

function getCurrentDate(): string {
  const [date] = new Date().toISOString().split('T')
  return date ?? ''
}

describe('ControlView - Browser Tests', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('should complete one-time task when clicking "Да"', async () => {
    // Создаём незавершённую one-time task в localStorage
    const task: OneTimeTask = {
      id: 'test-task-1',
      title: 'Сделать тестовую таску',
      type: 'one-time',
      createdAt: '2026-01-01',
      isArchived: false,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify([task]))

    const router = createTestRouter()
    const pinia = createPinia()

    await router.push('/control')
    await router.isReady()

    const screen = render(ControlView, {
      global: {
        plugins: [router, pinia],
      },
    })

    // Ждём загрузки задач и отображения wizard
    await waitFor(() => {
      try {
        screen.getByText('Сделать тестовую таску')
        return true
      } catch {
        return false
      }
    })

    // Проверяем наличие кнопок
    const yesButton = screen.getByText(/✓\s*Да/i)
    const noButton = screen.getByText(/✕\s*Нет/i)
    expect(yesButton).toBeDefined()
    expect(noButton).toBeDefined()

    // Кликаем "Да"
    await yesButton.click()

    // Ждём обновления localStorage (API имеет задержку 50ms)
    const today = getCurrentDate()
    await waitFor(() => {
      const tasks = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || '[]',
      ) as OneTimeTask[]
      const updatedTask = tasks.find((t) => t.id === 'test-task-1')
      return (
        updatedTask !== undefined &&
        updatedTask.completedAt === today &&
        updatedTask.isArchived === true
      )
    })

    // Финальная проверка состояния задачи
    const tasks = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || '[]',
    ) as OneTimeTask[]
    const completedTask = tasks.find((t) => t.id === 'test-task-1')

    expect(completedTask).toBeDefined()
    expect(completedTask?.completedAt).toBe(today)
    expect(completedTask?.isArchived).toBe(true)

    // Проверяем, что показан экран "Готово!" (это была единственная задача)
    await waitFor(() => {
      try {
        screen.getByText(/Готово!/i)
        return true
      } catch {
        return false
      }
    })

    const doneScreen = screen.getByText(/Готово!/i)
    expect(doneScreen).toBeDefined()
  })

  it('should not change one-time task when clicking "Нет"', async () => {
    // Создаём незавершённую one-time task в localStorage
    const task: OneTimeTask = {
      id: 'test-task-2',
      title: 'Проверка кнопки Нет',
      type: 'one-time',
      createdAt: '2026-01-01',
      isArchived: false,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify([task]))

    const router = createTestRouter()
    const pinia = createPinia()

    await router.push('/control')
    await router.isReady()

    const screen = render(ControlView, {
      global: {
        plugins: [router, pinia],
      },
    })

    // Ждём загрузки задач и отображения wizard
    await waitFor(() => {
      try {
        screen.getByText('Проверка кнопки Нет')
        return true
      } catch {
        return false
      }
    })

    // Кликаем "Нет"
    const noButton = screen.getByText(/✕\s*Нет/i)
    await noButton.click()

    // Даём время на возможное обновление (хотя его не должно быть)
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Проверяем, что задача не изменилась
    const tasks = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || '[]',
    ) as OneTimeTask[]
    const unchangedTask = tasks.find((t) => t.id === 'test-task-2')

    expect(unchangedTask).toBeDefined()
    expect(unchangedTask?.completedAt).toBeUndefined()
    expect(unchangedTask?.isArchived).toBe(false)

    // Проверяем, что показан экран "Готово!" (задача пропущена, wizard завершён)
    await waitFor(() => {
      try {
        screen.getByText(/Готово!/i)
        return true
      } catch {
        return false
      }
    })
  })

  it('should handle multiple one-time tasks in sequence', async () => {
    // Создаём две незавершённые one-time tasks
    const task1: OneTimeTask = {
      id: 'test-task-3',
      title: 'Первая таска',
      type: 'one-time',
      createdAt: '2026-01-01',
      isArchived: false,
    }
    const task2: OneTimeTask = {
      id: 'test-task-4',
      title: 'Вторая таска',
      type: 'one-time',
      createdAt: '2026-01-02',
      isArchived: false,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify([task1, task2]))

    const router = createTestRouter()
    const pinia = createPinia()

    await router.push('/control')
    await router.isReady()

    const screen = render(ControlView, {
      global: {
        plugins: [router, pinia],
      },
    })

    // Ждём загрузки первой задачи
    await waitFor(() => {
      try {
        screen.getByText('Первая таска')
        return true
      } catch {
        return false
      }
    })

    // Кликаем "Да" на первой задаче
    const yesButton1 = screen.getByText(/✓\s*Да/i)
    await yesButton1.click()

    // Ждём обновления и появления второй задачи
    await waitFor(() => {
      try {
        screen.getByText('Вторая таска')
        return true
      } catch {
        return false
      }
    })

    // Кликаем "Нет" на второй задаче
    const noButton2 = screen.getByText(/✕\s*Нет/i)
    await noButton2.click()

    // Ждём завершения wizard
    await waitFor(() => {
      try {
        screen.getByText(/Готово!/i)
        return true
      } catch {
        return false
      }
    })

    // Проверяем финальное состояние задач
    const today = getCurrentDate()
    const tasks = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || '[]',
    ) as OneTimeTask[]

    const finalTask1 = tasks.find((t) => t.id === 'test-task-3')
    const finalTask2 = tasks.find((t) => t.id === 'test-task-4')

    // Первая таска должна быть выполнена и заархивирована
    expect(finalTask1?.completedAt).toBe(today)
    expect(finalTask1?.isArchived).toBe(true)

    // Вторая таска должна остаться без изменений
    expect(finalTask2?.completedAt).toBeUndefined()
    expect(finalTask2?.isArchived).toBe(false)
  })

  describe('Daily Tasks', () => {
    it('should add date to completedDates when clicking "Да"', async () => {
      const task: DailyTask = {
        id: 'daily-1',
        title: 'Бегать каждый день',
        type: 'daily',
        targetDays: 100,
        completedDates: ['2026-01-01', '2026-01-02'],
        createdAt: '2026-01-01',
        isArchived: false,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify([task]))

      const router = createTestRouter()
      const pinia = createPinia()

      await router.push('/control')
      await router.isReady()

      const screen = render(ControlView, {
        global: {
          plugins: [router, pinia],
        },
      })

      await waitFor(() => {
        try {
          screen.getByText('Бегать каждый день')
          return true
        } catch {
          return false
        }
      })

      const yesButton = screen.getByText(/✓\s*Да/i)
      await yesButton.click()

      const today = getCurrentDate()
      await waitFor(() => {
        const tasks = JSON.parse(
          localStorage.getItem(STORAGE_KEY) || '[]',
        ) as DailyTask[]
        const updatedTask = tasks.find((t) => t.id === 'daily-1')
        return updatedTask?.completedDates.includes(today) ?? false
      })

      const tasks = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || '[]',
      ) as DailyTask[]
      const completedTask = tasks.find((t) => t.id === 'daily-1')

      expect(completedTask?.completedDates).toContain(today)
      expect(completedTask?.completedDates.length).toBe(3)
      expect(completedTask?.isArchived).toBe(false) // Не заархивирована, т.к. 3/100
    })

    it('should not change task when clicking "Нет"', async () => {
      const task: DailyTask = {
        id: 'daily-2',
        title: 'Читать книгу',
        type: 'daily',
        targetDays: 50,
        completedDates: ['2026-01-01'],
        createdAt: '2026-01-01',
        isArchived: false,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify([task]))

      const router = createTestRouter()
      const pinia = createPinia()

      await router.push('/control')
      await router.isReady()

      const screen = render(ControlView, {
        global: {
          plugins: [router, pinia],
        },
      })

      await waitFor(() => {
        try {
          screen.getByText('Читать книгу')
          return true
        } catch {
          return false
        }
      })

      const noButton = screen.getByText(/✕\s*Нет/i)
      await noButton.click()

      await new Promise((resolve) => setTimeout(resolve, 100))

      const tasks = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || '[]',
      ) as DailyTask[]
      const unchangedTask = tasks.find((t) => t.id === 'daily-2')

      expect(unchangedTask?.completedDates).toEqual(['2026-01-01'])
      expect(unchangedTask?.isArchived).toBe(false)
    })

    it('should auto-archive when reaching targetDays', async () => {
      const task: DailyTask = {
        id: 'daily-3',
        title: 'Медитация',
        type: 'daily',
        targetDays: 3,
        completedDates: ['2026-01-01', '2026-01-02'],
        createdAt: '2026-01-01',
        isArchived: false,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify([task]))

      const router = createTestRouter()
      const pinia = createPinia()

      await router.push('/control')
      await router.isReady()

      const screen = render(ControlView, {
        global: {
          plugins: [router, pinia],
        },
      })

      await waitFor(() => {
        try {
          screen.getByText('Медитация')
          return true
        } catch {
          return false
        }
      })

      const yesButton = screen.getByText(/✓\s*Да/i)
      await yesButton.click()

      const today = getCurrentDate()
      await waitFor(() => {
        const tasks = JSON.parse(
          localStorage.getItem(STORAGE_KEY) || '[]',
        ) as DailyTask[]
        const updatedTask = tasks.find((t) => t.id === 'daily-3')
        return updatedTask?.isArchived === true
      })

      const tasks = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || '[]',
      ) as DailyTask[]
      const completedTask = tasks.find((t) => t.id === 'daily-3')

      expect(completedTask?.completedDates).toContain(today)
      expect(completedTask?.completedDates.length).toBe(3)
      expect(completedTask?.isArchived).toBe(true)
    })

    it('should prevent duplicate date when checking in same day twice', async () => {
      const today = getCurrentDate()
      const task: DailyTask = {
        id: 'daily-4',
        title: 'Йога',
        type: 'daily',
        targetDays: 100,
        completedDates: [today], // Уже отмечено сегодня
        createdAt: '2026-01-01',
        isArchived: false,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify([task]))

      const router = createTestRouter()
      const pinia = createPinia()

      await router.push('/control')
      await router.isReady()

      const screen = render(ControlView, {
        global: {
          plugins: [router, pinia],
        },
      })

      await waitFor(() => {
        try {
          screen.getByText('Йога')
          return true
        } catch {
          return false
        }
      })

      const yesButton = screen.getByText(/✓\s*Да/i)
      await yesButton.click()

      await new Promise((resolve) => setTimeout(resolve, 150))

      const tasks = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || '[]',
      ) as DailyTask[]
      const completedTask = tasks.find((t) => t.id === 'daily-4')

      expect(completedTask?.completedDates).toEqual([today])
      expect(completedTask?.completedDates.length).toBe(1) // Не добавился дубль
    })
  })

  describe('Progress Tasks', () => {
    it('should show value input after clicking "Да"', async () => {
      const task: ProgressTask = {
        id: 'progress-1',
        title: 'Пройти 1000000 шагов',
        type: 'progress',
        targetValue: 1000000,
        currentValue: 500000,
        unit: 'шагов',
        createdAt: '2026-01-01',
        isArchived: false,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify([task]))

      const router = createTestRouter()
      const pinia = createPinia()

      await router.push('/control')
      await router.isReady()

      const screen = render(ControlView, {
        global: {
          plugins: [router, pinia],
        },
      })

      await waitFor(() => {
        try {
          screen.getByText('Пройти 1000000 шагов')
          return true
        } catch {
          return false
        }
      })

      const yesButton = screen.getByText(/✓\s*Да/i)
      await yesButton.click()

      // Должен появиться input для ввода значения
      await waitFor(() => {
        try {
          screen.getByText(/Сколько шагов сегодня\?/i)
          return true
        } catch {
          return false
        }
      })

      const inputLabel = screen.getByText(/Сколько шагов сегодня\?/i)
      expect(inputLabel).toBeDefined()
    })

    it('should accumulate value when submitting progress', async () => {
      const task: ProgressTask = {
        id: 'progress-2',
        title: 'Накопить деньги',
        type: 'progress',
        targetValue: 100000,
        currentValue: 50000,
        unit: '₽',
        createdAt: '2026-01-01',
        isArchived: false,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify([task]))

      const router = createTestRouter()
      const pinia = createPinia()

      await router.push('/control')
      await router.isReady()

      const screen = render(ControlView, {
        global: {
          plugins: [router, pinia],
        },
      })

      await waitFor(() => {
        try {
          screen.getByText('Накопить деньги')
          return true
        } catch {
          return false
        }
      })

      const yesButton = screen.getByText(/✓\s*Да/i)
      await yesButton.click()

      await waitFor(() => {
        try {
          screen.getByText(/Сколько ₽ сегодня\?/i)
          return true
        } catch {
          return false
        }
      })

      // Находим input и вводим значение
      const input = screen.getByPlaceholder(/Введи количество ₽/i)
      await input.fill('15000')

      // Находим кнопку подтверждения
      const confirmButton = screen.getByText(/Записать/i)
      await confirmButton.click()

      await waitFor(() => {
        const tasks = JSON.parse(
          localStorage.getItem(STORAGE_KEY) || '[]',
        ) as ProgressTask[]
        const updatedTask = tasks.find((t) => t.id === 'progress-2')
        return updatedTask?.currentValue === 65000
      })

      const tasks = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || '[]',
      ) as ProgressTask[]
      const progressTask = tasks.find((t) => t.id === 'progress-2')

      expect(progressTask?.currentValue).toBe(65000)
      expect(progressTask?.isArchived).toBe(false) // 65000/100000
    })

    it('should not change task when clicking "Пропустить"', async () => {
      const task: ProgressTask = {
        id: 'progress-3',
        title: 'Бегать километры',
        type: 'progress',
        targetValue: 500,
        currentValue: 200,
        unit: 'км',
        createdAt: '2026-01-01',
        isArchived: false,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify([task]))

      const router = createTestRouter()
      const pinia = createPinia()

      await router.push('/control')
      await router.isReady()

      const screen = render(ControlView, {
        global: {
          plugins: [router, pinia],
        },
      })

      await waitFor(() => {
        try {
          screen.getByText('Бегать километры')
          return true
        } catch {
          return false
        }
      })

      const yesButton = screen.getByText(/✓\s*Да/i)
      await yesButton.click()

      await waitFor(() => {
        try {
          screen.getByText(/Сколько км сегодня\?/i)
          return true
        } catch {
          return false
        }
      })

      const skipButton = screen.getByText(/Пропустить/i)
      await skipButton.click()

      await new Promise((resolve) => setTimeout(resolve, 100))

      const tasks = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || '[]',
      ) as ProgressTask[]
      const unchangedTask = tasks.find((t) => t.id === 'progress-3')

      expect(unchangedTask?.currentValue).toBe(200)
      expect(unchangedTask?.isArchived).toBe(false)
    })

    it('should auto-archive when reaching targetValue', async () => {
      const task: ProgressTask = {
        id: 'progress-4',
        title: 'Прочитать 1000 страниц',
        type: 'progress',
        targetValue: 1000,
        currentValue: 950,
        unit: 'страниц',
        createdAt: '2026-01-01',
        isArchived: false,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify([task]))

      const router = createTestRouter()
      const pinia = createPinia()

      await router.push('/control')
      await router.isReady()

      const screen = render(ControlView, {
        global: {
          plugins: [router, pinia],
        },
      })

      await waitFor(() => {
        try {
          screen.getByText('Прочитать 1000 страниц')
          return true
        } catch {
          return false
        }
      })

      const yesButton = screen.getByText(/✓\s*Да/i)
      await yesButton.click()

      await waitFor(() => {
        try {
          screen.getByText(/Сколько страниц сегодня\?/i)
          return true
        } catch {
          return false
        }
      })

      const input = screen.getByPlaceholder(/Введи количество страниц/i)
      await input.fill('60')

      const confirmButton = screen.getByText(/Записать/i)
      await confirmButton.click()

      await waitFor(() => {
        const tasks = JSON.parse(
          localStorage.getItem(STORAGE_KEY) || '[]',
        ) as ProgressTask[]
        const updatedTask = tasks.find((t) => t.id === 'progress-4')
        return updatedTask?.isArchived === true
      })

      const tasks = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || '[]',
      ) as ProgressTask[]
      const completedTask = tasks.find((t) => t.id === 'progress-4')

      expect(completedTask?.currentValue).toBe(1010)
      expect(completedTask?.isArchived).toBe(true)
    })

    it('should auto-archive when reaching exactly targetValue', async () => {
      const task: ProgressTask = {
        id: 'progress-5',
        title: 'Точный таргет',
        type: 'progress',
        targetValue: 500,
        currentValue: 450,
        unit: 'единиц',
        createdAt: '2026-01-01',
        isArchived: false,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify([task]))

      const router = createTestRouter()
      const pinia = createPinia()

      await router.push('/control')
      await router.isReady()

      const screen = render(ControlView, {
        global: {
          plugins: [router, pinia],
        },
      })

      await waitFor(() => {
        try {
          screen.getByText('Точный таргет')
          return true
        } catch {
          return false
        }
      })

      const yesButton = screen.getByText(/✓\s*Да/i)
      await yesButton.click()

      await waitFor(() => {
        try {
          screen.getByText(/Сколько единиц сегодня\?/i)
          return true
        } catch {
          return false
        }
      })

      const input = screen.getByPlaceholder(/Введи количество единиц/i)
      await input.fill('50')

      const confirmButton = screen.getByText(/Записать/i)
      await confirmButton.click()

      await waitFor(() => {
        const tasks = JSON.parse(
          localStorage.getItem(STORAGE_KEY) || '[]',
        ) as ProgressTask[]
        const updatedTask = tasks.find((t) => t.id === 'progress-5')
        return updatedTask?.isArchived === true
      })

      const tasks = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || '[]',
      ) as ProgressTask[]
      const completedTask = tasks.find((t) => t.id === 'progress-5')

      expect(completedTask?.currentValue).toBe(500)
      expect(completedTask?.isArchived).toBe(true)
    })
  })

  describe('Mixed Task Types', () => {
    it('should handle daily + progress + one-time in one session', async () => {
      const dailyTask: DailyTask = {
        id: 'mixed-daily',
        title: 'Daily задача',
        type: 'daily',
        targetDays: 100,
        completedDates: [],
        createdAt: '2026-01-01',
        isArchived: false,
      }

      const progressTask: ProgressTask = {
        id: 'mixed-progress',
        title: 'Progress задача',
        type: 'progress',
        targetValue: 1000,
        currentValue: 100,
        unit: 'очков',
        createdAt: '2026-01-01',
        isArchived: false,
      }

      const oneTimeTask: OneTimeTask = {
        id: 'mixed-onetime',
        title: 'One-time задача',
        type: 'one-time',
        createdAt: '2026-01-01',
        isArchived: false,
      }

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([dailyTask, progressTask, oneTimeTask]),
      )

      const router = createTestRouter()
      const pinia = createPinia()

      await router.push('/control')
      await router.isReady()

      const screen = render(ControlView, {
        global: {
          plugins: [router, pinia],
        },
      })

      // Daily задача - нажать "Да"
      await waitFor(() => {
        try {
          screen.getByText('Daily задача')
          return true
        } catch {
          return false
        }
      })

      let yesButton = screen.getByText(/✓\s*Да/i)
      await yesButton.click()

      // Progress задача - нажать "Да" и ввести значение
      await waitFor(() => {
        try {
          screen.getByText('Progress задача')
          return true
        } catch {
          return false
        }
      })

      yesButton = screen.getByText(/✓\s*Да/i)
      await yesButton.click()

      await waitFor(() => {
        try {
          screen.getByText(/Сколько очков сегодня\?/i)
          return true
        } catch {
          return false
        }
      })

      // Ждём появления input
      await waitFor(() => {
        try {
          screen.getByPlaceholder(/Введи количество очков/i)
          return true
        } catch {
          return false
        }
      })

      const input = screen.getByPlaceholder(/Введи количество очков/i)
      await input.fill('250')

      const confirmButton = screen.getByText(/Записать/i)
      await confirmButton.click()

      // One-time задача - нажать "Нет"
      await waitFor(() => {
        try {
          screen.getByText('One-time задача')
          return true
        } catch {
          return false
        }
      })

      const noButton = screen.getByText(/✕\s*Нет/i)
      await noButton.click()

      // Проверяем финальное состояние
      await waitFor(() => {
        try {
          screen.getByText(/Готово!/i)
          return true
        } catch {
          return false
        }
      })

      const today = getCurrentDate()
      const tasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')

      const finalDaily = tasks.find((t: DailyTask) => t.id === 'mixed-daily')
      const finalProgress = tasks.find(
        (t: ProgressTask) => t.id === 'mixed-progress',
      )
      const finalOneTime = tasks.find(
        (t: OneTimeTask) => t.id === 'mixed-onetime',
      )

      expect(finalDaily?.completedDates).toContain(today)
      expect(finalDaily?.isArchived).toBe(false)

      expect(finalProgress?.currentValue).toBe(350)
      expect(finalProgress?.isArchived).toBe(false)

      expect(finalOneTime?.completedAt).toBeUndefined()
      expect(finalOneTime?.isArchived).toBe(false)
    })

    it('should handle multiple tasks with auto-archiving', async () => {
      const dailyTaskComplete: DailyTask = {
        id: 'auto-daily',
        title: 'Daily завершается',
        type: 'daily',
        targetDays: 2,
        completedDates: ['2026-01-01'],
        createdAt: '2026-01-01',
        isArchived: false,
      }

      const progressTaskComplete: ProgressTask = {
        id: 'auto-progress',
        title: 'Progress завершается',
        type: 'progress',
        targetValue: 100,
        currentValue: 80,
        unit: 'баллов',
        createdAt: '2026-01-01',
        isArchived: false,
      }

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([dailyTaskComplete, progressTaskComplete]),
      )

      const router = createTestRouter()
      const pinia = createPinia()

      await router.push('/control')
      await router.isReady()

      const screen = render(ControlView, {
        global: {
          plugins: [router, pinia],
        },
      })

      // Daily задача - достигаем цели
      await waitFor(() => {
        try {
          screen.getByText('Daily завершается')
          return true
        } catch {
          return false
        }
      })

      let yesButton = screen.getByText(/✓\s*Да/i)
      await yesButton.click()

      // Progress задача - достигаем цели
      await waitFor(() => {
        try {
          screen.getByText('Progress завершается')
          return true
        } catch {
          return false
        }
      })

      yesButton = screen.getByText(/✓\s*Да/i)
      await yesButton.click()

      await waitFor(() => {
        try {
          screen.getByText(/Сколько баллов сегодня\?/i)
          return true
        } catch {
          return false
        }
      })

      // Ждём появления input
      await waitFor(() => {
        try {
          screen.getByPlaceholder(/Введи количество баллов/i)
          return true
        } catch {
          return false
        }
      })

      const input = screen.getByPlaceholder(/Введи количество баллов/i)
      await input.fill('25')

      const confirmButton = screen.getByText(/Записать/i)
      await confirmButton.click()

      // Ждём завершения
      await waitFor(() => {
        try {
          screen.getByText(/Готово!/i)
          return true
        } catch {
          return false
        }
      })

      // Ждём завершения всех async операций
      await new Promise(resolve => setTimeout(resolve, 200))

      const tasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')

      const finalDaily = tasks.find((t: DailyTask) => t.id === 'auto-daily')
      const finalProgress = tasks.find(
        (t: ProgressTask) => t.id === 'auto-progress',
      )

      expect(finalDaily?.completedDates.length).toBe(2)
      expect(finalDaily?.isArchived).toBe(true)

      expect(finalProgress?.currentValue).toBe(105)
      expect(finalProgress?.isArchived).toBe(true)
    })
  })
})
