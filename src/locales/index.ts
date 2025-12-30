import en from './en'
import ru from './ru'

export const messages = {
  en,
  ru,
}

export type Locale = keyof typeof messages
export const SUPPORTED_LOCALES: Locale[] = ['en', 'ru']
export const DEFAULT_LOCALE: Locale = 'en'
export const LOCALE_STORAGE_KEY = 'app-language'

/**
 * Detect initial locale based on priority:
 * 1. localStorage (for returning users / guests)
 * 2. Browser language
 * 3. Default (English)
 */
export function detectInitialLocale(): Locale {
  // 1. Check localStorage
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
  if (stored && SUPPORTED_LOCALES.includes(stored as Locale)) {
    return stored as Locale
  }

  // 2. Check browser language
  const browserLang = navigator.language.toLowerCase()
  if (browserLang.startsWith('ru')) {
    return 'ru'
  }

  // 3. Default to English
  return DEFAULT_LOCALE
}

export function saveLocaleToStorage(locale: Locale): void {
  localStorage.setItem(LOCALE_STORAGE_KEY, locale)
}
