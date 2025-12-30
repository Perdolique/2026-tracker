import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface User {
  id: string
  twitchId: string
  displayName: string
  avatarUrl: string | null
  isPublic: boolean
  createdAt: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const isLoggedIn = computed(() => user.value !== null)
  const shareUrl = computed(() => {
    if (!user.value) return null
    return `${window.location.origin}/user/${user.value.id}`
  })

  async function fetchMe(): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const response = await fetch('/api/auth/me')

      if (!response.ok) {
        throw new Error('Failed to fetch user')
      }

      const data = (await response.json()) as { user: User | null }
      user.value = data.user
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch user'
      user.value = null
    } finally {
      isLoading.value = false
    }
  }

  function login(): void {
    window.location.href = '/api/auth/twitch'
  }

  async function logout(): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' })

      if (!response.ok) {
        throw new Error('Failed to logout')
      }

      user.value = null
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to logout'
    } finally {
      isLoading.value = false
    }
  }

  async function setPublic(isPublic: boolean): Promise<void> {
    if (!user.value) return

    isLoading.value = true
    error.value = null

    try {
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic }),
      })

      if (!response.ok) {
        throw new Error('Failed to update settings')
      }

      const data = (await response.json()) as { user: User }
      user.value = data.user
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update settings'
    } finally {
      isLoading.value = false
    }
  }

  return {
    user,
    isLoading,
    error,
    isLoggedIn,
    shareUrl,
    fetchMe,
    login,
    logout,
    setPublic,
  }
})
