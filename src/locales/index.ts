// oxlint-disable-next-line id-length
import * as v from 'valibot'
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

const storedLocaleSchema = v.union([
  v.literal<Locale>('en'),
  v.literal<Locale>('ru')
])

/**
 * Detect initial locale based on priority:
 * 1. localStorage (for returning users / guests)
 * 2. Browser language
 * 3. Default (English)
 */
export function detectInitialLocale(): Locale {
  // 1. Check localStorage
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
  const locale = v.safeParse(storedLocaleSchema, stored)

  if (locale.success) {
    return locale.output
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
