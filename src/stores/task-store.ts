import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { isTaskCompleted, isDailyTask, isDailyTaskCompletedToday, type Task, type CreateTaskData } from '@/models/task'
import * as taskApi from '@/api/task-api'

export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([])
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)
  const hasFetched = ref(false)
  const activeTasks = computed(() => tasks.value.filter((t) => !isTaskCompleted(t)))
  const completedTasks = computed(() => tasks.value.filter((t) => isTaskCompleted(t)))

  function getTasksForCheckIn(): Task[] {
    return activeTasks.value.filter((task) => {
      // Only include tasks with check-in enabled
      if (!task.checkInEnabled) {
        return false
      }
      // Skip daily tasks that were already completed today
      if (isDailyTask(task) && isDailyTaskCompletedToday(task)) {
        return false
      }
      return true
    })
  }

  async function fetchTasks(): Promise<void> {
    // Only show loading indicator on first fetch (stale-while-revalidate)
    const isInitialLoad = !hasFetched.value
    if (isInitialLoad) {
      isLoading.value = true
    }

    try {
      tasks.value = await taskApi.getAllTasks()
      hasFetched.value = true
      // Clear error on successful refresh
      errorMessage.value = null
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Failed to fetch tasks'
    } finally {
      if (isInitialLoad) {
        isLoading.value = false
      }
    }
  }

  function clearError(): void {
    errorMessage.value = null
  }

  async function addTask(data: CreateTaskData): Promise<Task | null> {
    errorMessage.value = null
    try {
      const task = await taskApi.createTask(data)
      tasks.value.push(task)
      return task
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Failed to create task'
      return null
    }
  }

  async function removeTask(taskId: string): Promise<void> {
    errorMessage.value = null

    try {
      await taskApi.deleteTask(taskId)
      tasks.value = tasks.value.filter((t) => t.id !== taskId)
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Failed to delete task'
    }
  }

  async function updateTask(task: Task): Promise<Task | null> {
    errorMessage.value = null

    try {
      const updatedTask = await taskApi.updateTask(task)
      const index = tasks.value.findIndex((t) => t.id === task.id)
      if (index !== -1) {
        tasks.value[index] = updatedTask
      }
      return updatedTask
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Failed to update task'
      return null
    }
  }

  async function processCheckIn(
    taskId: string,
    completed: boolean,
    value?: number
  ): Promise<void> {
    errorMessage.value = null
    try {
      const updatedTask = await taskApi.recordCheckIn(taskId, completed, value)

      // Update task in local state
      const index = tasks.value.findIndex((t) => t.id === taskId)
      if (index !== -1) {
        tasks.value[index] = updatedTask
      }
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Failed to process check-in'
    }
  }

  function getTaskById(taskId: string): Task | undefined {
    return tasks.value.find((t) => t.id === taskId)
  }

  return {
    tasks,
    isLoading,
    hasFetched,
    error: errorMessage,
    activeTasks,
    completedTasks,
    getTasksForCheckIn,
    fetchTasks,
    addTask,
    removeTask,
    updateTask,
    processCheckIn,
    getTaskById,
    clearError,
  }
})
