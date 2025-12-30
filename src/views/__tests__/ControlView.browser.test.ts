import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { render } from 'vitest-browser-vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import ControlView from '../ControlView.vue'
import HomeView from '../HomeView.vue'
import type { OneTimeTask, DailyTask, ProgressTask } from '@/models/task'
import {
  TEST_DATE,
  resetMockStorage,
  setMockTasks,
  getMockTasksStorage,
  startMockServer,
  stopMockServer,
  resetTaskIdCounter,
} from '@/test-utils/api-mocks'
import { createTestI18n } from '@/test-utils/i18n'

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

describe('ControlView - Browser Tests', () => {
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

  it('should complete one-time task when clicking "Yes"', async () => {
    const task: OneTimeTask = {
      id: 'test-task-1',
      title: 'Test task',
      type: 'one-time',
      createdAt: '2026-01-01',
    }
    setMockTasks([task])

    const router = createTestRouter()
    const pinia = createPinia()
    const i18n = createTestI18n()

    await router.push('/control')
    await router.isReady()

    const screen = render(ControlView, {
      global: {
        plugins: [router, pinia, i18n],
      },
    })

    // Wait for tasks to load and wizard to display
    await waitFor(() => {
      try {
        screen.getByText('Test task')
        return true
      } catch {
        return false
      }
    })

    // Check buttons are present
    const yesButton = screen.getByText(/✓\s*Yes/i)
    const noButton = screen.getByText(/✕\s*No/i)
    expect(yesButton).toBeDefined()
    expect(noButton).toBeDefined()

    // Click "Yes"
    await yesButton.click()

    // Wait for storage update (API call via route mock)
    await waitFor(() => {
      const tasks = getMockTasksStorage() as OneTimeTask[]
      const updatedTask = tasks.find((t) => t.id === 'test-task-1')
      return updatedTask?.completedAt === TEST_DATE
    })

    // Check final state
    const tasks = getMockTasksStorage() as OneTimeTask[]
    const completedTask = tasks.find((t) => t.id === 'test-task-1')

    expect(completedTask).toBeDefined()
    expect(completedTask?.completedAt).toBe(TEST_DATE)

    // Check that "All done!" screen is shown
    await waitFor(() => {
      try {
        screen.getByText(/All done!/i)
        return true
      } catch {
        return false
      }
    })

    const doneScreen = screen.getByText(/All done!/i)
    expect(doneScreen).toBeDefined()
  })

  it('should not change one-time task when clicking "No"', async () => {
    const task: OneTimeTask = {
      id: 'test-task-2',
      title: 'Test No button',
      type: 'one-time',
      createdAt: '2026-01-01',
    }
    setMockTasks([task])

    const router = createTestRouter()
    const pinia = createPinia()
    const i18n = createTestI18n()

    await router.push('/control')
    await router.isReady()

    const screen = render(ControlView, {
      global: {
        plugins: [router, pinia, i18n],
      },
    })

    // Wait for tasks to load and wizard to display
    await waitFor(() => {
      try {
        screen.getByText('Test No button')
        return true
      } catch {
        return false
      }
    })

    // Click "No"
    const noButton = screen.getByText(/✕\s*No/i)
    await noButton.click()

    // Give time for potential update
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Check task wasn't changed
    const tasks = getMockTasksStorage() as OneTimeTask[]
    const unchangedTask = tasks.find((t) => t.id === 'test-task-2')

    expect(unchangedTask).toBeDefined()
    expect(unchangedTask?.completedAt).toBeUndefined()

    // Check that "All done!" screen is shown
    await waitFor(() => {
      try {
        screen.getByText(/All done!/i)
        return true
      } catch {
        return false
      }
    })
  })

  it('should handle multiple one-time tasks in sequence', async () => {
    const task1: OneTimeTask = {
      id: 'test-task-3',
      title: 'First task',
      type: 'one-time',
      createdAt: '2026-01-01',
    }
    const task2: OneTimeTask = {
      id: 'test-task-4',
      title: 'Second task',
      type: 'one-time',
      createdAt: '2026-01-02',
    }
    setMockTasks([task1, task2])

    const router = createTestRouter()
    const pinia = createPinia()
    const i18n = createTestI18n()

    await router.push('/control')
    await router.isReady()

    const screen = render(ControlView, {
      global: {
        plugins: [router, pinia, i18n],
      },
    })

    // Wait for first task to load
    await waitFor(() => {
      try {
        screen.getByText('First task')
        return true
      } catch {
        return false
      }
    })

    // Click "Yes" on first task
    const yesButton1 = screen.getByText(/✓\s*Yes/i)
    await yesButton1.click()

    // Wait for second task to appear
    await waitFor(() => {
      try {
        screen.getByText('Second task')
        return true
      } catch {
        return false
      }
    })

    // Click "No" on second task
    const noButton2 = screen.getByText(/✕\s*No/i)
    await noButton2.click()

    // Wait for wizard completion
    await waitFor(() => {
      try {
        screen.getByText(/All done!/i)
        return true
      } catch {
        return false
      }
    })

    // Check final task state
    const tasks = getMockTasksStorage() as OneTimeTask[]

    const finalTask1 = tasks.find((t) => t.id === 'test-task-3')
    const finalTask2 = tasks.find((t) => t.id === 'test-task-4')

    // First task should be completed
    expect(finalTask1?.completedAt).toBe(TEST_DATE)

    // Second task should remain unchanged
    expect(finalTask2?.completedAt).toBeUndefined()
  })

  describe('Daily Tasks', () => {
    it('should add date to completedDates when clicking "Yes"', async () => {
      const task: DailyTask = {
        id: 'daily-1',
        title: 'Run every day',
        type: 'daily',
        targetDays: 100,
        completedDates: ['2026-01-01', '2026-01-02'],
        createdAt: '2026-01-01',
      }
      setMockTasks([task])

      const router = createTestRouter()
      const pinia = createPinia()
      const i18n = createTestI18n()

      await router.push('/control')
      await router.isReady()

      const screen = render(ControlView, {
        global: {
          plugins: [router, pinia, i18n],
        },
      })

      await waitFor(() => {
        try {
          screen.getByText('Run every day')
          return true
        } catch {
          return false
        }
      })

      const yesButton = screen.getByText(/✓\s*Yes/i)
      await yesButton.click()

      // Wait for storage update
      await waitFor(() => {
        const tasks = getMockTasksStorage() as DailyTask[]
        const updatedTask = tasks.find((t) => t.id === 'daily-1')
        return updatedTask?.completedDates.includes(TEST_DATE) ?? false
      })

      const tasks = getMockTasksStorage() as DailyTask[]
      const completedTask = tasks.find((t) => t.id === 'daily-1')

      expect(completedTask?.completedDates).toContain(TEST_DATE)
      expect(completedTask?.completedDates.length).toBe(3)
    })

    it('should not change task when clicking "No"', async () => {
      const task: DailyTask = {
        id: 'daily-2',
        title: 'Read a book',
        type: 'daily',
        targetDays: 50,
        completedDates: ['2026-01-01'],
        createdAt: '2026-01-01',
      }
      setMockTasks([task])

      const router = createTestRouter()
      const pinia = createPinia()
      const i18n = createTestI18n()

      await router.push('/control')
      await router.isReady()

      const screen = render(ControlView, {
        global: {
          plugins: [router, pinia, i18n],
        },
      })

      await waitFor(() => {
        try {
          screen.getByText('Read a book')
          return true
        } catch {
          return false
        }
      })

      const noButton = screen.getByText(/✕\s*No/i)
      await noButton.click()

      await new Promise((resolve) => setTimeout(resolve, 100))

      const tasks = getMockTasksStorage() as DailyTask[]
      const unchangedTask = tasks.find((t) => t.id === 'daily-2')

      expect(unchangedTask?.completedDates).toEqual(['2026-01-01'])
    })

    it('should prevent duplicate date when checking in same day twice', async () => {
      const task: DailyTask = {
        id: 'daily-4',
        title: 'Yoga',
        type: 'daily',
        targetDays: 100,
        completedDates: [TEST_DATE], // Already marked today
        createdAt: '2026-01-01',
      }
      setMockTasks([task])

      const router = createTestRouter()
      const pinia = createPinia()
      const i18n = createTestI18n()

      await router.push('/control')
      await router.isReady()

      const screen = render(ControlView, {
        global: {
          plugins: [router, pinia, i18n],
        },
      })

      await waitFor(() => {
        try {
          screen.getByText('Yoga')
          return true
        } catch {
          return false
        }
      })

      const yesButton = screen.getByText(/✓\s*Yes/i)
      await yesButton.click()

      await new Promise((resolve) => setTimeout(resolve, 150))

      const tasks = getMockTasksStorage() as DailyTask[]
      const completedTask = tasks.find((t) => t.id === 'daily-4')

      expect(completedTask?.completedDates).toEqual([TEST_DATE])
      expect(completedTask?.completedDates.length).toBe(1) // No duplicate added
    })
  })

  describe('Progress Tasks', () => {
    it('should show value input after clicking "Yes"', async () => {
      const task: ProgressTask = {
        id: 'progress-1',
        title: 'Walk 1000000 steps',
        type: 'progress',
        targetValue: 1000000,
        currentValue: 500000,
        unit: 'steps',
        createdAt: '2026-01-01',
      }
      setMockTasks([task])

      const router = createTestRouter()
      const pinia = createPinia()
      const i18n = createTestI18n()

      await router.push('/control')
      await router.isReady()

      const screen = render(ControlView, {
        global: {
          plugins: [router, pinia, i18n],
        },
      })

      await waitFor(() => {
        try {
          screen.getByText('Walk 1000000 steps')
          return true
        } catch {
          return false
        }
      })

      const yesButton = screen.getByText(/✓\s*Yes/i)
      await yesButton.click()

      // Should show value input
      await waitFor(() => {
        try {
          screen.getByText(/How many steps today\?/i)
          return true
        } catch {
          return false
        }
      })

      const inputLabel = screen.getByText(/How many steps today\?/i)
      expect(inputLabel).toBeDefined()
    })

    it('should accumulate value when submitting progress', async () => {
      const task: ProgressTask = {
        id: 'progress-2',
        title: 'Save money',
        type: 'progress',
        targetValue: 100000,
        currentValue: 50000,
        unit: '$',
        createdAt: '2026-01-01',
      }
      setMockTasks([task])

      const router = createTestRouter()
      const pinia = createPinia()
      const i18n = createTestI18n()

      await router.push('/control')
      await router.isReady()

      const screen = render(ControlView, {
        global: {
          plugins: [router, pinia, i18n],
        },
      })

      await waitFor(() => {
        try {
          screen.getByText('Save money')
          return true
        } catch {
          return false
        }
      })

      const yesButton = screen.getByText(/✓\s*Yes/i)
      await yesButton.click()

      await waitFor(() => {
        try {
          screen.getByText(/How many \$ today\?/i)
          return true
        } catch {
          return false
        }
      })

      // Find input and fill value
      const input = screen.getByPlaceholder(/Enter amount of \$/i)
      await input.fill('15000')

      // Find confirm button
      const confirmButton = screen.getByText(/Record/i)
      await confirmButton.click()

      // Wait for storage update
      await waitFor(() => {
        const tasks = getMockTasksStorage() as ProgressTask[]
        const updatedTask = tasks.find((t) => t.id === 'progress-2')
        return updatedTask?.currentValue === 65000
      })

      const tasks = getMockTasksStorage() as ProgressTask[]
      const progressTask = tasks.find((t) => t.id === 'progress-2')

      expect(progressTask?.currentValue).toBe(65000)
    })

    it('should not change task when clicking "Skip"', async () => {
      const task: ProgressTask = {
        id: 'progress-3',
        title: 'Run kilometers',
        type: 'progress',
        targetValue: 500,
        currentValue: 200,
        unit: 'km',
        createdAt: '2026-01-01',
      }
      setMockTasks([task])

      const router = createTestRouter()
      const pinia = createPinia()
      const i18n = createTestI18n()

      await router.push('/control')
      await router.isReady()

      const screen = render(ControlView, {
        global: {
          plugins: [router, pinia, i18n],
        },
      })

      await waitFor(() => {
        try {
          screen.getByText('Run kilometers')
          return true
        } catch {
          return false
        }
      })

      const yesButton = screen.getByText(/✓\s*Yes/i)
      await yesButton.click()

      await waitFor(() => {
        try {
          screen.getByText(/How many km today\?/i)
          return true
        } catch {
          return false
        }
      })

      const skipButton = screen.getByText(/Skip/i)
      await skipButton.click()

      await new Promise((resolve) => setTimeout(resolve, 100))

      const tasks = getMockTasksStorage() as ProgressTask[]
      const unchangedTask = tasks.find((t) => t.id === 'progress-3')

      expect(unchangedTask?.currentValue).toBe(200)
    })
  })

  describe('Mixed Task Types', () => {
    it('should handle daily + progress + one-time in one session', async () => {
      const dailyTask: DailyTask = {
        id: 'mixed-daily',
        title: 'Daily task',
        type: 'daily',
        targetDays: 100,
        completedDates: [],
        createdAt: '2026-01-01',
      }

      const progressTask: ProgressTask = {
        id: 'mixed-progress',
        title: 'Progress task',
        type: 'progress',
        targetValue: 1000,
        currentValue: 100,
        unit: 'points',
        createdAt: '2026-01-01',
      }

      const oneTimeTask: OneTimeTask = {
        id: 'mixed-onetime',
        title: 'One-time task',
        type: 'one-time',
        createdAt: '2026-01-01',
      }

      setMockTasks([dailyTask, progressTask, oneTimeTask])

      const router = createTestRouter()
      const pinia = createPinia()
      const i18n = createTestI18n()

      await router.push('/control')
      await router.isReady()

      const screen = render(ControlView, {
        global: {
          plugins: [router, pinia, i18n],
        },
      })

      // Daily task - click "Yes"
      await waitFor(() => {
        try {
          screen.getByText('Daily task')
          return true
        } catch {
          return false
        }
      })

      let yesButton = screen.getByText(/✓\s*Yes/i)
      await yesButton.click()

      // Progress task - click "Yes" and enter value
      await waitFor(() => {
        try {
          screen.getByText('Progress task')
          return true
        } catch {
          return false
        }
      })

      yesButton = screen.getByText(/✓\s*Yes/i)
      await yesButton.click()

      await waitFor(() => {
        try {
          screen.getByText(/How many points today\?/i)
          return true
        } catch {
          return false
        }
      })

      // Wait for input to appear
      await waitFor(() => {
        try {
          screen.getByPlaceholder(/Enter amount of points/i)
          return true
        } catch {
          return false
        }
      })

      const input = screen.getByPlaceholder(/Enter amount of points/i)
      await input.fill('250')

      const confirmButton = screen.getByText(/Record/i)
      await confirmButton.click()

      // One-time task - click "No"
      await waitFor(() => {
        try {
          screen.getByText('One-time task')
          return true
        } catch {
          return false
        }
      })

      const noButton = screen.getByText(/✕\s*No/i)
      await noButton.click()

      // Check final state
      await waitFor(() => {
        try {
          screen.getByText(/All done!/i)
          return true
        } catch {
          return false
        }
      })

      const tasks = getMockTasksStorage()

      const finalDaily = tasks.find((t) => t.id === 'mixed-daily') as DailyTask
      const finalProgress = tasks.find((t) => t.id === 'mixed-progress') as ProgressTask
      const finalOneTime = tasks.find((t) => t.id === 'mixed-onetime') as OneTimeTask

      expect(finalDaily?.completedDates).toContain(TEST_DATE)

      expect(finalProgress?.currentValue).toBe(350)

      expect(finalOneTime?.completedAt).toBeUndefined()
    })
  })
})
