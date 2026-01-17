import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import ControlView from '../ControlView.vue'
import HomeView from '../HomeView.vue'
import { type OneTimeTask, type DailyTask, type ProgressTask, isDailyTask, isProgressTask, isOneTimeTask } from '@/models/task'
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
import { delay, waitFor } from '@/test-utils/delay'

function createTestRouter() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'home', component: HomeView },
      { path: '/control', name: 'control', component: ControlView },
    ],
  })
}

describe('ControlView - Browser Tests', () => {
  beforeAll(async () => {
    // Mock system time to TEST_DATE at 12:00 UTC to avoid timezone issues
    vi.setSystemTime(new Date(`${TEST_DATE}T12:00:00.000Z`))
    await startMockServer()
  })

  afterAll(() => {
    stopMockServer()
    vi.useRealTimers()
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
      updatedAt: '2026-01-01',
      checkInEnabled: true,
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
    const yesButton = screen.getByTestId('checkin-yes')
    const noButton = screen.getByTestId('checkin-no')
    expect(yesButton).toBeDefined()
    expect(noButton).toBeDefined()

    // Click "Yes"
    await yesButton.click()

    // Wait for storage update (API call via route mock)
    await waitFor(() => {
      const tasks = getMockTasksStorage()
      const oneTimeTasks = tasks.filter((t) => isOneTimeTask(t))
      const updatedTask = oneTimeTasks.find((t) => t.id === 'test-task-1')
      return updatedTask?.completedAt === TEST_DATE
    })

    // Check final state
    const tasks = getMockTasksStorage()
    const oneTimeTasks = tasks.filter((t) => isOneTimeTask(t))
    const completedTask = oneTimeTasks.find((t) => t.id === 'test-task-1')

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
      updatedAt: '2026-01-01',
      checkInEnabled: true,
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
    const noButton = screen.getByTestId('checkin-no')
    await noButton.click()

    // Give time for potential update
    await delay(100)

    // Check task wasn't changed
    const tasks = getMockTasksStorage()
    const oneTimeTasks = tasks.filter((t) => isOneTimeTask(t))
    const unchangedTask = oneTimeTasks.find((t) => t.id === 'test-task-2')

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
      updatedAt: '2026-01-01',
      checkInEnabled: true,
    }
    const task2: OneTimeTask = {
      id: 'test-task-4',
      title: 'Second task',
      type: 'one-time',
      createdAt: '2026-01-02',
      updatedAt: '2026-01-02',
      checkInEnabled: true,
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
    const yesButton1 = screen.getByTestId('checkin-yes')
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
    const noButton2 = screen.getByTestId('checkin-no')
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
    const tasks = getMockTasksStorage()
    const oneTimeTasks = tasks.filter((t) => isOneTimeTask(t))
    const finalTask1 = oneTimeTasks.find((t) => t.id === 'test-task-3')
    const finalTask2 = oneTimeTasks.find((t) => t.id === 'test-task-4')

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
        completedDates: ['2025-01-01', '2025-01-02'],
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        checkInEnabled: true,
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

      const yesButton = screen.getByTestId('checkin-yes')
      await yesButton.click()

      // Wait for storage update
      await waitFor(() => {
        const tasks = getMockTasksStorage()
        const dailyTasks = tasks.filter((t) => isDailyTask(t))
        const updatedTask = dailyTasks.find((t) => t.id === 'daily-1')
        return updatedTask?.completedDates.includes(TEST_DATE) ?? false
      })

      const tasks = getMockTasksStorage()
      const dailyTasks = tasks.filter((t) => isDailyTask(t))
      const completedTask = dailyTasks.find((t) => t.id === 'daily-1')

      expect(completedTask?.completedDates).toContain(TEST_DATE)
      expect(completedTask?.completedDates.length).toBe(3)
    })

    it('should not change task when clicking "No"', async () => {
      const task: DailyTask = {
        id: 'daily-2',
        title: 'Read a book',
        type: 'daily',
        targetDays: 50,
        completedDates: ['2025-01-01'],
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        checkInEnabled: true,
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

      const noButton = screen.getByTestId('checkin-no')
      await noButton.click()

      await delay(100)

      const tasks = getMockTasksStorage()
      const dailyTasks = tasks.filter((t) => isDailyTask(t))
      const unchangedTask = dailyTasks.find((t) => t.id === 'daily-2')

      expect(unchangedTask?.completedDates).toEqual(['2025-01-01'])
    })

    it('should not show daily task that was already completed today', async () => {
      const taskAlreadyDone: DailyTask = {
        id: 'daily-4',
        title: 'Yoga',
        type: 'daily',
        targetDays: 100,
        completedDates: [TEST_DATE], // Already marked today
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        checkInEnabled: true,
      }
      const taskNotDone: DailyTask = {
        id: 'daily-5',
        title: 'Meditation',
        type: 'daily',
        targetDays: 50,
        completedDates: ['2025-12-01'],
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        checkInEnabled: true,
      }
      setMockTasks([taskAlreadyDone, taskNotDone])

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

      // Should show only "Meditation" (not completed today)
      await waitFor(() => {
        try {
          screen.getByText('Meditation')
          return true
        } catch {
          return false
        }
      })

      // "Yoga" should not appear in wizard (wait a bit for rendering)
      await delay(100)
      
      // Check if Yoga is in DOM
      const html = screen.container.innerHTML
      if (html.includes('Yoga')) {
        throw new Error('Yoga task should not be visible in the wizard')
      }


      // Storage should remain unchanged
      const tasks = getMockTasksStorage()
      const yogaTask = tasks.find((t) => t.id === 'daily-4')
      if (yogaTask && isDailyTask(yogaTask)) {
        expect(yogaTask.completedDates).toEqual([TEST_DATE])
      }
    })
  })

  describe('Progress Tasks', () => {
    it('should show value input after clicking "Yes"', async () => {
      const task: ProgressTask = {
        id: 'progress-1',
        title: 'Walk 1000000 steps',
        type: 'progress',
      completedValues: [],
        targetValue: 1_000_000,
        currentValue: 500_000,
        unit: 'steps',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        checkInEnabled: true,
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

      const yesButton = screen.getByTestId('checkin-yes')
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
      completedValues: [],
        targetValue: 100_000,
        currentValue: 50_000,
        unit: '$',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        checkInEnabled: true,
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

      const yesButton = screen.getByTestId('checkin-yes')
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
        const tasks = getMockTasksStorage()
        const progressTasks = tasks.filter((t) => isProgressTask(t))
        const updatedTask = progressTasks.find((t) => t.id === 'progress-2')
        return updatedTask?.currentValue === 65_000
      })

      const tasks = getMockTasksStorage()
      const progressTasks = tasks.filter((t) => isProgressTask(t))
      const progressTask = progressTasks.find((t) => t.id === 'progress-2')

      expect(progressTask?.currentValue).toBe(65_000)
    })

    it('should not change task when clicking "Skip"', async () => {
      const task: ProgressTask = {
        id: 'progress-3',
        title: 'Run kilometers',
        type: 'progress',
      completedValues: [],
        targetValue: 500,
        currentValue: 200,
        unit: 'km',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        checkInEnabled: true,
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

      const yesButton = screen.getByTestId('checkin-yes')
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

      await delay(100)

      const tasks = getMockTasksStorage()
      const progressTasks = tasks.filter((t) => isProgressTask(t))
      const unchangedTask = progressTasks.find((t) => t.id === 'progress-3')

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
        updatedAt: '2026-01-01',
        checkInEnabled: true,
      }

      const progressTask: ProgressTask = {
        id: 'mixed-progress',
        title: 'Progress task',
        type: 'progress',
      completedValues: [],
        targetValue: 1000,
        currentValue: 100,
        unit: 'points',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        checkInEnabled: true,
      }

      const oneTimeTask: OneTimeTask = {
        id: 'mixed-onetime',
        title: 'One-time task',
        type: 'one-time',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        checkInEnabled: true,
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

      let yesButton = screen.getByTestId('checkin-yes')
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

      yesButton = screen.getByTestId('checkin-yes')
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

      const noButton = screen.getByTestId('checkin-no')
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
      const finalDaily = tasks.find((task) => isDailyTask(task))
      const finalProgress = tasks.find((task) => isProgressTask(task))
      const finalOneTime = tasks.find((task) => isOneTimeTask(task))

      expect(finalDaily?.completedDates).toContain(TEST_DATE)
      expect(finalProgress?.currentValue).toBe(350)
      expect(finalOneTime?.completedAt).toBeUndefined()
    })
  })
})
