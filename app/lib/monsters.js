// Wrapper for monsters.service.js - plain JS module
// Usage in Vue: import { loadMonsters, getMonsters } from '@/lib/monsters'

let monstersInstance = null;

export async function getMonsters() {
  if (!monstersInstance) {
    monstersInstance = window.monstersService;
  }
  return monstersInstance;
}

export async function loadMonsters() {
  const m = await getMonsters();
  return m.load();
}
