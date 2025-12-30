import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
    },
    {
      path: '/control',
      name: 'control',
      component: () => import('@/views/ControlView.vue'),
    },
    {
      path: '/archive',
      name: 'archive',
      component: () => import('@/views/ArchiveView.vue'),
    },
    {
      path: '/add',
      name: 'add-task',
      component: () => import('@/views/AddTaskView.vue'),
    },
    {
      path: '/user/:userId',
      name: 'user-profile',
      component: () => import('@/views/UserProfileView.vue'),
    },
  ],
})

export default router
