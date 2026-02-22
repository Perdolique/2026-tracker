import * as valibot from 'valibot'
import { EXCESSIVE_NEWLINES_REGEX } from '../src/utils/text'

export const taskTypeSchema = valibot.picklist(['daily', 'progress', 'one-time'])
export const isoDateSchema = valibot.pipe(valibot.string(), valibot.isoDate())

const titleSchema = valibot.pipe(
  valibot.string(),
  valibot.transform((text) => text.trim()),
  valibot.minLength(1),
)

const descriptionSchema = valibot.optional(
  valibot.pipe(
    valibot.string(),
    valibot.transform((text) => text.trim()),
    valibot.transform((text) => text.replaceAll(EXCESSIVE_NEWLINES_REGEX, '\n\n')),
    valibot.maxLength(1000),
  ),
)

const unitSchema = valibot.optional(
  valibot.pipe(
    valibot.string(),
    valibot.transform((text) => text.trim()),
  ),
)

export const createTaskSchema = valibot.object({
  title: titleSchema,
  description: descriptionSchema,
  type: taskTypeSchema,
  targetDays: valibot.optional(valibot.number()),
  targetValue: valibot.optional(valibot.number()),
  unit: unitSchema,
  checkInEnabled: valibot.optional(valibot.boolean()),
})

export const updateTaskSchema = valibot.object({
  id: valibot.string(),
  title: titleSchema,
  description: descriptionSchema,
  type: taskTypeSchema,
  checkInEnabled: valibot.boolean(),
  // Daily metadata only (history is managed via dedicated endpoints)
  targetDays: valibot.optional(valibot.number()),
  // Progress metadata only (history is managed via dedicated endpoints)
  targetValue: valibot.optional(valibot.number()),
  unit: valibot.optional(valibot.string()),
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

export const addDailyCompletionSchema = valibot.object({
  date: isoDateSchema,
})

export const updateUserSchema = valibot.object({
  isPublic: valibot.optional(valibot.boolean()),
  language: valibot.optional(valibot.picklist(['en', 'ru'])),
})
