<template>
  <div :class="$style.app">
    <RouterView />
  </div>
</template>

<script setup lang="ts">
  import { RouterView } from 'vue-router'
</script>

<style module>
  .app {
    max-width: var(--content-max-width);
    margin: 0 auto;
  }
</style>

<style>
  :root {
    /* Colors - Dark theme by default */
    --color-bg: #0f0f0f;
    --color-surface: #1a1a1a;
    --color-border: #2a2a2a;
    --color-text: #ffffff;
    --color-text-secondary: #888888;
    --color-primary: #6366f1;
    --color-primary-hover: #5558e3;
    --color-primary-bg: rgba(99, 102, 241, 0.15);
    --color-success: #22c55e;
    --color-danger: #ef4444;
    --color-danger-bg: rgba(239, 68, 68, 0.15);
    --color-progress-bg: #2a2a2a;

    /* Type chip colors */
    --color-daily: #60a5fa;
    --color-daily-bg: rgba(96, 165, 250, 0.15);
    --color-progress-chip: #fbbf24;
    --color-progress-chip-bg: rgba(251, 191, 36, 0.15);
    --color-onetime: #4ade80;
    --color-onetime-bg: rgba(74, 222, 128, 0.15);

    /* Layout */
    --content-max-width: 600px;

    /* Typography */
    --font-family: 'Inter Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }
  @media (prefers-color-scheme: light) {
    :root {
      --color-bg: #f5f5f5;
      --color-surface: #ffffff;
      --color-border: #e5e5e5;
      --color-text: #171717;
      --color-text-secondary: #737373;
      --color-primary-bg: rgba(99, 102, 241, 0.1);
      --color-danger-bg: rgba(239, 68, 68, 0.1);
      --color-progress-bg: #e5e5e5;

      /* Type chip colors - light theme */
      --color-daily: #2563eb;
      --color-daily-bg: rgba(37, 99, 235, 0.1);
      --color-progress-chip: #d97706;
      --color-progress-chip-bg: rgba(217, 119, 6, 0.1);
      --color-onetime: #16a34a;
      --color-onetime-bg: rgba(22, 163, 74, 0.1);
    }
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  html {
    font-family: var(--font-family);
    font-size: 16px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    margin: 0;
    padding: 0;
    background: var(--color-bg);
    color: var(--color-text);
    min-height: 100vh;
  }

  /* Reset */
  button {
    font-family: inherit;
  }

  input,
  textarea {
    font-family: inherit;
  }
</style>
