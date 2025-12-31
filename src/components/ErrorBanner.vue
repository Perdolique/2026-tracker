<template>
  <div v-if="message" :class="$style.banner">
    <Icon icon="tabler:alert-circle" :class="$style.icon" />
    <span :class="$style.message">{{ message }}</span>
    <button
      type="button"
      :class="$style.dismissBtn"
      :aria-label="$t('common.close')"
      @click="emit('dismiss')"
    >
      <Icon icon="tabler:x" />
    </button>
  </div>
</template>

<script setup lang="ts">
  import { Icon } from '@iconify/vue'
  import { useI18n } from 'vue-i18n'

  const { t: $t } = useI18n()

  defineProps<{
    message: string | null
  }>()

  const emit = defineEmits<{
    dismiss: []
  }>()
</script>

<style module>
  .banner {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: var(--color-danger-bg);
    border-bottom: 1px solid var(--color-danger);
    color: var(--color-danger);
  }

  .icon {
    flex-shrink: 0;
    font-size: 1.25rem;
  }

  .message {
    flex: 1;
    font-size: 0.875rem;
    line-height: 1.4;
  }

  .dismissBtn {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    border-radius: 4px;
    transition: background-color 0.15s ease;
  }

  .dismissBtn:hover {
    background: rgba(239, 68, 68, 0.2);
  }

  .dismissBtn:active {
    background: rgba(239, 68, 68, 0.3);
  }
</style>
