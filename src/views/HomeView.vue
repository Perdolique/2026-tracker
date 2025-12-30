<template>
  <div :class="$style.container">
    <!-- Loading -->
    <div v-if="authStore.isLoading" :class="$style.loading">
      Загрузка...
    </div>

    <!-- Landing page for non-authenticated users -->
    <template v-else>
      <div :class="$style.landing">
        <h1 :class="$style.title">2026 Tracker 🎯</h1>
        <p :class="$style.subtitle">Отслеживай свои цели на 2026 год</p>

        <button :class="$style.loginBtn" @click="authStore.login">
          <svg :class="$style.twitchIcon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
          </svg>
          Войти через Twitch
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAuthStore } from '@/stores/auth-store'

  const router = useRouter()
  const authStore = useAuthStore()

  onMounted(async () => {
    await authStore.fetchMe()

    // Redirect to user profile if logged in
    if (authStore.isLoggedIn && authStore.user) {
      router.replace({ name: 'user-profile', params: { userId: authStore.user.id } })
    }
  })
</script>

<style module>
  .container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }

  .loading {
    text-align: center;
    color: var(--color-text-secondary);
  }

  .landing {
    text-align: center;
    max-width: 320px;
  }

  .title {
    margin: 0;
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .subtitle {
    margin: 8px 0 32px;
    font-size: 1rem;
    color: var(--color-text-secondary);
  }

  .loginBtn {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 14px 24px;
    font-size: 1rem;
    font-weight: 600;
    border: none;
    border-radius: 12px;
    background: #9146ff;
    color: white;
    cursor: pointer;
    transition: transform 0.1s, box-shadow 0.2s;
  }

  .loginBtn:hover {
    box-shadow: 0 4px 16px rgba(145, 70, 255, 0.4);
  }

  .loginBtn:active {
    transform: scale(0.98);
  }

  .twitchIcon {
    width: 20px;
    height: 20px;
  }
</style>
