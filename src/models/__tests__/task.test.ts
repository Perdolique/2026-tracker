import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isDailyTaskCompletedToday, getCurrentDate, type DailyTask, type ProgressTask, type OneTimeTask } from '../task'

describe('Task Types', () => {
  it('should create a valid DailyTask', () => {
    const dailyTask: DailyTask = {
      id: '1',
      title: 'Morning Exercise',
      type: 'daily',
      targetDays: 300,
      completedDates: ['2026-01-01', '2026-01-02'],
      createdAt: '2026-01-01T00:00:00.000Z',
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
    }

    expect(isDailyTaskCompletedToday(task)).toBeFalsy()
  })
})
