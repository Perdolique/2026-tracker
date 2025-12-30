import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth-store'
import { saveLocaleToStorage, SUPPORTED_LOCALES, type Locale } from '@/locales'

/**
 * Composable for managing locale with i18n and auth store synchronization
 */
export function useLocale() {
  const { locale } = useI18n()
  const authStore = useAuthStore()

  /**
   * Set locale and persist to storage (and profile if logged in)
   */
  async function setLocale(newLocale: Locale): Promise<void> {
    locale.value = newLocale
    saveLocaleToStorage(newLocale)
    await authStore.setLanguage(newLocale)
  }

  /**
   * Sync locale from user profile (call after login/fetchMe)
   */
  function syncLocaleFromUser(): void {
    if (authStore.user?.language && SUPPORTED_LOCALES.includes(authStore.user.language)) {
      locale.value = authStore.user.language
      saveLocaleToStorage(authStore.user.language)
    }
  }

  return {
    locale,
    setLocale,
    syncLocaleFromUser,
    supportedLocales: SUPPORTED_LOCALES,
  }
}
