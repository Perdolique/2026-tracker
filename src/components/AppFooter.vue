<template>
  <footer :class="$style.footer">
    <a
      href="https://github.com/Perdolique/2026-tracker"
      target="_blank"
      rel="noopener noreferrer"
      :class="$style.link"
      aria-label="GitHub"
    >
      <Icon icon="tabler:brand-github" :class="$style.icon" />
    </a>
  </footer>
</template>

<script setup lang="ts">
  import { Icon } from '@iconify/vue'
</script>

<style module>
  .footer {
    padding: 24px 16px;
    text-align: center;
  }

  .link {
    color: var(--color-text-secondary);
    transition: color 0.15s ease;
  }

  .link:hover {
    color: var(--color-primary);
  }

  .icon {
    width: 24px;
    height: 24px;
  }
</style>
