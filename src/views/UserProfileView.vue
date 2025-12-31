<template>
  <div :class="$style.container">
    <!-- Loading -->
    <div v-if="isLoading" :class="$style.loading">
      {{ $t('common.loading') }}
    </div>

    <!-- Error: Private profile (show login for non-owners) -->
    <div v-else-if="error === 'private'" :class="$style.error">
      <Icon icon="tabler:lock" :class="$style.errorIcon" />
      <p :class="$style.errorText">{{ $t('profile.privateProfile') }}</p>
      <button :class="$style.loginBtn" @click="authStore.login">
        <svg :class="$style.twitchIcon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
        </svg>
        {{ $t('common.loginTwitch') }}
      </button>
    </div>

    <!-- Error: Other errors -->
    <div v-else-if="error" :class="$style.error">
      <Icon icon="tabler:mood-sad" :class="$style.errorIcon" />
      <p :class="$style.errorText">{{ errorText }}</p>
      <router-link to="/" :class="$style.homeLink">{{ $t('common.toHome') }}</router-link>
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
              <Icon icon="tabler:settings" :class="$style.settingsIcon" />
            </button>
            <button :class="$style.logoutBtn" @click="handleLogout">
              {{ $t('profile.logout') }}
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

        <p :class="$style.subtitle">{{ $t('profile.progressTitle') }}</p>

        <!-- Floating controls for visitors (not own profile) -->
        <div v-if="!isOwnProfile" :class="$style.visitorControls">
          <div :class="$style.visitorLanguageSelector">
            <button
              :class="[$style.visitorLangBtn, locale === 'en' && $style.visitorLangActive]"
              @click="setLocale('en')"
              :title="'English'"
            >
              EN
            </button>
            <button
              :class="[$style.visitorLangBtn, locale === 'ru' && $style.visitorLangActive]"
              @click="setLocale('ru')"
              :title="'Русский'"
            >
              RU
            </button>
          </div>

          <router-link v-if="authStore.isLoggedIn" to="/" :class="$style.myGoalsLink" :title="$t('profile.myGoals')">
            →
          </router-link>
          <button v-else :class="$style.compactLoginBtn" @click="authStore.login" :title="$t('common.loginTwitch')">
            <svg :class="$style.twitchIconSmall" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
            </svg>
          </button>
        </div>
      </header>

      <!-- Settings modal (only for own profile) -->
      <div v-if="showShareModal && isOwnProfile" :class="$style.settingsModal" @click.self="showShareModal = false">
        <div :class="$style.settingsContent">
          <button :class="$style.modalCloseBtn" @click="showShareModal = false" :title="$t('common.close')">
            <Icon icon="tabler:x" :class="$style.closeIcon" />
          </button>
          <h3 :class="$style.settingsTitle">{{ $t('profile.settings') }}</h3>

          <!-- Sharing section -->
          <div :class="$style.settingsSection">
            <h4 :class="$style.sectionTitle">{{ $t('profile.sharing') }}</h4>
            <div :class="$style.shareToggle">
            <label :class="$style.toggleLabel">
              <input
                type="checkbox"
                :checked="authStore.user?.isPublic"
                @change="handlePublicToggle"
              />
              <span :class="$style.toggleText">
                {{ authStore.user?.isPublic ? $t('profile.publicProfile') : $t('profile.privateProfileToggle') }}
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
              <Icon :icon="copied ? 'tabler:check' : 'tabler:clipboard'" :class="$style.copyIcon" />
            </button>
          </div>
          </div>

          <!-- Language section -->
          <div :class="$style.settingsSection">
            <h4 :class="$style.sectionTitle">{{ $t('profile.language') }}</h4>
            <div :class="$style.languageButtons">
              <button
                :class="[$style.langBtn, locale === 'en' && $style.langActive]"
                @click="setLocale('en')"
              >
                EN
              </button>
              <button
                :class="[$style.langBtn, locale === 'ru' && $style.langActive]"
                @click="setLocale('ru')"
              >
                RU
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Global Progress -->
      <GlobalProgress
        v-if="allTasks.length > 0"
        :tasks="allTasks"
      />

      <!-- Action buttons (only for own profile) -->
      <div v-if="isOwnProfile" :class="$style.actions">
        <button
          :class="$style.addTaskBtn"
          @click="goToAddTask"
        >
          <Icon icon="tabler:plus" :class="$style.addTaskIcon" /> {{ $t('profile.addTask') }}
        </button>
      </div>

      <!-- Loading tasks (only on initial load) -->
      <div v-if="isOwnProfile && taskStore.isLoading && taskStore.tasks.length === 0" :class="$style.loadingTasks">
        {{ $t('profile.loadingTasks') }}
      </div>

      <!-- Empty state -->
      <div v-else-if="activeTasks.length === 0 && completedTasks.length === 0" :class="$style.empty">
        <p :class="$style.emptyText">{{ $t('profile.noTasksYet') }}</p>
        <p v-if="isOwnProfile" :class="$style.emptyHint">{{ $t('profile.addFirstGoal') }}</p>
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
          <TaskCard
            v-for="task in activeTasks"
            :key="task.id"
            :task="task"
            readonly
          />
        </template>
      </div>

      <!-- Completed tasks section -->
      <template v-if="completedTasks.length > 0">
        <!-- Section for own profile -->
        <template v-if="isOwnProfile">
          <h2 :class="$style.sectionTitle">{{ $t('profile.achieved') }}</h2>
          <div :class="$style.taskList">
            <TaskCard
              v-for="task in completedTasks"
              :key="task.id"
              :task="task"
              :completed="true"
              @delete="handleDelete"
            />
          </div>
        </template>

        <!-- Section for public profile -->
        <template v-else>
          <h2 :class="$style.sectionTitle">{{ $t('profile.achieved') }}</h2>
          <div :class="$style.taskList">
            <TaskCard
              v-for="task in completedTasks"
              :key="task.id"
              :task="task"
              :completed="true"
              readonly
            />
          </div>
        </template>
      </template>

      <!-- FAB (only for own profile) -->
      <FabButton
        v-if="isOwnProfile"
        icon="tabler:device-gamepad-2"
        :aria-label="'Check-in'"
        :disabled="taskStore.getTasksForCheckIn().length === 0"
        @click="goToControl"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useI18n } from 'vue-i18n'
  import { Icon } from '@iconify/vue'
  import { useAuthStore } from '@/stores/auth-store'
  import { useTaskStore } from '@/stores/task-store'
  import { useLocale } from '@/composables/use-locale'
  import TaskCard from '@/components/TaskCard.vue'
  import GlobalProgress from '@/components/GlobalProgress.vue'
  import FabButton from '@/components/FabButton.vue'
  import { isTaskCompleted, type Task } from '@/models/task'

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

  const { t } = useI18n()
  const route = useRoute()
  const router = useRouter()
  const authStore = useAuthStore()
  const taskStore = useTaskStore()
  const { locale, setLocale, syncLocaleFromUser } = useLocale()

  const profile = ref<Profile | null>(null)
  const isLoading = ref(true)
  const error = ref<string | null>(null)
  const showShareModal = ref(false)
  const copied = ref(false)

  const isOwnProfile = computed(() => profile.value?.isOwner ?? false)

  const errorText = computed(() => {
    switch (error.value) {
      case 'not-found': {
        return t('profile.userNotFound')
      }
      case 'load-error': {
        return t('profile.loadError')
      }
      case 'network': {
        return t('profile.networkError')
      }
      default: {
        return error.value
      }
    }
  })

  // For own profile, use taskStore; for public profile, use profile.tasks
  const activeTasks = computed(() => {
    if (isOwnProfile.value) {
      return taskStore.activeTasks
    }
    return profile.value?.tasks.filter(t => !isTaskCompleted(t)) ?? []
  })

  const completedTasks = computed(() => {
    if (isOwnProfile.value) {
      return taskStore.completedTasks
    }
    return profile.value?.tasks.filter(t => isTaskCompleted(t)) ?? []
  })

  // All tasks for global progress calculation
  const allTasks = computed(() => {
    if (isOwnProfile.value) {
      return taskStore.tasks
    }
    return profile.value?.tasks ?? []
  })

  onMounted(async () => {
    await authStore.fetchMe()
    syncLocaleFromUser()
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
        error.value = 'not-found'
        return
      }

      if (response.status === 403) {
        error.value = 'private'
        return
      }

      if (!response.ok) {
        error.value = 'load-error'
        return
      }

      profile.value = await response.json()

      // If own profile, load tasks from taskStore for interactivity
      if (profile.value?.isOwner) {
        await taskStore.fetchTasks()
      }
    } catch {
      error.value = 'network'
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

  async function handleDelete(taskId: string) {
    if (confirm(t('profile.deleteTask'))) {
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
    width: 48px;
    height: 48px;
    margin-bottom: 16px;
    color: var(--color-text-secondary);
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

  .visitorCta {
    margin-top: 16px;
  }

  .myGoalsLink {
    display: inline-block;
    padding: 12px 24px;
    font-size: 1rem;
    font-weight: 600;
    border: 2px solid var(--color-primary);
    border-radius: 12px;
    background: transparent;
    color: var(--color-primary);
    text-decoration: none;
    transition: background 0.2s, color 0.2s;
  }

  .myGoalsLink:hover {
    background: var(--color-primary);
    color: white;
  }

  .visitorControls {
    position: fixed;
    top: 16px;
    right: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 50;
  }

  .visitorLanguageSelector {
    display: flex;
    gap: 4px;
    background: var(--color-surface);
    border-radius: 8px;
    padding: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .visitorLangBtn {
    padding: 6px 10px;
    font-size: 0.75rem;
    font-weight: 600;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.2s;
  }

  .visitorLangBtn:hover {
    background: var(--color-background);
    color: var(--color-text);
  }

  .visitorLangActive {
    background: var(--color-primary-bg);
    color: var(--color-primary);
  }

  .compactLoginBtn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 8px;
    background: #9146ff;
    color: white;
    cursor: pointer;
    transition: transform 0.1s, box-shadow 0.2s;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .compactLoginBtn:hover {
    box-shadow: 0 4px 12px rgba(145, 70, 255, 0.4);
    transform: translateY(-1px);
  }

  .compactLoginBtn:active {
    transform: scale(0.95);
  }

  .twitchIconSmall {
    width: 18px;
    height: 18px;
  }

  .myGoalsLink {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    font-size: 1.25rem;
    font-weight: 600;
    border-radius: 8px;
    background: var(--color-surface);
    color: var(--color-primary);
    text-decoration: none;
    transition: background 0.2s, transform 0.1s;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .myGoalsLink:hover {
    background: var(--color-primary-bg);
    transform: translateY(-1px);
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
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px 10px;
    border: none;
    border-radius: 8px;
    background: var(--color-surface);
    cursor: pointer;
  }

  .settingsIcon {
    width: 20px;
    height: 20px;
    color: var(--color-text);
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

  .settingsModal {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 16px;
  }

  .settingsContent {
    position: relative;
    background: var(--color-surface);
    border-radius: 16px;
    padding: 20px;
    width: 100%;
    max-width: 360px;
  }

  .modalCloseBtn {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 6px;
    background: var(--color-background);
    color: var(--color-text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    padding: 0;
  }

  .closeIcon {
    width: 16px;
    height: 16px;
  }

  .modalCloseBtn:hover {
    background: var(--color-border);
    color: var(--color-text);
  }

  .settingsTitle {
    margin: 0 0 16px;
    font-size: 1.125rem;
    font-weight: 600;
    text-align: center;
  }

  .settingsSection {
    margin-bottom: 12px;
    padding: 12px;
    background: var(--color-background);
    border-radius: 8px;
  }

  .settingsSection:last-of-type {
    margin-bottom: 0;
  }

  .sectionTitle {
    margin: 0 0 8px;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--color-text-secondary);
  }

  .shareToggle {
    margin-bottom: 8px;
  }

  .toggleLabel {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
  }

  .toggleLabel input {
    width: 18px;
    height: 18px;
    cursor: pointer;
    flex-shrink: 0;
  }

  .toggleText {
    font-size: 0.8125rem;
  }

  .shareLink {
    display: flex;
    gap: 8px;
  }

  .shareLinkInput {
    flex: 1;
    padding: 8px;
    font-size: 0.7rem;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-surface);
    color: var(--color-text);
  }

  .copyBtn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 10px;
    border: none;
    border-radius: 6px;
    background: var(--color-primary);
    cursor: pointer;
  }

  .copyIcon {
    width: 16px;
    height: 16px;
    color: white;
  }

  .languageButtons {
    display: flex;
    gap: 8px;
  }

  .langBtn {
    flex: 1;
    padding: 8px 12px;
    font-size: 0.8125rem;
    font-weight: 500;
    border: 2px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-surface);
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.2s;
  }

  .langBtn:hover {
    border-color: var(--color-primary);
    color: var(--color-text);
  }

  .langActive {
    border-color: var(--color-primary);
    background: var(--color-primary-bg);
    color: var(--color-primary);
  }

  .actions {
    display: flex;
    justify-content: center;
    margin-bottom: 24px;
  }

  .addTaskBtn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 24px;
    font-size: 1rem;
    font-weight: 600;
    border: 2px solid var(--color-primary);
    border-radius: 12px;
    cursor: pointer;
    transition: transform 0.1s, background 0.2s, color 0.2s;
    background: transparent;
    color: var(--color-primary);
  }

  .addTaskBtn:hover {
    background: var(--color-primary);
    color: white;
  }

  .addTaskIcon {
    width: 20px;
    height: 20px;
  }

  .addTaskBtn:active {
    transform: scale(0.98);
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

  .sectionTitle {
    margin: 32px 0 16px;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-text-secondary);
  }

  .taskList {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }


</style>
