import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  isDailyTaskCompletedToday,
  getCurrentDate,
  getGlobalProgress,
  getTaskProgress,
  type DailyTask,
  type ProgressTask,
  type OneTimeTask,
  type Task,
} from '../task'

describe('Task Types', () => {
  it('should create a valid DailyTask', () => {
    const dailyTask: DailyTask = {
      id: '1',
      title: 'Morning Exercise',
      type: 'daily',
      targetDays: 300,
      completedDates: ['2026-01-01', '2026-01-02'],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      checkInEnabled: true,
    }

    expect(dailyTask.type).toBe('daily')
    expect(dailyTask.completedDates).toHaveLength(2)
    expect(dailyTask.targetDays).toBe(300)
  })

  it('should create a valid ProgressTask', () => {
    const progressTask: ProgressTask = {
      id: '2',
      title: 'Walk 1M steps',
      type: 'progress',
      targetValue: 1_000_000,
      currentValue: 5000,
      unit: 'steps',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      checkInEnabled: true,
    }

    expect(progressTask.type).toBe('progress')
    expect(progressTask.currentValue).toBe(5000)
    expect(progressTask.unit).toBe('steps')
  })

  it('should create a valid OneTimeTask', () => {
    const oneTimeTask: OneTimeTask = {
      id: '3',
      title: 'Read TypeScript handbook',
      type: 'one-time',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      checkInEnabled: false,
    }

    expect(oneTimeTask.type).toBe('one-time')
    expect(oneTimeTask.completedAt).toBeUndefined()
  })

  it('should mark OneTimeTask as completed', () => {
    const oneTimeTask: OneTimeTask = {
      id: '4',
      title: 'Setup project',
      type: 'one-time',
      completedAt: '2026-01-15T10:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      checkInEnabled: false,
    }

    expect(oneTimeTask.completedAt).toBe('2026-01-15T10:00:00.000Z')
  })
})

describe('getCurrentDate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return date in YYYY-MM-DD format', () => {
    vi.setSystemTime(new Date('2026-03-15T12:30:00.000Z'))
    expect(getCurrentDate()).toBe('2026-03-15')
  })

  it('should use UTC timezone', () => {
    // 23:30 UTC on March 15 = still March 15 in UTC
    vi.setSystemTime(new Date('2026-03-15T23:30:00.000Z'))
    expect(getCurrentDate()).toBe('2026-03-15')
  })
})

describe('isDailyTaskCompletedToday', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-15T10:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return true when task has today in completedDates', () => {
    const task: DailyTask = {
      id: '1',
      title: 'Test',
      type: 'daily',
      targetDays: 100,
      completedDates: ['2026-01-14', '2026-01-15'],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      checkInEnabled: true,
    }

    expect(isDailyTaskCompletedToday(task)).toBeTruthy()
  })

  it('should return false when task does not have today in completedDates', () => {
    const task: DailyTask = {
      id: '1',
      title: 'Test',
      type: 'daily',
      targetDays: 100,
      completedDates: ['2026-01-13', '2026-01-14'],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      checkInEnabled: true,
    }

    expect(isDailyTaskCompletedToday(task)).toBeFalsy()
  })

  it('should return false when completedDates is empty', () => {
    const task: DailyTask = {
      id: '1',
      title: 'Test',
      type: 'daily',
      targetDays: 100,
      completedDates: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      checkInEnabled: true,
    }

    expect(isDailyTaskCompletedToday(task)).toBeFalsy()
  })
})

describe('getGlobalProgress', () => {
  it('should return 0 for empty task array', () => {
    expect(getGlobalProgress([])).toBe(0)
  })

  it('should return 100 when all tasks are completed', () => {
    const tasks: Task[] = [
      {
        id: '1',
        title: 'Daily task',
        type: 'daily',
        targetDays: 10,
        completedDates: Array.from({ length: 10 }, (_unused, index) => `2026-01-0${index + 1}`),
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        checkInEnabled: true,
      },
      {
        id: '2',
        title: 'Progress task',
        type: 'progress',
        targetValue: 100,
        currentValue: 100,
        unit: 'pages',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        checkInEnabled: true,
      },
      {
        id: '3',
        title: 'One-time task',
        type: 'one-time',
        completedAt: '2026-01-15T00:00:00.000Z',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        checkInEnabled: false,
      },
    ]

    expect(getGlobalProgress(tasks)).toBe(100)
  })

  it('should return 0 when no tasks have progress', () => {
    const tasks: Task[] = [
      {
        id: '1',
        title: 'Daily task',
        type: 'daily',
        targetDays: 10,
        completedDates: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        checkInEnabled: true,
      },
      {
        id: '2',
        title: 'Progress task',
        type: 'progress',
        targetValue: 100,
        currentValue: 0,
        unit: 'pages',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        checkInEnabled: true,
      },
      {
        id: '3',
        title: 'One-time task',
        type: 'one-time',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        checkInEnabled: false,
      },
    ]

    expect(getGlobalProgress(tasks)).toBe(0)
  })

  it('should calculate average progress correctly', () => {
    const tasks: Task[] = [
      {
        id: '1',
        title: 'Daily task',
        type: 'daily',
        targetDays: 10,
        completedDates: ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05'], // 50%
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        checkInEnabled: true,
      },
      {
        id: '2',
        title: 'Progress task',
        type: 'progress',
        targetValue: 100,
        currentValue: 50, // 50%
        unit: 'pages',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        checkInEnabled: true,
      },
    ]

    expect(getGlobalProgress(tasks)).toBe(50)
  })

  it('should handle mixed completion states', () => {
    const tasks: Task[] = [
      {
        id: '1',
        title: 'Completed daily',
        type: 'daily',
        targetDays: 10,
        completedDates: Array.from({ length: 10 }, (_unused, index) => `2026-01-${String(index + 1).padStart(2, '0')}`), // 100%
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        checkInEnabled: true,
      },
      {
        id: '2',
        title: 'Not started',
        type: 'progress',
        targetValue: 100,
        currentValue: 0, // 0%
        unit: 'pages',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        checkInEnabled: true,
      },
    ]

    expect(getGlobalProgress(tasks)).toBe(50)
  })

  it('should cap individual task progress at 100%', () => {
    const tasks: Task[] = [
      {
        id: '1',
        title: 'Over-completed',
        type: 'progress',
        targetValue: 100,
        currentValue: 150, // Should be capped at 100%
        unit: 'pages',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        checkInEnabled: true,
      },
    ]

    expect(getGlobalProgress(tasks)).toBe(100)
  })
})

describe('getTaskProgress - division by zero edge cases', () => {
  it('should return 100% for daily task with targetDays = 0', () => {
    const task: DailyTask = {
      id: '1',
      title: 'Zero target daily',
      type: 'daily',
      targetDays: 0,
      completedDates: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      checkInEnabled: true,
    }

    expect(getTaskProgress(task)).toBe(100)
  })

  it('should return 100% for progress task with targetValue = 0 and currentValue = 0', () => {
    const task: ProgressTask = {
      id: '2',
      title: 'Zero target progress',
      type: 'progress',
      targetValue: 0,
      currentValue: 0,
      unit: 'steps',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      checkInEnabled: true,
    }

    expect(getTaskProgress(task)).toBe(100)
  })

  it('should return 100% for progress task with targetValue = 0 and non-zero currentValue', () => {
    const task: ProgressTask = {
      id: '3',
      title: 'Zero target with progress',
      type: 'progress',
      targetValue: 0,
      currentValue: 100,
      unit: 'pages',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      checkInEnabled: true,
    }

    expect(getTaskProgress(task)).toBe(100)
  })

  it('should not return NaN for getGlobalProgress with zero target tasks', () => {
    const tasks: Task[] = [
      {
        id: '1',
        title: 'Zero target daily',
        type: 'daily',
        targetDays: 0,
        completedDates: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        checkInEnabled: true,
      },
      {
        id: '2',
        title: 'Zero target progress',
        type: 'progress',
        targetValue: 0,
        currentValue: 0,
        unit: 'steps',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        checkInEnabled: true,
      },
      {
        id: '3',
        title: 'Normal task',
        type: 'progress',
        targetValue: 100,
        currentValue: 50,
        unit: 'pages',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        checkInEnabled: true,
      },
    ]

    const progress = getGlobalProgress(tasks)
    expect(progress).not.toBeNaN()
    // (100 + 100 + 50) / 3 = 250 / 3 ≈ 83.33
    expect(progress).toBeCloseTo(83.33, 2)
  })
})
