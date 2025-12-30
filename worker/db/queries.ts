import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { tasks, dailyCompletions, users, sessions } from './schema'

// Re-export task queries
export {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  recordCheckIn,
  type CheckInParams,
} from './task-queries'

export type Database = ReturnType<typeof createDatabase>

export function createDatabase(d1: D1Database) {
  return drizzle(d1, { schema: { tasks, dailyCompletions, users, sessions } })
}

// =============================================================================
// User & Session Queries
// =============================================================================

export interface User {
  id: string
  twitchId: string
  displayName: string
  avatarUrl: string | null
  isPublic: boolean
  language: 'en' | 'ru'
  createdAt: string
}

export async function getUserByTwitchId(db: Database, twitchId: string): Promise<User | null> {
  const rows = await db.select().from(users).where(eq(users.twitchId, twitchId))
  return rows[0] ?? null
}

export async function getUserById(db: Database, id: string): Promise<User | null> {
  const rows = await db.select().from(users).where(eq(users.id, id))
  return rows[0] ?? null
}

export async function createUser(
  db: Database,
  data: { twitchId: string; displayName: string; avatarUrl?: string }
): Promise<User> {
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()

  await db.insert(users).values({
    id,
    twitchId: data.twitchId,
    displayName: data.displayName,
    avatarUrl: data.avatarUrl ?? null,
    isPublic: false,
    language: 'en',
    createdAt,
  })

  return {
    id,
    twitchId: data.twitchId,
    displayName: data.displayName,
    avatarUrl: data.avatarUrl ?? null,
    isPublic: false,
    language: 'en',
    createdAt,
  }
}

export async function updateUser(
  db: Database,
  id: string,
  data: { displayName?: string; avatarUrl?: string; isPublic?: boolean; language?: 'en' | 'ru' }
): Promise<User | null> {
  await db.update(users).set(data).where(eq(users.id, id))
  return getUserById(db, id)
}

export async function createSession(db: Database, userId: string): Promise<string> {
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days

  await db.insert(sessions).values({
    id,
    userId,
    expiresAt,
    createdAt,
  })

  return id
}

export async function getSessionWithUser(
  db: Database,
  sessionId: string
): Promise<{ session: { id: string; expiresAt: string }; user: User } | null> {
  const rows = await db
    .select()
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sessionId))

  if (rows.length === 0) {return null}

  const [row] = rows
  if (!row) {return null}

  const session = row.sessions
  const user = row.users

  // Check if session expired
  if (new Date(session.expiresAt) < new Date()) {
    await deleteSession(db, sessionId)
    return null
  }

  return {
    session: { id: session.id, expiresAt: session.expiresAt },
    user,
  }
}

export async function deleteSession(db: Database, sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId))
}

export async function deleteUserSessions(db: Database, userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId))
}
