<template>
  <div :class="$style.container">
    <header :class="$style.header">
      <h1 :class="$style.title">2026 Tracker 🎯</h1>
      <p :class="$style.subtitle">Отслеживай свои цели</p>
    </header>

    <!-- Action buttons -->
    <div :class="$style.actions">
      <button
        :class="$style.controlBtn"
        :disabled="store.getTasksForCheckIn().length === 0"
        @click="goToControl"
      >
        🎮 Check-in
      </button>
      <button :class="$style.archiveBtn" @click="goToArchive">
        📦 Архив
      </button>
    </div>

    <!-- Loading state -->
    <div v-if="store.isLoading" :class="$style.loading">
      Загрузка...
    </div>

    <!-- Empty state -->
    <div v-else-if="store.activeTasks.length === 0" :class="$style.empty">
      <p :class="$style.emptyText">Пока нет задач 🤷</p>
      <p :class="$style.emptyHint">Добавь первую цель!</p>
    </div>

    <!-- Task list -->
    <div v-else :class="$style.taskList">
      <TaskCard
        v-for="task in store.activeTasks"
        :key="task.id"
        :task="task"
        @delete="handleDelete"
      />
    </div>

    <!-- FAB -->
    <button :class="$style.fab" @click="goToAddTask" aria-label="Добавить задачу">
      +
    </button>
  </div>
</template>

<script setup lang="ts">
  import { onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { useTaskStore } from '@/stores/task-store'
  import TaskCard from '@/components/TaskCard.vue'

  const router = useRouter()
  const store = useTaskStore()

  onMounted(() => {
    store.fetchTasks()
  })

  function goToAddTask() {
    router.push({ name: 'add-task' })
  }

  function goToControl() {
    router.push({ name: 'control' })
  }

  function goToArchive() {
    router.push({ name: 'archive' })
  }

  async function handleDelete(taskId: string) {
    if (confirm('Удалить задачу?')) {
      await store.removeTask(taskId)
    }
  }
</script>

<style module>
  .container {
    min-height: 100vh;
    padding: 16px;
    padding-bottom: 100px;
  }

  .header {
    text-align: center;
    margin-bottom: 24px;
  }

  .title {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--color-text);
  }
  .subtitle {
    margin: 4px 0 0;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 24px;
  }

  .controlBtn,
  .archiveBtn {
    padding: 14px 16px;
    font-size: 1rem;
    font-weight: 600;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: transform 0.1s, opacity 0.2s;
  }

  .controlBtn:active,
  .archiveBtn:active {
    transform: scale(0.98);
  }

  .controlBtn {
    background: var(--color-primary);
    color: white;
  }

  .controlBtn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .archiveBtn {
    background: var(--color-surface);
    color: var(--color-text);
    border: 2px solid var(--color-border);
  }

  .loading {
    text-align: center;
    padding: 40px;
    color: var(--color-text-secondary);
  }

  .empty {
    text-align: center;
    padding: 60px 20px;
  }

  .emptyText {
    margin: 0;
    font-size: 1.25rem;
    color: var(--color-text);
  }

  .emptyHint {
    margin: 8px 0 0;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  .taskList {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .fab {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    border: none;
    background: var(--color-primary);
    color: white;
    font-size: 2rem;
    font-weight: 300;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    transition: transform 0.2s, box-shadow 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .fab:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
  }

  .fab:active {
    transform: scale(0.95);
  }
</style>
