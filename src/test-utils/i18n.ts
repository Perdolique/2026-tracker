import { createI18n } from 'vue-i18n'
import { messages, DEFAULT_LOCALE } from '@/locales'

/**
 * Create i18n instance for tests with English as default locale
 */
export function createTestI18n() {
  return createI18n({
    legacy: false,
    locale: DEFAULT_LOCALE, // 'en'
    fallbackLocale: DEFAULT_LOCALE,
    messages,
  })
}
