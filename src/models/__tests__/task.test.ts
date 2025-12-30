import { describe, it, expect } from 'vitest'
import type { DailyTask, ProgressTask, OneTimeTask } from '../task'

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
      targetValue: 1000000,
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
