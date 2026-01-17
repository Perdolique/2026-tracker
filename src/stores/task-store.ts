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

  // Sorted tasks with priority: check-in enabled → recently updated
  const sortedActiveTasks = computed(() =>
    activeTasks.value.toSorted((taskA, taskB) => {
      // Priority 1: Tasks that require check-in
      if (taskA.checkInEnabled && !taskB.checkInEnabled) {
        return -1
      }
      if (!taskA.checkInEnabled && taskB.checkInEnabled) {
        return 1
      }

      // Priority 2: Recently updated (desc)
      const aUpdated = new Date(taskA.updatedAt).getTime()
      const bUpdated = new Date(taskB.updatedAt).getTime()
      return bUpdated - aUpdated
    })
  )

  const sortedCompletedTasks = computed(() =>
    // Completed tasks: sort by update date (most recent first)
    completedTasks.value.toSorted((taskA, taskB) => {
      const aUpdated = new Date(taskA.updatedAt).getTime()
      const bUpdated = new Date(taskB.updatedAt).getTime()
      return bUpdated - aUpdated
    })
  )

  function getTasksForCheckIn(): Task[] {
    const filtered = activeTasks.value.filter((task) => {
      // Only include tasks with check-in enabled
      if (!task.checkInEnabled) {
        return false
      }
      // Skip daily tasks that were already completed today
      if (isDailyTask(task)) {
        const completedToday = isDailyTaskCompletedToday(task)
        if (completedToday) {
          return false
        }
      }
      return true
    })
    return filtered
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

  async function addProgressValueToTask(taskId: string, value: number): Promise<Task | null> {
    errorMessage.value = null
    try {
      const updatedTask = await taskApi.addProgressValue(taskId, value)

      // Update task in local state
      const index = tasks.value.findIndex((t) => t.id === taskId)
      if (index !== -1) {
        tasks.value[index] = updatedTask
      }

      return updatedTask
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Failed to add progress value'
      return null
    }
  }

  async function deleteProgressValueFromTask(taskId: string, completionId: number): Promise<Task | null> {
    errorMessage.value = null
    try {
      const updatedTask = await taskApi.deleteProgressCompletion(taskId, completionId)

      // Update task in local state
      const index = tasks.value.findIndex((t) => t.id === taskId)
      if (index !== -1) {
        tasks.value[index] = updatedTask
      }

      return updatedTask
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Failed to delete progress value'
      return null
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
    sortedActiveTasks,
    sortedCompletedTasks,
    getTasksForCheckIn,
    fetchTasks,
    addTask,
    removeTask,
    updateTask,
    processCheckIn,
    addProgressValueToTask,
    deleteProgressValueFromTask,
    getTaskById,
    clearError,
  }
})
