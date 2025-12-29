import { describe, it, expect, beforeEach } from 'vitest'
import { render } from 'vitest-browser-vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import AddTaskView from '../AddTaskView.vue'
import HomeView from '../HomeView.vue'

const STORAGE_KEY = '2026-tracker:tasks'

function createTestRouter() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'home', component: HomeView },
      { path: '/add', name: 'add-task', component: AddTaskView },
    ],
  })
}

async function waitFor(
  condition: () => boolean,
  timeout = 2000,
  interval = 50,
): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (condition()) return
    await new Promise((resolve) => setTimeout(resolve, interval))
  }
  throw new Error('waitFor timeout')
}

describe('AddTaskView - Browser Tests', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('should create a one-time task successfully', async () => {
    const router = createTestRouter()
    const pinia = createPinia()

    await router.push('/add')
    await router.isReady()

    const screen = render(AddTaskView, {
      global: {
        plugins: [router, pinia],
      },
    })

    // Заполняем название таски
    const titleInput = screen.getByLabelText(/название/i)
    await titleInput.fill('Прочитать TypeScript handbook')

    // Выбираем тип "Разовая" (one-time)
    const oneTimeOption = screen.getByText('Разовая')
    await oneTimeOption.click()

    // Нажимаем "Создать"
    const submitButton = screen.getByText('Создать')
    await submitButton.click()

    // Ждём пока данные сохранятся в localStorage (API имеет искусственную задержку)
    await waitFor(() => {
      const tasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      return tasks.length > 0
    })

    // Проверяем, что таска создалась в localStorage
    const tasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')

    expect(tasks).toHaveLength(1)
    expect(tasks[0]).toMatchObject({
      title: 'Прочитать TypeScript handbook',
      type: 'one-time',
      isArchived: false,
    })
    expect(tasks[0].id).toBeDefined()
    expect(tasks[0].createdAt).toBeDefined()
    expect(tasks[0].completedAt).toBeUndefined()
  })
})
