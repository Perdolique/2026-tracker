import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: async () => import('@/views/HomeView.vue'),
    },
    {
      path: '/control',
      name: 'control',
      component: async () => import('@/views/ControlView.vue'),
    },
    {
      path: '/add',
      name: 'add-task',
      component: async () => import('@/views/AddTaskView.vue'),
    },
    {
      path: '/user/:userId',
      name: 'user-profile',
      component: async () => import('@/views/UserProfileView.vue'),
    },
  ],
})

export default router
