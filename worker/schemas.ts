import * as valibot from 'valibot'

export const taskTypeSchema = valibot.picklist(['daily', 'progress', 'one-time'])

export const createTaskSchema = valibot.object({
  title: valibot.pipe(valibot.string(), valibot.minLength(1)),
  description: valibot.optional(valibot.string()),
  type: taskTypeSchema,
  targetDays: valibot.optional(valibot.number()),
  targetValue: valibot.optional(valibot.number()),
  unit: valibot.optional(valibot.string()),
  checkInEnabled: valibot.optional(valibot.boolean()),
})

export const updateTaskSchema = valibot.object({
  id: valibot.string(),
  title: valibot.pipe(valibot.string(), valibot.minLength(1)),
  description: valibot.optional(valibot.string()),
  type: taskTypeSchema,
  checkInEnabled: valibot.boolean(),
  // Daily
  targetDays: valibot.optional(valibot.number()),
  completedDates: valibot.optional(valibot.array(valibot.string())),
  // Progress
  targetValue: valibot.optional(valibot.number()),
  currentValue: valibot.optional(valibot.number()),
  unit: valibot.optional(valibot.string()),
  // One-time
  completedAt: valibot.optional(valibot.string()),
})

export const checkInSchema = valibot.object({
  completed: valibot.boolean(),
  value: valibot.optional(valibot.number()),
})

export const updateUserSchema = valibot.object({
  isPublic: valibot.optional(valibot.boolean()),
  language: valibot.optional(valibot.picklist(['en', 'ru'])),
})
