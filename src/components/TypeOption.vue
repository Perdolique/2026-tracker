<template>
  <label :class="[$style.option, selected && $style.selected, typeClass]">
    <input
      type="radio"
      :value="type"
      :checked="selected"
      :class="$style.radioHidden"
      @change="$emit('select', type)"
    />
    <Icon :icon="typeIcon" :class="$style.icon" />
    <span>{{ typeLabel }}</span>
  </label>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { Icon } from '@iconify/vue'
  import type { TaskType } from '@/models/task'

  const { t } = useI18n()

  const { type, selected = false } = defineProps<{
    type: TaskType
    selected?: boolean
  }>()

  defineEmits<{
    select: [type: TaskType]
  }>()

  const typeLabel = computed(() => {
    switch (type) {
      case 'daily': {
        return t('taskForm.typeDaily')
      }
      case 'progress': {
        return t('taskForm.typeProgress')
      }
      case 'one-time': {
        return t('taskForm.typeOneTime')
      }
    }
  })

  const typeIcon = computed(() => {
    switch (type) {
      case 'daily': {
        return 'tabler:calendar-check'
      }
      case 'progress': {
        return 'tabler:chart-line'
      }
      case 'one-time': {
        return 'tabler:circle-check'
      }
    }
  })

  const typeClass = computed(() => {
    switch (type) {
      case 'daily': {
        return 'daily'
      }
      case 'progress': {
        return 'progress'
      }
      case 'one-time': {
        return 'onetime'
      }
    }
  })
</script>

<style module>
  .option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 12px 8px;
    border: 2px solid var(--color-border);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.875rem;
    text-align: center;
    background: var(--color-surface);
    color: var(--color-text-secondary);
  }

  .option:hover {
    border-color: currentColor;
  }

  .icon {
    width: 24px;
    height: 24px;
  }

  .radioHidden {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  /* Daily */
  .option:global(.daily):hover,
  .option:global(.daily).selected {
    border-color: var(--color-daily);
    color: var(--color-daily);
  }

  .option:global(.daily).selected {
    background: var(--color-daily-bg);
  }

  /* Progress */
  .option:global(.progress):hover,
  .option:global(.progress).selected {
    border-color: var(--color-progress-chip);
    color: var(--color-progress-chip);
  }

  .option:global(.progress).selected {
    background: var(--color-progress-chip-bg);
  }

  /* One-time */
  .option:global(.onetime):hover,
  .option:global(.onetime).selected {
    border-color: var(--color-onetime);
    color: var(--color-onetime);
  }

  .option:global(.onetime).selected {
    background: var(--color-onetime-bg);
  }
</style>
