<template>
  <span :class="[$style.chip, typeClass]">
    <Icon :icon="typeIcon" :class="$style.icon" />
    {{ typeLabel }}
  </span>
</template>

<script setup lang="ts">
  import { computed, useCssModule } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { Icon } from '@iconify/vue'
  import type { TaskType } from '@/models/task'

  const { t } = useI18n()

  const props = defineProps<{
    type: TaskType
  }>()

  const typeLabel = computed(() => {
    switch (props.type) {
      case 'daily': {
        return t('taskCard.dailyLabel')
      }
      case 'progress': {
        return t('taskCard.progressLabel')
      }
      case 'one-time': {
        return t('taskCard.oneTimeLabel')
      }
    }
  })

  const typeIcon = computed(() => {
    switch (props.type) {
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
    switch (props.type) {
      case 'daily': {
        return $style.daily
      }
      case 'progress': {
        return $style.progress
      }
      case 'one-time': {
        return $style.onetime
      }
    }
  })

  const $style = useCssModule()
</script>

<style module>
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .icon {
    width: 14px;
    height: 14px;
  }

  .daily {
    background: var(--color-daily-bg);
    color: var(--color-daily);
  }

  .progress {
    background: var(--color-progress-chip-bg);
    color: var(--color-progress-chip);
  }

  .onetime {
    background: var(--color-onetime-bg);
    color: var(--color-onetime);
  }
</style>
