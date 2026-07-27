import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: { template: '<div>Vue Home (stub)</div>' }
  },
  {
    path: '/encounter-manager',
    name: 'EncounterManager',
    component: { template: '<div>Vue Encounter Manager (stub)</div>' }
  }
];

const router = createRouter({
  history: createWebHistory('/vue/'),
  routes
});

export default router;
