import { Hono } from 'hono'
import { vValidator } from '@hono/valibot-validator'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import {
  createDatabase,
  getAllTasks,
  getUserByTwitchId,
  getUserById,
  createUser,
  updateUser,
  createSession,
  getSessionWithUser,
  deleteSession,
  type User,
} from './db/queries'
import { updateUserSchema } from './schemas'
import { taskRoutes } from './task-routes'
import { getTwitchCallbackUrl } from './utils'

// Cloudflare Worker bindings
interface Bindings {
  DB: D1Database
  ASSETS: Fetcher
  TWITCH_CLIENT_ID: string
  TWITCH_CLIENT_SECRET: string
  REDIRECT_BASE_URL?: string // Optional: base URL for OAuth redirects when the callback URL differs from this worker (e.g. dev, staging, production)
}

interface Variables {
  user: User | null
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

interface TwitchUserResponse {
  data: {
    id: string
    display_name: string
    profile_image_url: string
  }[]
}

interface TwitchTokenResponse {
  access_token: string
}

// =============================================================================
// Auth Middleware
// =============================================================================

/**
 * Middleware to load user from session cookie (optional auth)
 */
app.use('/api/*', async (context, next) => {
  const sessionId = getCookie(context, 'session')

  if (sessionId === undefined) {
    context.set('user', null)
  } else {
    const db = createDatabase(context.env.DB)
    const result = await getSessionWithUser(db, sessionId)

    if (result) {
      context.set('user', result.user)
    } else {
      // Invalid or expired session, clear cookie
      deleteCookie(context, 'session')
      context.set('user', null)
    }
  }

  await next()
})

// =============================================================================
// Auth Routes (Twitch OAuth)
// =============================================================================

// GET /api/auth/twitch - Redirect to Twitch OAuth
app.get('/api/auth/twitch', (context) => {
  const clientId = context.env.TWITCH_CLIENT_ID
  const redirectUri = getTwitchCallbackUrl(context)

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code'
  })

  return context.redirect(`https://id.twitch.tv/oauth2/authorize?${params.toString()}`)
})

// GET /api/auth/twitch/callback - Handle OAuth callback
app.get('/api/auth/twitch/callback', async (context) => {
  const code = context.req.query('code')
  const error = context.req.query('error')

  if (error !== undefined || code === undefined) {
    return context.redirect('/?auth_error=access_denied')
  }

  const clientId = context.env.TWITCH_CLIENT_ID
  const clientSecret = context.env.TWITCH_CLIENT_SECRET
  const redirectUri = getTwitchCallbackUrl(context)

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
      console.error('Token exchange failed:', await tokenResponse.text(), redirectUri)
      return context.redirect('/?auth_error=token_exchange_failed')
    }

    const tokenData = await tokenResponse.json<TwitchTokenResponse>()

    // Get user info from Twitch
    const userResponse = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Client-Id': clientId,
      },
    })

    if (!userResponse.ok) {
      console.error('User fetch failed:', await userResponse.text())
      return context.redirect('/?auth_error=user_fetch_failed')
    }

    const userData = await userResponse.json<TwitchUserResponse>()
    const [twitchUser] = userData.data

    if (!twitchUser) {
      return context.redirect('/?auth_error=no_user_data')
    }

    const db = createDatabase(context.env.DB)

    // Find or create user
    let user = await getUserByTwitchId(db, twitchUser.id)

    if (user) {
      // Update user info if changed
      if (user.displayName !== twitchUser.display_name || user.avatarUrl !== twitchUser.profile_image_url) {
        await updateUser(db, user.id, {
          displayName: twitchUser.display_name,
          avatarUrl: twitchUser.profile_image_url,
        })
      }
    } else {
      user = await createUser(db, {
        twitchId: twitchUser.id,
        displayName: twitchUser.display_name,
        avatarUrl: twitchUser.profile_image_url,
      })
    }

    // Create session
    const sessionId = await createSession(db, user.id)

    // Set session cookie
    setCookie(context, 'session', sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    })

    return context.redirect(`/user/${user.id}`)
  } catch (error) {
    console.error('OAuth error:', error)
    return context.redirect('/?auth_error=unknown')
  }
})

// GET /api/auth/me - Get current user
app.get('/api/auth/me', (context) => {
  const user = context.get('user')

  if (!user) {
    return context.json({ user: null })
  }

  return context.json({ user })
})

// POST /api/auth/logout - Logout
app.post('/api/auth/logout', async (context) => {
  const sessionId = getCookie(context, 'session')

  if (sessionId !== undefined) {
    const db = createDatabase(context.env.DB)
    await deleteSession(db, sessionId)
  }

  deleteCookie(context, 'session', { path: '/' })

  return context.json({ success: true })
})

// PATCH /api/users/me - Update current user settings
app.patch('/api/users/me', vValidator('json', updateUserSchema), async (context) => {
  const user = context.get('user')

  if (!user) {
    return context.json({ error: 'Unauthorized' }, 401)
  }

  const data = context.req.valid('json')
  const db = createDatabase(context.env.DB)

  const updated = await updateUser(db, user.id, data)

  return context.json({ user: updated })
})

// =============================================================================
// Public Profile Routes
// =============================================================================

// GET /api/users/:userId/profile - Get user profile with tasks
// Returns profile data if: profile is public OR current user is the owner
app.get('/api/users/:userId/profile', async (context) => {
  const userId = context.req.param('userId')
  const currentUser = context.get('user')
  const db = createDatabase(context.env.DB)

  const user = await getUserById(db, userId)

  if (!user) {
    return context.json({ error: 'User not found' }, 404)
  }

  const isOwner = currentUser?.id === user.id

  // Allow access if profile is public OR if current user is the owner
  if (!user.isPublic && !isOwner) {
    return context.json({ error: 'Profile is private' }, 403)
  }

  const tasks = await getAllTasks(db, userId)

  return context.json({
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

app.route('/api/tasks', taskRoutes)

export default app
