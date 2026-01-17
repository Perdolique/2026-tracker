import { Hono } from 'hono'
import { vValidator } from '@hono/valibot-validator'
import {
  createDatabase,
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  recordCheckIn,
  type User,
} from './db/queries'
import type { Task } from '../src/models/task'
import { createTaskSchema, updateTaskSchema, checkInSchema, addProgressValueSchema } from './schemas'

interface Bindings {
  DB: D1Database
  ASSETS: Fetcher
  TWITCH_CLIENT_ID: string
  TWITCH_CLIENT_SECRET: string
}

interface Variables {
  user: User | null
}

interface TaskContext {
  Bindings: Bindings
  Variables: Variables
}

export const taskRoutes = new Hono<TaskContext>()

// GET /api/tasks - Get all tasks
taskRoutes.get('/', async (context) => {
  const user = context.get('user')

  if (!user) {
    return context.json({ error: 'Unauthorized' }, 401)
  }

  const db = createDatabase(context.env.DB)
  const tasks = await getAllTasks(db, user.id)

  return context.json(tasks)
})

// GET /api/tasks/:id - Get single task
taskRoutes.get('/:id', async (context) => {
  const user = context.get('user')

  if (!user) {
    return context.json({ error: 'Unauthorized' }, 401)
  }

  const db = createDatabase(context.env.DB)
  const id = context.req.param('id')

  const task = await getTaskById(db, id, user.id)
  if (!task) {
    return context.json({ error: 'Task not found' }, 404)
  }

  return context.json(task)
})

// POST /api/tasks - Create new task
taskRoutes.post('/', vValidator('json', createTaskSchema), async (context) => {
  const user = context.get('user')

  if (!user) {
    return context.json({ error: 'Unauthorized' }, 401)
  }

  const db = createDatabase(context.env.DB)
  const data = context.req.valid('json')

  const task = await createTask(db, user.id, data)
  return context.json(task, 201)
})

// PUT /api/tasks/:id - Update task
taskRoutes.put('/:id', vValidator('json', updateTaskSchema), async (context) => {
  const user = context.get('user')

  if (!user) {
    return context.json({ error: 'Unauthorized' }, 401)
  }

  const db = createDatabase(context.env.DB)
  const id = context.req.param('id')
  const data = context.req.valid('json')

  if (data.id !== id) {
    return context.json({ error: 'ID mismatch' }, 400)
  }

  // Reconstruct the Task union type from the flat schema
  // Note: timestamps are server-controlled, not from client
  const baseTask = {
    id: data.id,
    title: data.title,
    description: data.description,
    // Timestamps will be set by updateTask, use placeholders for type safety
    createdAt: '',
    updatedAt: '',
    checkInEnabled: data.checkInEnabled,
  }

  const task: Task = (() => {
    switch (data.type) {
      case 'daily': {
        return {
          ...baseTask,
          type: 'daily' as const,
          targetDays: data.targetDays ?? 30,
          completedDates: data.completedDates ?? [],
        }
      }
      case 'progress': {
        return {
          ...baseTask,
          type: 'progress' as const,
          targetValue: data.targetValue ?? 100,
          currentValue: 0, // CurrentValue is calculated from completions, not from client
          unit: data.unit ?? 'units',
          completedValues: data.completedValues ?? [],
        }
      }
      case 'one-time': {
        return {
          ...baseTask,
          type: 'one-time' as const,
          completedAt: data.completedAt,
        }
      }
    }
  })()

  const updated = await updateTask(db, user.id, task)
  if (!updated) {
    return context.json({ error: 'Task not found' }, 404)
  }
  return context.json(updated)
})

// DELETE /api/tasks/:id - Delete task
taskRoutes.delete('/:id', async (context) => {
  const user = context.get('user')

  if (!user) {
    return context.json({ error: 'Unauthorized' }, 401)
  }

  const db = createDatabase(context.env.DB)
  const id = context.req.param('id')

  const deleted = await deleteTask(db, id, user.id)
  if (!deleted) {
    return context.json({ error: 'Task not found' }, 404)
  }

  return context.body(null, 204)
})

// POST /api/tasks/:id/checkin - Record check-in
taskRoutes.post('/:id/checkin', vValidator('json', checkInSchema), async (context) => {
  const user = context.get('user')

  if (!user) {
    return context.json({ error: 'Unauthorized' }, 401)
  }

  const db = createDatabase(context.env.DB)
  const id = context.req.param('id')
  const { completed, value } = context.req.valid('json')

  const task = await recordCheckIn({ db, taskId: id, userId: user.id, completed, value })
  if (!task) {
    return context.json({ error: 'Task not found' }, 404)
  }

  return context.json(task)
})

// POST /api/tasks/:id/completions - Add new progress value
taskRoutes.post('/:id/completions', vValidator('json', addProgressValueSchema), async (context) => {
  const user = context.get('user')

  if (!user) {
    return context.json({ error: 'Unauthorized' }, 401)
  }

  const db = createDatabase(context.env.DB)
  const id = context.req.param('id')
  const { value } = context.req.valid('json')

  // Verify task exists and is a progress task
  const task = await getTaskById(db, id, user.id)
  if (task?.type !== 'progress') {
    return context.json({ error: 'Task not found or not a progress task' }, 404)
  }

  // Add the value
  const { addProgressValue } = await import('./db/task-queries')
  const updated = await addProgressValue({
    db,
    userId: user.id,
    taskId: id,
    value,
  })

  if (!updated) {
    return context.json({ error: 'Failed to add value' }, 500)
  }

  return context.json(updated)
})

// DELETE /api/tasks/:taskId/completions/:completionId - Delete single progress completion
taskRoutes.delete('/:taskId/completions/:completionId', async (context) => {
  const user = context.get('user')

  if (!user) {
    return context.json({ error: 'Unauthorized' }, 401)
  }

  const db = createDatabase(context.env.DB)
  const taskId = context.req.param('taskId')
  const completionIdParam = context.req.param('completionId')

  // Validate completionId is a valid positive integer
  const completionId = Number(completionIdParam)
  if (!Number.isInteger(completionId) || completionId <= 0) {
    return context.json({ error: 'Invalid completion ID' }, 400)
  }

  // Verify task ownership before deleting completion
  const task = await getTaskById(db, taskId, user.id)
  if (task?.type !== 'progress') {
    return context.json({ error: 'Task not found or not a progress task' }, 404)
  }

  // Delete the completion and recalculate currentValue
  const { deleteProgressCompletion } = await import('./db/task-queries')
  const updated = await deleteProgressCompletion({
    db,
    userId: user.id,
    taskId,
    completionId,
  })

  if (!updated) {
    return context.json({ error: 'Completion not found' }, 404)
  }

  return context.json(updated)
})
