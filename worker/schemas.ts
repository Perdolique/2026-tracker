import * as valibot from 'valibot'

export const taskTypeSchema = valibot.picklist(['daily', 'progress', 'one-time'])

const descriptionSchema = valibot.optional(
  valibot.pipe(
    valibot.string(),
    valibot.maxLength(1000),
    valibot.transform((text) => text.trim()),
    valibot.transform((text) => text.replaceAll(/\n{3,}/g, '\n\n')),
  ),
)

export const createTaskSchema = valibot.object({
  title: valibot.pipe(valibot.string(), valibot.minLength(1)),
  description: descriptionSchema,
  type: taskTypeSchema,
  targetDays: valibot.optional(valibot.number()),
  targetValue: valibot.optional(valibot.number()),
  unit: valibot.optional(valibot.string()),
  checkInEnabled: valibot.optional(valibot.boolean()),
})

export const updateTaskSchema = valibot.object({
  id: valibot.string(),
  title: valibot.pipe(valibot.string(), valibot.minLength(1)),
  description: descriptionSchema,
  type: taskTypeSchema,
  checkInEnabled: valibot.boolean(),
  // Daily
  targetDays: valibot.optional(valibot.number()),
  completedDates: valibot.optional(valibot.array(valibot.string())),
  // Progress
  targetValue: valibot.optional(valibot.number()),
  unit: valibot.optional(valibot.string()),
  completedValues: valibot.optional(valibot.array(valibot.object({
    id: valibot.number(),
    date: valibot.string(),
    value: valibot.number(),
  }))),
  // One-time
  completedAt: valibot.optional(valibot.string()),
})

export const checkInSchema = valibot.object({
  completed: valibot.boolean(),
  value: valibot.optional(valibot.number()),
})

export const addProgressValueSchema = valibot.object({
  value: valibot.pipe(valibot.number(), valibot.minValue(0.01)),
})

export const updateUserSchema = valibot.object({
  isPublic: valibot.optional(valibot.boolean()),
  language: valibot.optional(valibot.picklist(['en', 'ru'])),
})
