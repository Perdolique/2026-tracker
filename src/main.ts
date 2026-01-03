import '@fontsource-variable/inter'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { registerSW } from 'virtual:pwa-register'
import App from './App.vue'
import router from './router'
import { messages, detectInitialLocale, DEFAULT_LOCALE } from './locales'

const i18n = createI18n({
  legacy: false,
  locale: detectInitialLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  messages,
})

const app = createApp(App)

app.use(createPinia())
app.use(i18n)
app.use(router)

app.mount('#app')

// Register service worker without auto-reload
// New SW will activate in background, F5 will load new content
registerSW({ immediate: true })
