import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Task, CreateTaskData } from '@/models/task'
import { isTaskCompleted } from '@/models/task'
import * as taskApi from '@/api/task-api'

export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const activeTasks = computed(() => tasks.value.filter((t) => !t.isArchived))
  const archivedTasks = computed(() => tasks.value.filter((t) => t.isArchived))

  function getTasksForCheckIn(): Task[] {
    return activeTasks.value.filter((t) => !isTaskCompleted(t))
  }

  async function fetchTasks(): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      tasks.value = await taskApi.getAllTasks()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch tasks'
    } finally {
      isLoading.value = false
    }
  }

  async function addTask(data: CreateTaskData): Promise<Task | null> {
    isLoading.value = true
    error.value = null
    try {
      const task = await taskApi.createTask(data)
      tasks.value.push(task)
      return task
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to create task'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function removeTask(taskId: string): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      await taskApi.deleteTask(taskId)
      tasks.value = tasks.value.filter((t) => t.id !== taskId)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to delete task'
    } finally {
      isLoading.value = false
    }
  }

  async function processCheckIn(
    taskId: string,
    completed: boolean,
    value?: number
  ): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const updatedTask = await taskApi.recordCheckIn(taskId, completed, value)

      // Update task in local state
      const index = tasks.value.findIndex((t) => t.id === taskId)
      if (index !== -1) {
        tasks.value[index] = updatedTask
      }

      // Auto-archive if completed
      if (isTaskCompleted(updatedTask) && !updatedTask.isArchived) {
        await archiveTask(taskId)
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to process check-in'
    } finally {
      isLoading.value = false
    }
  }

  async function archiveTask(taskId: string): Promise<void> {
    try {
      const index = tasks.value.findIndex((t) => t.id === taskId)
      if (index !== -1) {
        const task = tasks.value[index]
        if (!task) return

        // Update local state immediately
        const updatedTask: Task = { ...task, isArchived: true }
        tasks.value[index] = updatedTask

        // Persist to API
        await taskApi.updateTask(updatedTask)
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to archive task'
    }
  }

  function getTaskById(taskId: string): Task | undefined {
    return tasks.value.find((t) => t.id === taskId)
  }

  return {
    tasks,
    isLoading,
    error,
    activeTasks,
    archivedTasks,
    getTasksForCheckIn,
    fetchTasks,
    addTask,
    removeTask,
    processCheckIn,
    archiveTask,
    getTaskById,
  }
})
