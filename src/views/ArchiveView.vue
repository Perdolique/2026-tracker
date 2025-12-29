<template>
  <div :class="$style.container">
    <header :class="$style.header">
      <button :class="$style.backBtn" @click="goBack">
        ← Назад
      </button>
      <h1 :class="$style.title">Архив 📦</h1>
    </header>

    <!-- Loading -->
    <div v-if="store.isLoading" :class="$style.loading">
      Загрузка...
    </div>

    <!-- Empty state -->
    <div v-else-if="store.archivedTasks.length === 0" :class="$style.empty">
      <p :class="$style.emptyEmoji">🏆</p>
      <p :class="$style.emptyText">Пока пусто</p>
      <p :class="$style.emptyHint">Завершённые цели появятся здесь</p>
    </div>

    <!-- Archived tasks -->
    <div v-else :class="$style.taskList">
      <TaskCard
        v-for="task in store.archivedTasks"
        :key="task.id"
        :task="task"
        @delete="handleDelete"
      />
    </div>
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

  function goBack() {
    router.push({ name: 'home' })
  }

  async function handleDelete(taskId: string) {
    if (confirm('Удалить задачу из архива?')) {
      await store.removeTask(taskId)
    }
  }
</script>

<style module>
  .container {
    min-height: 100vh;
    padding: 16px;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
  }

  .backBtn {
    background: none;
    border: none;
    color: var(--color-primary);
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    padding: 8px 0;
  }

  .title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-text);
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

  .emptyEmoji {
    font-size: 3rem;
    margin: 0 0 16px;
  }

  .emptyText {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
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
</style>
