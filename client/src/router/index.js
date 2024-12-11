import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue')
  },
  {
    path: '/room/:roomId',
    name: 'Room',
    component: () => import('../views/Room.vue')
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router; 