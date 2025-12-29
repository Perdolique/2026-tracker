<template>
  <article :class="$style.card">
    <header :class="$style.header">
      <span :class="$style.type">{{ typeLabel }}</span>
      <button
        :class="$style.deleteBtn"
        @click="handleDelete"
        aria-label="Удалить задачу"
      >
        ✕
      </button>
    </header>

    <h3 :class="$style.title">{{ task.title }}</h3>

    <p v-if="task.description" :class="$style.description">
      {{ task.description }}
    </p>

    <div :class="$style.progressContainer">
      <div :class="$style.progressBar">
        <div
          :class="$style.progressFill"
          :style="{ width: `${progress}%` }"
        />
      </div>
      <span :class="$style.progressText">{{ progressText }}</span>
    </div>
  </article>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import type { Task } from '@/models/task'
  import { getTaskProgress, isDailyTask, isProgressTask, isOneTimeTask } from '@/models/task'

  const props = defineProps<{
    task: Task
  }>()

  const emit = defineEmits<{
    delete: [taskId: string]
  }>()

  const progress = computed(() => getTaskProgress(props.task))

  const progressText = computed(() => {
    const task = props.task
    if (isDailyTask(task)) {
      return `${task.completedDates.length} / ${task.targetDays} дней`
    }
    if (isProgressTask(task)) {
      return `${task.currentValue.toLocaleString()} / ${task.targetValue.toLocaleString()} ${task.unit}`
    }
    if (isOneTimeTask(task)) {
      return task.completedAt ? 'Выполнено ✓' : 'Не выполнено'
    }
    return ''
  })

  const typeLabel = computed(() => {
    switch (props.task.type) {
      case 'daily':
        return '📅 Ежедневная'
      case 'progress':
        return '📊 Прогресс'
      case 'one-time':
        return '✅ Разовая'
    }
  })

  function handleDelete() {
    emit('delete', props.task.id)
  }
</script>

<style module>
  .card {
    background: var(--color-surface);
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .type {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
  }

  .deleteBtn {
    background: none;
    border: none;
    color: var(--color-text-secondary);
    cursor: pointer;
    padding: 4px 8px;
    font-size: 1rem;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .deleteBtn:hover {
    background: var(--color-danger-bg);
    color: var(--color-danger);
  }

  .title {
    margin: 0 0 8px;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .description {
    margin: 0 0 12px;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    line-height: 1.4;
  }

  .progressContainer {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .progressBar {
    height: 8px;
    background: var(--color-progress-bg);
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
    text-align: right;
  }
</style>
