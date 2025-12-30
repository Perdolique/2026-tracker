<template>
  <div :class="$style.container">
    <!-- Loading -->
    <div v-if="isLoading" :class="$style.loading">
      Загрузка...
    </div>

    <!-- Error: Private profile (show login for non-owners) -->
    <div v-else-if="error === 'private'" :class="$style.error">
      <p :class="$style.errorIcon">🔒</p>
      <p :class="$style.errorText">Профиль приватный</p>
      <button :class="$style.loginBtn" @click="authStore.login">
        <svg :class="$style.twitchIcon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
        </svg>
        Войти через Twitch
      </button>
    </div>

    <!-- Error: Other errors -->
    <div v-else-if="error" :class="$style.error">
      <p :class="$style.errorIcon">😢</p>
      <p :class="$style.errorText">{{ error }}</p>
      <router-link to="/" :class="$style.homeLink">На главную</router-link>
    </div>

    <!-- Profile -->
    <template v-else-if="profile">
      <header :class="$style.header">
        <!-- User bar (only for own profile) -->
        <div v-if="isOwnProfile" :class="$style.userBar">
          <div :class="$style.userInfo">
            <img
              v-if="profile.user.avatarUrl"
              :src="profile.user.avatarUrl"
              :alt="profile.user.displayName"
              :class="$style.avatarSmall"
            />
            <span :class="$style.userName">{{ profile.user.displayName }}</span>
          </div>
          <div :class="$style.userActions">
            <button :class="$style.shareBtn" @click="toggleShare">
              {{ authStore.user?.isPublic ? '🔗' : '🔒' }}
            </button>
            <button :class="$style.logoutBtn" @click="handleLogout">
              Выйти
            </button>
          </div>
        </div>

        <!-- Public profile header (for visitors) -->
        <template v-else>
          <img
            v-if="profile.user.avatarUrl"
            :src="profile.user.avatarUrl"
            :alt="profile.user.displayName"
            :class="$style.avatar"
          />
          <h1 :class="$style.title">{{ profile.user.displayName }}</h1>
        </template>

        <p :class="$style.subtitle">Прогресс по целям 2026 🎯</p>
      </header>

      <!-- Share modal (only for own profile) -->
      <div v-if="showShareModal && isOwnProfile" :class="$style.shareModal" @click.self="showShareModal = false">
        <div :class="$style.shareModalContent">
          <h3 :class="$style.shareTitle">Поделиться прогрессом</h3>

          <div :class="$style.shareToggle">
            <label :class="$style.toggleLabel">
              <input
                type="checkbox"
                :checked="authStore.user?.isPublic"
                @change="handlePublicToggle"
              />
              <span :class="$style.toggleText">
                {{ authStore.user?.isPublic ? 'Профиль публичный 🌍' : 'Профиль приватный 🔒' }}
              </span>
            </label>
          </div>

          <div v-if="authStore.user?.isPublic" :class="$style.shareLink">
            <input
              type="text"
              :value="authStore.shareUrl"
              readonly
              :class="$style.shareLinkInput"
              @click="($event.target as HTMLInputElement).select()"
            />
            <button :class="$style.copyBtn" @click="copyShareLink">
              {{ copied ? '✅' : '📋' }}
            </button>
          </div>

          <button :class="$style.closeBtn" @click="showShareModal = false">
            Закрыть
          </button>
        </div>
      </div>

      <!-- Action buttons (only for own profile) -->
      <div v-if="isOwnProfile" :class="$style.actions">
        <button
          :class="$style.controlBtn"
          :disabled="taskStore.getTasksForCheckIn().length === 0"
          @click="goToControl"
        >
          🎮 Check-in
        </button>
        <button :class="$style.archiveBtn" @click="goToArchive">
          📦 Архив
        </button>
      </div>

      <!-- Loading tasks -->
      <div v-if="isOwnProfile && taskStore.isLoading" :class="$style.loadingTasks">
        Загрузка задач...
      </div>

      <!-- Empty state -->
      <div v-else-if="activeTasks.length === 0" :class="$style.empty">
        <p :class="$style.emptyText">Пока нет задач 🤷</p>
        <p v-if="isOwnProfile" :class="$style.emptyHint">Добавь первую цель!</p>
      </div>

      <!-- Task list -->
      <div v-else :class="$style.taskList">
        <!-- Own profile: interactive TaskCard -->
        <template v-if="isOwnProfile">
          <TaskCard
            v-for="task in activeTasks"
            :key="task.id"
            :task="task"
            @delete="handleDelete"
          />
        </template>

        <!-- Public profile: read-only cards -->
        <template v-else>
          <div
            v-for="task in activeTasks"
            :key="task.id"
            :class="[$style.taskCard, task.isArchived && $style.archived]"
          >
            <div :class="$style.taskHeader">
              <span :class="$style.taskIcon">{{ getTaskIcon(task) }}</span>
              <h3 :class="$style.taskTitle">{{ task.title }}</h3>
              <span v-if="task.isArchived" :class="$style.archivedBadge">📦</span>
            </div>

            <div :class="$style.taskProgress">
              <div :class="$style.progressBar">
                <div
                  :class="$style.progressFill"
                  :style="{ width: `${getProgress(task)}%` }"
                />
              </div>
              <span :class="$style.progressText">{{ getProgressText(task) }}</span>
            </div>
          </div>
        </template>
      </div>

      <!-- FAB (only for own profile) -->
      <button v-if="isOwnProfile" :class="$style.fab" @click="goToAddTask" aria-label="Добавить задачу">
        +
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useAuthStore } from '@/stores/auth-store'
  import { useTaskStore } from '@/stores/task-store'
  import TaskCard from '@/components/TaskCard.vue'
  import type { Task, DailyTask, ProgressTask, OneTimeTask } from '@/models/task'

  interface PublicUser {
    id: string
    displayName: string
    avatarUrl: string | null
  }

  interface Profile {
    user: PublicUser
    tasks: Task[]
    isOwner: boolean
  }

  const route = useRoute()
  const router = useRouter()
  const authStore = useAuthStore()
  const taskStore = useTaskStore()

  const profile = ref<Profile | null>(null)
  const isLoading = ref(true)
  const error = ref<string | null>(null)
  const showShareModal = ref(false)
  const copied = ref(false)

  const isOwnProfile = computed(() => profile.value?.isOwner ?? false)

  // For own profile, use taskStore; for public profile, use profile.tasks
  const activeTasks = computed(() => {
    if (isOwnProfile.value) {
      return taskStore.activeTasks
    }
    return profile.value?.tasks.filter(t => !t.isArchived) ?? []
  })

  onMounted(async () => {
    await authStore.fetchMe()
    await loadProfile()
  })

  // Reload profile when userId changes
  watch(() => route.params.userId, async () => {
    await loadProfile()
  })

  async function loadProfile() {
    const userId = route.params.userId as string
    isLoading.value = true
    error.value = null

    try {
      const response = await fetch(`/api/users/${userId}/profile`)

      if (response.status === 404) {
        error.value = 'Пользователь не найден'
        return
      }

      if (response.status === 403) {
        error.value = 'private'
        return
      }

      if (!response.ok) {
        error.value = 'Ошибка загрузки профиля'
        return
      }

      profile.value = await response.json()

      // If own profile, load tasks from taskStore for interactivity
      if (profile.value?.isOwner) {
        await taskStore.fetchTasks()
      }
    } catch (e) {
      error.value = 'Ошибка сети'
    } finally {
      isLoading.value = false
    }
  }

  function goToAddTask() {
    router.push({ name: 'add-task' })
  }

  function goToControl() {
    router.push({ name: 'control' })
  }

  function goToArchive() {
    router.push({ name: 'archive' })
  }

  async function handleDelete(taskId: string) {
    if (confirm('Удалить задачу?')) {
      await taskStore.removeTask(taskId)
    }
  }

  function toggleShare() {
    showShareModal.value = true
  }

  async function handlePublicToggle(event: Event) {
    const isPublic = (event.target as HTMLInputElement).checked
    await authStore.setPublic(isPublic)
  }

  async function copyShareLink() {
    if (authStore.shareUrl) {
      await navigator.clipboard.writeText(authStore.shareUrl)
      copied.value = true
      setTimeout(() => {
        copied.value = false
      }, 2000)
    }
  }

  async function handleLogout() {
    await authStore.logout()
    router.push({ name: 'home' })
  }

  function getTaskIcon(task: Task): string {
    switch (task.type) {
      case 'daily':
        return '📅'
      case 'progress':
        return '📊'
      case 'one-time':
        return '✅'
    }
  }

  function getProgress(task: Task): number {
    switch (task.type) {
      case 'daily':
        return Math.min(100, ((task as DailyTask).completedDates.length / (task as DailyTask).targetDays) * 100)
      case 'progress':
        return Math.min(100, ((task as ProgressTask).currentValue / (task as ProgressTask).targetValue) * 100)
      case 'one-time':
        return (task as OneTimeTask).completedAt ? 100 : 0
    }
  }

  function getProgressText(task: Task): string {
    switch (task.type) {
      case 'daily': {
        const daily = task as DailyTask
        return `${daily.completedDates.length} / ${daily.targetDays} дней`
      }
      case 'progress': {
        const progress = task as ProgressTask
        return `${progress.currentValue.toLocaleString()} / ${progress.targetValue.toLocaleString()} ${progress.unit}`
      }
      case 'one-time':
        return (task as OneTimeTask).completedAt ? 'Выполнено ✓' : 'В процессе'
    }
  }
</script>

<style module>
  .container {
    min-height: 100vh;
    padding: 16px;
    padding-bottom: 100px;
  }

  .loading {
    text-align: center;
    padding: 60px;
    color: var(--color-text-secondary);
  }

  .loadingTasks {
    text-align: center;
    padding: 40px;
    color: var(--color-text-secondary);
  }

  .error {
    text-align: center;
    padding: 60px 20px;
  }

  .errorIcon {
    font-size: 3rem;
    margin: 0 0 16px;
  }

  .errorText {
    font-size: 1.125rem;
    color: var(--color-text);
    margin: 0 0 24px;
  }

  .homeLink {
    display: inline-block;
    padding: 12px 24px;
    background: var(--color-primary);
    color: white;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
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

  .header {
    text-align: center;
    margin-bottom: 24px;
  }

  .userBar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    min-height: 40px;
  }

  .userInfo {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .avatarSmall {
    width: 32px;
    height: 32px;
    border-radius: 50%;
  }

  .userName {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text);
  }

  .userActions {
    display: flex;
    gap: 8px;
  }

  .shareBtn {
    padding: 6px 10px;
    font-size: 1rem;
    border: none;
    border-radius: 8px;
    background: var(--color-surface);
    cursor: pointer;
  }

  .logoutBtn {
    padding: 6px 12px;
    font-size: 0.75rem;
    border: none;
    border-radius: 8px;
    background: var(--color-surface);
    color: var(--color-text-secondary);
    cursor: pointer;
  }

  .avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    margin-bottom: 12px;
  }

  .title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .subtitle {
    margin: 4px 0 0;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  .shareModal {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 16px;
  }

  .shareModalContent {
    background: var(--color-surface);
    border-radius: 16px;
    padding: 24px;
    width: 100%;
    max-width: 360px;
  }

  .shareTitle {
    margin: 0 0 16px;
    font-size: 1.125rem;
    text-align: center;
  }

  .shareToggle {
    margin-bottom: 16px;
  }

  .toggleLabel {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
  }

  .toggleLabel input {
    width: 20px;
    height: 20px;
    cursor: pointer;
  }

  .toggleText {
    font-size: 0.875rem;
  }

  .shareLink {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }

  .shareLinkInput {
    flex: 1;
    padding: 10px;
    font-size: 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-background);
    color: var(--color-text);
  }

  .copyBtn {
    padding: 10px;
    border: none;
    border-radius: 8px;
    background: var(--color-primary);
    cursor: pointer;
  }

  .closeBtn {
    width: 100%;
    padding: 12px;
    font-size: 0.875rem;
    font-weight: 600;
    border: none;
    border-radius: 8px;
    background: var(--color-border);
    color: var(--color-text);
    cursor: pointer;
  }

  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 24px;
  }

  .controlBtn,
  .archiveBtn {
    padding: 14px 16px;
    font-size: 1rem;
    font-weight: 600;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: transform 0.1s, opacity 0.2s;
  }

  .controlBtn:active,
  .archiveBtn:active {
    transform: scale(0.98);
  }

  .controlBtn {
    background: var(--color-primary);
    color: white;
  }

  .controlBtn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .archiveBtn {
    background: var(--color-surface);
    color: var(--color-text);
    border: 2px solid var(--color-border);
  }

  .empty {
    text-align: center;
    padding: 40px;
  }

  .emptyText {
    margin: 0;
    font-size: 1.25rem;
    color: var(--color-text);
  }

  .emptyHint {
    margin: 8px 0 0;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  .taskList {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  /* Read-only task cards for public profiles */
  .taskCard {
    background: var(--color-surface);
    border-radius: 12px;
    padding: 16px;
  }

  .taskCard.archived {
    opacity: 0.6;
  }

  .taskHeader {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .taskIcon {
    font-size: 1.25rem;
  }

  .taskTitle {
    flex: 1;
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .archivedBadge {
    font-size: 0.875rem;
  }

  .taskProgress {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .progressBar {
    flex: 1;
    height: 8px;
    background: var(--color-border);
    border-radius: 4px;
    overflow: hidden;
  }

  .progressFill {
    height: 100%;
    background: var(--color-primary);
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .progressText {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    white-space: nowrap;
  }

  .fab {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    border: none;
    padding: 0 0 6px;
    background: var(--color-primary);
    color: white;
    font-size: 2.5rem;
    font-weight: 400;
    line-height: 2.5rem;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    transition: transform 0.2s, box-shadow 0.2s;
    display: grid;
    align-items: center;
    justify-content: center;
  }

  .fab:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
  }

  .fab:active {
    transform: scale(0.95);
  }
</style>
