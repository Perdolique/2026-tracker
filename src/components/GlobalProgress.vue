<template>
  <div :class="$style.container">
    <div :class="$style.header">
      <span :class="$style.label">{{ $t('profile.globalProgress') }}</span>
      <span :class="$style.percentage">{{ formattedProgress }}%</span>
    </div>
    <div :class="$style.progressBar">
      <div
        :class="[$style.progressFill, progress === 100 && $style.complete]"
        :style="{ width: `${progress}%` }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { getGlobalProgress, type Task } from '@/models/task'

  const props = defineProps<{
    tasks: Task[]
  }>()

  const progress = computed(() => getGlobalProgress(props.tasks))
  const formattedProgress = computed(() => Math.round(progress.value))
</script>

<style module>
  .container {
    padding: 12px 16px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    margin-bottom: 16px;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .label {
    font-size: 14px;
    color: var(--color-text-secondary);
    font-weight: 500;
  }

  .percentage {
    font-size: 16px;
    font-weight: 600;
    color: var(--color-text);
  }

  .progressBar {
    height: 12px;
    background: var(--color-progress-bg);
    border-radius: 6px;
    overflow: hidden;
  }

  .progressFill {
    height: 100%;
    background: var(--color-primary);
    border-radius: 6px;
    transition: width 0.3s ease;
  }

  .complete {
    background: var(--color-success, #22c55e);
  }
</style>
