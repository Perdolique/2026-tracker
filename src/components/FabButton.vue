<template>
  <button
    :class="[$style.fab, disabled && $style.disabled]"
    :aria-label="ariaLabel"
    :disabled="disabled"
    @click="$emit('click')"
  >
    <Icon :icon="icon" :class="$style.icon" />
  </button>
</template>

<script setup lang="ts">
  import { Icon } from '@iconify/vue'

  const { icon = 'tabler:plus', ariaLabel, disabled = false } = defineProps<{
    icon?: string
    ariaLabel?: string
    disabled?: boolean
  }>()

  defineEmits<{
    click: []
  }>()
</script>

<style module>
  .fab {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    border: none;
    padding: 0;
    background: var(--color-primary);
    color: white;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
    display: grid;
    place-items: center;
  }

  .fab:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
  }

  .fab:active:not(:disabled) {
    transform: scale(0.95);
  }

  .disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .icon {
    width: 28px;
    height: 28px;
  }
</style>
