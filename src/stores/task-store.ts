import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { isTaskCompleted, isDailyTask, isDailyTaskCompletedToday, type Task, type CreateTaskData } from '@/models/task'
import * as taskApi from '@/api/task-api'

export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([])
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)
  const activeTasks = computed(() => tasks.value.filter((t) => !isTaskCompleted(t)))
  const completedTasks = computed(() => tasks.value.filter((t) => isTaskCompleted(t)))

  function getTasksForCheckIn(): Task[] {
    return activeTasks.value.filter((task) => {
      // Skip daily tasks that were already completed today
      if (isDailyTask(task) && isDailyTaskCompletedToday(task)) {
        return false
      }
      return true
    })
  }

  async function fetchTasks(): Promise<void> {
    isLoading.value = true
    errorMessage.value = null

    try {
      tasks.value = await taskApi.getAllTasks()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Failed to fetch tasks'
    } finally {
      isLoading.value = false
    }
  }

  async function addTask(data: CreateTaskData): Promise<Task | null> {
    isLoading.value = true
    errorMessage.value = null
    try {
      const task = await taskApi.createTask(data)
      tasks.value.push(task)
      return task
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Failed to create task'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function removeTask(taskId: string): Promise<void> {
    isLoading.value = true
    errorMessage.value = null

    try {
      await taskApi.deleteTask(taskId)
      tasks.value = tasks.value.filter((t) => t.id !== taskId)
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Failed to delete task'
    } finally {
      isLoading.value = false
    }
  }

  async function updateTask(task: Task): Promise<Task | null> {
    isLoading.value = true
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
    } finally {
      isLoading.value = false
    }
  }

  function getTaskById(taskId: string): Task | undefined {
    return tasks.value.find((t) => t.id === taskId)
  }

  return {
    tasks,
    isLoading,
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
  }
})
