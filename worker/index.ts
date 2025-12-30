import { Hono } from 'hono'
import { vValidator } from '@hono/valibot-validator'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import * as v from 'valibot'
import {
  createDatabase,
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  recordCheckIn,
  getUserByTwitchId,
  getUserById,
  createUser,
  updateUser,
  createSession,
  getSessionWithUser,
  deleteSession,
  type User,
} from './db/queries'

// Cloudflare Worker bindings
type Bindings = {
  DB: D1Database
  ASSETS: Fetcher
  TWITCH_CLIENT_ID: string
  TWITCH_CLIENT_SECRET: string
}

type Variables = {
  user: User | null
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// =============================================================================
// Auth Middleware
// =============================================================================

/**
 * Middleware to load user from session cookie (optional auth)
 */
app.use('/api/*', async (c, next) => {
  const sessionId = getCookie(c, 'session')

  if (sessionId) {
    const db = createDatabase(c.env.DB)
    const result = await getSessionWithUser(db, sessionId)

    if (result) {
      c.set('user', result.user)
    } else {
      // Invalid or expired session, clear cookie
      deleteCookie(c, 'session')
      c.set('user', null)
    }
  } else {
    c.set('user', null)
  }

  await next()
})

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

const updateUserSchema = v.object({
  isPublic: v.optional(v.boolean()),
  language: v.optional(v.picklist(['en', 'ru'])),
})

// =============================================================================
// Auth Routes (Twitch OAuth)
// =============================================================================

// GET /api/auth/twitch - Redirect to Twitch OAuth
app.get('/api/auth/twitch', (c) => {
  const clientId = c.env.TWITCH_CLIENT_ID
  const redirectUri = new URL('/api/auth/twitch/callback', c.req.url).toString()

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'user:read:email',
  })

  return c.redirect(`https://id.twitch.tv/oauth2/authorize?${params}`)
})

// GET /api/auth/twitch/callback - Handle OAuth callback
app.get('/api/auth/twitch/callback', async (c) => {
  const code = c.req.query('code')
  const error = c.req.query('error')

  if (error || !code) {
    return c.redirect('/?auth_error=access_denied')
  }

  const clientId = c.env.TWITCH_CLIENT_ID
  const clientSecret = c.env.TWITCH_CLIENT_SECRET
  const redirectUri = new URL('/api/auth/twitch/callback', c.req.url).toString()

  try {
    // Exchange code for token
    const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', await tokenResponse.text())
      return c.redirect('/?auth_error=token_exchange_failed')
    }

    const tokenData = (await tokenResponse.json()) as { access_token: string }

    // Get user info from Twitch
    const userResponse = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Client-Id': clientId,
      },
    })

    if (!userResponse.ok) {
      console.error('User fetch failed:', await userResponse.text())
      return c.redirect('/?auth_error=user_fetch_failed')
    }

    const userData = (await userResponse.json()) as {
      data: Array<{ id: string; display_name: string; profile_image_url: string }>
    }
    const twitchUser = userData.data[0]

    if (!twitchUser) {
      return c.redirect('/?auth_error=no_user_data')
    }

    const db = createDatabase(c.env.DB)

    // Find or create user
    let user = await getUserByTwitchId(db, twitchUser.id)

    if (!user) {
      user = await createUser(db, {
        twitchId: twitchUser.id,
        displayName: twitchUser.display_name,
        avatarUrl: twitchUser.profile_image_url,
      })
    } else {
      // Update user info if changed
      if (user.displayName !== twitchUser.display_name || user.avatarUrl !== twitchUser.profile_image_url) {
        await updateUser(db, user.id, {
          displayName: twitchUser.display_name,
          avatarUrl: twitchUser.profile_image_url,
        })
      }
    }

    // Create session
    const sessionId = await createSession(db, user.id)

    // Set session cookie
    setCookie(c, 'session', sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    })

    return c.redirect(`/user/${user.id}`)
  } catch (err) {
    console.error('OAuth error:', err)
    return c.redirect('/?auth_error=unknown')
  }
})

// GET /api/auth/me - Get current user
app.get('/api/auth/me', (c) => {
  const user = c.get('user')

  if (!user) {
    return c.json({ user: null })
  }

  return c.json({ user })
})

// POST /api/auth/logout - Logout
app.post('/api/auth/logout', async (c) => {
  const sessionId = getCookie(c, 'session')

  if (sessionId) {
    const db = createDatabase(c.env.DB)
    await deleteSession(db, sessionId)
  }

  deleteCookie(c, 'session', { path: '/' })

  return c.json({ success: true })
})

// PATCH /api/users/me - Update current user settings
app.patch('/api/users/me', vValidator('json', updateUserSchema), async (c) => {
  const user = c.get('user')

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const data = c.req.valid('json')
  const db = createDatabase(c.env.DB)

  const updated = await updateUser(db, user.id, data)

  return c.json({ user: updated })
})

// =============================================================================
// Public Profile Routes
// =============================================================================

// GET /api/users/:userId/profile - Get user profile with tasks
// Returns profile data if: profile is public OR current user is the owner
app.get('/api/users/:userId/profile', async (c) => {
  const userId = c.req.param('userId')
  const currentUser = c.get('user')
  const db = createDatabase(c.env.DB)

  const user = await getUserById(db, userId)

  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  const isOwner = currentUser?.id === user.id

  // Allow access if profile is public OR if current user is the owner
  if (!user.isPublic && !isOwner) {
    return c.json({ error: 'Profile is private' }, 403)
  }

  const tasks = await getAllTasks(db, userId)

  return c.json({
    user: {
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    },
    tasks,
    isOwner,
  })
})

// =============================================================================
// Task API Routes (require auth)
// =============================================================================

// GET /api/tasks - Get all tasks
app.get('/api/tasks', async (c) => {
  const user = c.get('user')

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const db = createDatabase(c.env.DB)
  const tasks = await getAllTasks(db, user.id)

  return c.json(tasks)
})

// GET /api/tasks/:id - Get single task
app.get('/api/tasks/:id', async (c) => {
  const user = c.get('user')

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const db = createDatabase(c.env.DB)
  const id = c.req.param('id')

  const task = await getTaskById(db, id, user.id)
  if (!task) {
    return c.json({ error: 'Task not found' }, 404)
  }

  return c.json(task)
})

// POST /api/tasks - Create new task
app.post('/api/tasks', vValidator('json', createTaskSchema), async (c) => {
  const user = c.get('user')

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const db = createDatabase(c.env.DB)
  const data = c.req.valid('json')

  const task = await createTask(db, user.id, data)
  return c.json(task, 201)
})

// PUT /api/tasks/:id - Update task
app.put('/api/tasks/:id', vValidator('json', updateTaskSchema), async (c) => {
  const user = c.get('user')

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

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

  const updated = await updateTask(db, user.id, task)
  if (!updated) {
    return c.json({ error: 'Task not found' }, 404)
  }
  return c.json(updated)
})

// DELETE /api/tasks/:id - Delete task
app.delete('/api/tasks/:id', async (c) => {
  const user = c.get('user')

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const db = createDatabase(c.env.DB)
  const id = c.req.param('id')

  const deleted = await deleteTask(db, id, user.id)
  if (!deleted) {
    return c.json({ error: 'Task not found' }, 404)
  }

  return c.body(null, 204)
})

// POST /api/tasks/:id/checkin - Record check-in
app.post('/api/tasks/:id/checkin', vValidator('json', checkInSchema), async (c) => {
  const user = c.get('user')

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const db = createDatabase(c.env.DB)
  const id = c.req.param('id')
  const { completed, value } = c.req.valid('json')

  const task = await recordCheckIn(db, id, user.id, completed, value)
  if (!task) {
    return c.json({ error: 'Task not found' }, 404)
  }

  return c.json(task)
})

export default app
