<template>
  <article :class="$style.card">
    <Icon :icon="typeIcon" :class="$style.icon" />
    <h2 :class="$style.title">{{ task.title }}</h2>
    <p v-if="task.description" :class="$style.description">
      {{ task.description }}
    </p>

    <!-- Progress bar -->
    <div :class="$style.progressContainer">
      <div :class="$style.progressBar">
        <div :class="$style.progressFill" :style="{ width: `${progress}%` }" />
      </div>
      <span :class="$style.progressText">{{ progressText }}</span>
    </div>
  </article>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { Icon } from '@iconify/vue'
  import { isDailyTask, isProgressTask, isOneTimeTask, getTaskProgress, type Task } from '@/models/task'

  const { t } = useI18n()

  const { task } = defineProps<{
    task: Task
  }>()

  const progress = computed(() => getTaskProgress(task))

  const progressText = computed(() => {
    if (isDailyTask(task)) {
      return t('taskCard.daysProgress', { completed: task.completedDates.length, target: task.targetDays })
    }
    if (isProgressTask(task)) {
      return `${task.currentValue.toLocaleString()} / ${task.targetValue.toLocaleString()} ${task.unit}`
    }
    if (isOneTimeTask(task)) {
      return task.completedAt ? t('taskCard.completed') : t('checkIn.waitingForCompletion')
    }
    return ''
  })

  const typeIcon = computed(() => {
    switch (task.type) {
      case 'daily': {
        return 'tabler:calendar-check'
      }
      case 'progress': {
        return 'tabler:chart-line'
      }
      case 'one-time': {
        return 'tabler:circle-check'
      }
      default: {
        return 'tabler:help'
      }
    }
  })
</script>

<style module>
  .card {
    background: var(--color-surface);
    border-radius: 16px;
    padding: 24px;
    text-align: center;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .icon {
    width: 48px;
    height: 48px;
    display: block;
    margin: 0 auto 16px;
    color: var(--color-primary);
  }

  .title {
    margin: 0 0 8px;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .description {
    margin: 0 0 16px;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    line-height: 1.5;
  }

  .progressContainer {
    margin-top: 16px;
  }

  .progressBar {
    height: 10px;
    background: var(--color-progress-bg);
    border-radius: 5px;
    overflow: hidden;
  }

  .progressFill {
    height: 100%;
    background: var(--color-primary);
    border-radius: 5px;
    transition: width 0.3s ease;
  }

  .progressText {
    display: block;
    margin-top: 8px;
    font-size: 0.75rem;
    color: var(--color-text-secondary);
  }
</style>
