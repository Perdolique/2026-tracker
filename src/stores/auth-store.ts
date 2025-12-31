import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { saveLocaleToStorage, type Locale } from '@/locales'
import * as authApi from '@/api/auth-api'

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
  const hasFetched = ref(false)
  const errorMessage = ref<string | null>(null)

  const isLoggedIn = computed(() => user.value !== null)
  const shareUrl = computed(() => {
    if (!user.value) {return null}
    return `${globalThis.location.origin}/user/${user.value.id}`
  })

  async function fetchMe(): Promise<void> {
    const isInitialLoad = !hasFetched.value
    if (isInitialLoad) {
      isLoading.value = true
    }
    errorMessage.value = null

    try {
      user.value = await authApi.getMe()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Failed to fetch user'
      user.value = null
    } finally {
      hasFetched.value = true
      if (isInitialLoad) {
        isLoading.value = false
      }
    }
  }

  async function logout(): Promise<void> {
    isLoading.value = true
    errorMessage.value = null

    try {
      await authApi.logout()
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
      user.value = await authApi.updateUser({ isPublic })
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
        user.value = await authApi.updateUser({ language })
      } catch {
        // Silently fail API call, localStorage already saved
      }
    }
  }

  return {
    user,
    isLoading,
    hasFetched,
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
