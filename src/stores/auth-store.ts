import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { saveLocaleToStorage, type Locale } from '@/locales'

export interface User {
  id: string
  twitchId: string
  displayName: string
  avatarUrl: string | null
  isPublic: boolean
  language: Locale
  createdAt: string
}

function redirectToTwitchAuth(): void {
  globalThis.location.href = '/api/auth/twitch'
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)

  const isLoggedIn = computed(() => user.value !== null)
  const shareUrl = computed(() => {
    if (!user.value) {return null}
    return `${globalThis.location.origin}/user/${user.value.id}`
  })

  async function fetchMe(): Promise<void> {
    isLoading.value = true
    errorMessage.value = null

    try {
      const response = await fetch('/api/auth/me')

      if (!response.ok) {
        throw new Error('Failed to fetch user')
      }

      const data = (await response.json()) as { user: User | null }
      user.value = data.user
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Failed to fetch user'
      user.value = null
    } finally {
      isLoading.value = false
    }
  }

  async function logout(): Promise<void> {
    isLoading.value = true
    errorMessage.value = null

    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' })

      if (!response.ok) {
        throw new Error('Failed to logout')
      }

      user.value = null
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Failed to logout'
    } finally {
      isLoading.value = false
    }
  }

  async function setPublic(isPublic: boolean): Promise<void> {
    if (!user.value) {return}

    isLoading.value = true
    errorMessage.value = null

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
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Failed to update settings'
    } finally {
      isLoading.value = false
    }
  }

  async function setLanguage(language: Locale): Promise<void> {
    // Always save to localStorage (for guests and as fallback)
    saveLocaleToStorage(language)

    // If logged in, also save to profile
    if (user.value) {
      try {
        const response = await fetch('/api/users/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language }),
        })

        if (response.ok) {
          const data = (await response.json()) as { user: User }
          user.value = data.user
        }
      } catch {
        // Silently fail API call, localStorage already saved
      }
    }
  }

  return {
    user,
    isLoading,
    error: errorMessage,
    isLoggedIn,
    shareUrl,
    fetchMe,
    login: redirectToTwitchAuth,
    logout,
    setPublic,
    setLanguage,
  }
})
