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
    <div v-if="appVersion" :class="$style.version">{{ appVersion }}</div>
  </footer>
</template>

<script setup lang="ts">
  import { Icon } from '@iconify/vue'
  import { ref, onMounted } from 'vue'

  const appVersion = ref<string | null>(null)

  onMounted(async () => {
    try {
      const response = await fetch('/version.json')
      const data = await response.json()
      appVersion.value = `v${data.version}-${data.gitHash}`
    } catch {
      // Fallback — version did not load, hide the version block
    }
  })
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

  .version {
    margin-top: 8px;
    font-size: 12px;
    color: var(--color-text-secondary);
    opacity: 0.7;
  }
</style>
