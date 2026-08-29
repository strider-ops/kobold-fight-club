import { createRouter, createWebHistory } from 'vue-router';
import Home from '../components/Home.vue';
import EncounterManager from '../components/EncounterManager.vue';
import EncounterBuilder from '../components/EncounterBuilder.vue';
import About from '../components/About.vue';
import ManagePlayers from '../components/ManagePlayers.vue';
import BattleSetup from '../components/BattleSetup.vue';
import BattleTracker from '../components/BattleTracker.vue';

const routes = [
  {
    path: '/',
    redirect: '/encounter-builder'
  },
  {
    path: '/home',
    name: 'Home',
    component: Home
  },
  {
    path: '/encounter-builder',
    name: 'EncounterBuilder',
    component: EncounterBuilder
  },
  {
    path: '/encounter-manager',
    name: 'EncounterManager',
    component: EncounterManager
  },
  {
    path: '/about',
    name: 'About',
    component: About
  },
  {
    path: '/players',
    name: 'ManagePlayers',
    component: ManagePlayers
  },
  {
    path: '/battle-setup',
    name: 'BattleSetup',
    component: BattleSetup
  },
  {
    path: '/battle-tracker',
    name: 'BattleTracker',
    component: BattleTracker
  }
];

const router = createRouter({
  history: createWebHistory('/'),
  routes
});

export default router;
