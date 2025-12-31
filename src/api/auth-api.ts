import { api } from './client'
import type { User } from '@/stores/auth-store'
import type { Locale } from '@/locales'

interface AuthMeResponse {
  user: User | null
}

interface UserResponse {
  user: User
}

// Get current authenticated user
export async function getMe(): Promise<User | null> {
  const data = await api.get('auth/me').json<AuthMeResponse>()
  return data.user
}

// Logout current user
export async function logout(): Promise<void> {
  await api.post('auth/logout')
}

// Update user settings
export async function updateUser(settings: { isPublic?: boolean; language?: Locale }): Promise<User> {
  const data = await api.patch('users/me', { json: settings }).json<UserResponse>()
  return data.user
}
