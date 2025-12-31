<template>
  <div :class="$style.container">
    <header :class="$style.header">
      <button :class="$style.backBtn" @click="goBack">
        {{ $t('common.back') }}
      </button>

      <h1 :class="$style.title">{{ $t('checkIn.pageTitle') }}</h1>
    </header>

    <!-- Loading (only on first fetch) -->
    <div v-if="!store.hasFetched" :class="$style.loading">
      {{ $t('common.loading') }}
    </div>

    <!-- No tasks -->
    <div v-else-if="!hasTasksForCheckIn && !isComplete" :class="$style.empty">
      <Icon icon="tabler:confetti" :class="$style.emptyIcon" />
      <p :class="$style.emptyText">{{ $t('checkIn.noTasks') }}</p>
      <button :class="$style.homeBtn" @click="goBack">
        {{ $t('common.toHome') }}
      </button>
    </div>

    <!-- Completed state -->
    <div v-else-if="isComplete" :class="$style.complete">
      <Icon icon="tabler:rocket" :class="$style.completeIcon" />
      <p :class="$style.completeText">{{ $t('checkIn.allDone') }}</p>
      <p :class="$style.completeHint">{{ $t('checkIn.allTasksChecked') }}</p>
      <button :class="$style.homeBtn" @click="goBack">
        {{ $t('common.toHome') }}
      </button>
    </div>

    <!-- Wizard -->
    <CheckInWizard
      v-else
      :tasks="tasksForCheckIn"
      :on-check-in="handleCheckIn"
      @complete="handleComplete"
    />
  </div>
</template>

<script setup lang="ts">
  import { onMounted, ref, computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { Icon } from '@iconify/vue'
  import { useTaskStore } from '@/stores/task-store'
  import CheckInWizard from '@/components/CheckInWizard.vue'

  const router = useRouter()
  const store = useTaskStore()
  const isComplete = ref(false)

  // Используем computed чтобы всегда получать актуальные данные из store
  const tasksForCheckIn = computed(() => store.getTasksForCheckIn())

  const hasTasksForCheckIn = computed(() => tasksForCheckIn.value.length > 0)

  onMounted(async () => {
    await store.fetchTasks()
  })

  function goBack() {
    router.push({ name: 'home' })
  }

  async function handleCheckIn(taskId: string, completed: boolean, value?: number) {
    await store.processCheckIn(taskId, completed, value)
  }

  function handleComplete() {
    isComplete.value = true
  }
</script>

<style module>
  .container {
    height: 100%;
    padding: 16px;
    display: flex;
    flex-direction: column;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 32px;
  }

  .backBtn {
    background: none;
    border: none;
    color: var(--color-primary);
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    padding: 8px 0;
  }

  .title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .loading {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-secondary);
  }

  .empty,
  .complete {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 40px;
  }

  .emptyIcon,
  .completeIcon {
    width: 64px;
    height: 64px;
    margin-bottom: 16px;
    color: var(--color-primary);
  }

  .emptyText,
  .completeText {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .completeHint {
    margin: 8px 0 0;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  .homeBtn {
    margin-top: 24px;
    padding: 14px 32px;
    font-size: 1rem;
    font-weight: 600;
    border: none;
    border-radius: 12px;
    background: var(--color-primary);
    color: white;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .homeBtn:hover {
    opacity: 0.9;
  }
</style>
