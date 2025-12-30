import { Hono } from 'hono'
import { vValidator } from '@hono/valibot-validator'
import * as v from 'valibot'
import { createDatabase, getAllTasks, getActiveTasks, getArchivedTasks, getTaskById, createTask, updateTask, deleteTask, archiveTask, recordCheckIn } from './db/queries'

// Cloudflare Worker bindings
type Bindings = {
  DB: D1Database
  ASSETS: Fetcher
}

const app = new Hono<{ Bindings: Bindings }>()

// =============================================================================
// Validation Schemas
// =============================================================================

const taskTypeSchema = v.picklist(['daily', 'progress', 'one-time'])

const createTaskSchema = v.object({
  title: v.pipe(v.string(), v.minLength(1)),
  description: v.optional(v.string()),
  type: taskTypeSchema,
  targetDays: v.optional(v.number()),
  targetValue: v.optional(v.number()),
  unit: v.optional(v.string()),
})

const updateTaskSchema = v.object({
  id: v.string(),
  title: v.pipe(v.string(), v.minLength(1)),
  description: v.optional(v.string()),
  type: taskTypeSchema,
  createdAt: v.string(),
  isArchived: v.boolean(),
  // Daily
  targetDays: v.optional(v.number()),
  completedDates: v.optional(v.array(v.string())),
  // Progress
  targetValue: v.optional(v.number()),
  currentValue: v.optional(v.number()),
  unit: v.optional(v.string()),
  // One-time
  completedAt: v.optional(v.string()),
})

const checkInSchema = v.object({
  completed: v.boolean(),
  value: v.optional(v.number()),
})

// =============================================================================
// API Routes
// =============================================================================

// GET /api/tasks - Get tasks (with optional archived filter)
app.get('/api/tasks', async (c) => {
  const db = createDatabase(c.env.DB)
  const archived = c.req.query('archived')

  let tasks
  if (archived === 'true') {
    tasks = await getArchivedTasks(db)
  } else if (archived === 'false') {
    tasks = await getActiveTasks(db)
  } else {
    tasks = await getAllTasks(db)
  }

  return c.json(tasks)
})

// GET /api/tasks/:id - Get single task
app.get('/api/tasks/:id', async (c) => {
  const db = createDatabase(c.env.DB)
  const id = c.req.param('id')

  const task = await getTaskById(db, id)
  if (!task) {
    return c.json({ error: 'Task not found' }, 404)
  }

  return c.json(task)
})

// POST /api/tasks - Create new task
app.post('/api/tasks', vValidator('json', createTaskSchema), async (c) => {
  const db = createDatabase(c.env.DB)
  const data = c.req.valid('json')

  const task = await createTask(db, data)
  return c.json(task, 201)
})

// PUT /api/tasks/:id - Update task
app.put('/api/tasks/:id', vValidator('json', updateTaskSchema), async (c) => {
  const db = createDatabase(c.env.DB)
  const id = c.req.param('id')
  const data = c.req.valid('json')

  if (data.id !== id) {
    return c.json({ error: 'ID mismatch' }, 400)
  }

  // Reconstruct the Task union type from the flat schema
  const baseTask = {
    id: data.id,
    title: data.title,
    description: data.description,
    createdAt: data.createdAt,
    isArchived: data.isArchived,
  }

  let task
  switch (data.type) {
    case 'daily':
      task = {
        ...baseTask,
        type: 'daily' as const,
        targetDays: data.targetDays ?? 30,
        completedDates: data.completedDates ?? [],
      }
      break
    case 'progress':
      task = {
        ...baseTask,
        type: 'progress' as const,
        targetValue: data.targetValue ?? 100,
        currentValue: data.currentValue ?? 0,
        unit: data.unit ?? 'units',
      }
      break
    case 'one-time':
      task = {
        ...baseTask,
        type: 'one-time' as const,
        completedAt: data.completedAt,
      }
      break
  }

  const updated = await updateTask(db, task)
  return c.json(updated)
})

// DELETE /api/tasks/:id - Delete task
app.delete('/api/tasks/:id', async (c) => {
  const db = createDatabase(c.env.DB)
  const id = c.req.param('id')

  await deleteTask(db, id)
  return c.body(null, 204)
})

// PATCH /api/tasks/:id/archive - Archive task
app.patch('/api/tasks/:id/archive', async (c) => {
  const db = createDatabase(c.env.DB)
  const id = c.req.param('id')

  const task = await archiveTask(db, id)
  if (!task) {
    return c.json({ error: 'Task not found' }, 404)
  }

  return c.json(task)
})

// POST /api/tasks/:id/checkin - Record check-in
app.post('/api/tasks/:id/checkin', vValidator('json', checkInSchema), async (c) => {
  const db = createDatabase(c.env.DB)
  const id = c.req.param('id')
  const { completed, value } = c.req.valid('json')

  const task = await recordCheckIn(db, id, completed, value)
  if (!task) {
    return c.json({ error: 'Task not found' }, 404)
  }

  return c.json(task)
})

export default app
