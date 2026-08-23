import { createRouter, createWebHistory } from 'vue-router';
import Home from '../components/Home.vue';
import EncounterManager from '../components/EncounterManager.vue';
import EncounterBuilder from '../components/EncounterBuilder.vue';

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
  },
  {
    path: '/encounter-builder',
    name: 'EncounterBuilder',
    component: EncounterBuilder
  }
];

const router = createRouter({
  history: createWebHistory('/vue/'),
  routes
});

export default router;
