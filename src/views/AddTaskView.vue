<template>
  <div :class="$style.container">
    <header :class="$style.header">
      <button :class="$style.backBtn" @click="handleCancel">
        ← Назад
      </button>
      <h1 :class="$style.title">Новая цель ✨</h1>
    </header>

    <TaskForm @submit="handleSubmit" @cancel="handleCancel" />
  </div>
</template>

<script setup lang="ts">
  import { useRouter } from 'vue-router'
  import { useTaskStore } from '@/stores/task-store'
  import TaskForm from '@/components/TaskForm.vue'
  import type { CreateTaskData } from '@/models/task'

  const router = useRouter()
  const store = useTaskStore()

  async function handleSubmit(data: CreateTaskData) {
    const task = await store.addTask(data)
    if (task) {
      router.push({ name: 'home' })
    }
  }

  function handleCancel() {
    router.push({ name: 'home' })
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
</style>
