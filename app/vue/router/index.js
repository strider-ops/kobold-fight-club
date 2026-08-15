import { createRouter, createWebHistory } from 'vue-router';
import Home from '../components/Home.vue';
import EncounterManager from '../components/EncounterManager.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/encounter-manager',
    name: 'EncounterManager',
    component: EncounterManager
  }
];

const router = createRouter({
  history: createWebHistory('/vue/'),
  routes
});

export default router;
