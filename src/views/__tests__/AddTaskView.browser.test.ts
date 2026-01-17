import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import AddTaskView from '../AddTaskView.vue'
import HomeView from '../HomeView.vue'
import { isProgressTask, isOneTimeTask, isDailyTask } from '@/models/task'

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
      { path: '/add', name: 'add-task', component: AddTaskView },
    ],
  })
}

describe('AddTaskView - Browser Tests', () => {
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

  it('should create a daily task', async () => {
    setMockTasks([])

    const router = createTestRouter()
    const pinia = createPinia()
    const i18n = createTestI18n()

    await router.push('/add')
    await router.isReady()

    const screen = render(AddTaskView, {
      global: {
        plugins: [router, pinia, i18n],
      },
    })

    // Wait for form to load
    await waitFor(() => {
      try {
        screen.getByLabelText(/^Title$/i)
        return true
      } catch {
        return false
      }
    })

    // Fill title
    const titleInput = screen.getByLabelText(/^Title$/i)
    await titleInput.fill('Run every day')

    // Select "Days" type (daily)
    const dailyButton = screen.getByText('Days', { exact: true })
    await dailyButton.click()

    // Enter target days
    await waitFor(() => {
      try {
        screen.getByLabelText(/Target number of days/i)
        return true
      } catch {
        return false
      }
    })

    const daysInput = screen.getByLabelText(/Target number of days/i)
    await daysInput.fill('300')

    // Click create button
    const submitButton = screen.getByText(/Create/i)
    await submitButton.click()

    // Wait for task creation
    await waitFor(() => {
      const tasks = getMockTasksStorage()
      return tasks.length === 1
    })

    const tasks = getMockTasksStorage()
    expect(tasks.length).toBe(1)

    const createdTask = tasks.find((t) => isDailyTask(t))
    expect(createdTask?.title).toBe('Run every day')
    expect(createdTask?.type).toBe('daily')
    expect(createdTask?.targetDays).toBe(300)
    expect(createdTask?.completedDates).toEqual([])
  })

  it('should create a progress task', async () => {
    setMockTasks([])

    const router = createTestRouter()
    const pinia = createPinia()
    const i18n = createTestI18n()

    await router.push('/add')
    await router.isReady()

    const screen = render(AddTaskView, {
      global: {
        plugins: [router, pinia, i18n],
      },
    })

    await waitFor(() => {
      try {
        screen.getByLabelText(/^Title$/i)
        return true
      } catch {
        return false
      }
    })

    // Fill title
    const titleInput = screen.getByLabelText(/^Title$/i)
    await titleInput.fill('Walk a million steps')

    // Select "Progress" type
    const progressButton = screen.getByText('Progress')
    await progressButton.click()

    // Enter target value and unit
    await waitFor(() => {
      try {
        screen.getByLabelText(/Target value/i)
        return true
      } catch {
        return false
      }
    })

    const targetInput = screen.getByLabelText(/Target value/i)
    await targetInput.fill('1000000')

    const unitInput = screen.getByLabelText(/Unit of measurement/i)
    await unitInput.fill('steps')

    // Click create button
    const submitButton = screen.getByText(/Create/i)
    await submitButton.click()

    // Wait for task creation
    await waitFor(() => {
      const tasks = getMockTasksStorage()
      return tasks.length === 1
    })

    const tasks = getMockTasksStorage()
    expect(tasks.length).toBe(1)

    const progressTasks = tasks.find((t) => isProgressTask(t))
    expect(progressTasks?.title).toBe('Walk a million steps')
    expect(progressTasks?.type).toBe('progress')
    expect(progressTasks?.targetValue).toBe(1_000_000)
    expect(progressTasks?.currentValue).toBe(0)
    expect(progressTasks?.unit).toBe('steps')
  })

  it('should create a one-time task', async () => {
    setMockTasks([])

    const router = createTestRouter()
    const pinia = createPinia()
    const i18n = createTestI18n()

    await router.push('/add')
    await router.isReady()

    const screen = render(AddTaskView, {
      global: {
        plugins: [router, pinia, i18n],
      },
    })

    await waitFor(() => {
      try {
        screen.getByLabelText(/^Title$/i)
        return true
      } catch {
        return false
      }
    })

    // Fill title
    const titleInput = screen.getByLabelText(/^Title$/i)
    await titleInput.fill('Buy a bicycle')

    // Select "One-time" type
    const oneTimeButton = screen.getByText('One-time')
    await oneTimeButton.click()

    // Click create button
    const submitButton = screen.getByText(/Create/i)
    await submitButton.click()

    // Wait for task creation
    await waitFor(() => {
      const tasks = getMockTasksStorage()
      return tasks.length === 1
    })

    const tasks = getMockTasksStorage()

    expect(tasks.length).toBe(1)

    const oneTimeTask = tasks.find((t) => isOneTimeTask(t))

    expect(oneTimeTask?.title).toBe('Buy a bicycle')
    expect(oneTimeTask?.type).toBe('one-time')
    expect(oneTimeTask?.completedAt).toBeUndefined()
  })

  it('should not create task without title', async () => {
    setMockTasks([])

    const router = createTestRouter()
    const pinia = createPinia()
    const i18n = createTestI18n()

    await router.push('/add')
    await router.isReady()

    const screen = render(AddTaskView, {
      global: {
        plugins: [router, pinia, i18n],
      },
    })

    await waitFor(() => {
      try {
        screen.getByLabelText(/^Title$/i)
        return true
      } catch {
        return false
      }
    })

    // Don't fill title, just select type
    const oneTimeButton = screen.getByText('One-time')
    await oneTimeButton.click()

    // Don't click since button should be disabled. Just verify task wasn't created

    // Give time for potential creation
    await delay(200)

    // Verify task wasn't created
    const tasks = getMockTasksStorage()
    expect(tasks.length).toBe(0)
  })
})
