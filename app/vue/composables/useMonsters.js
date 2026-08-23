// Monsters service composable for Vue
import { ref, computed } from 'vue';

export function useMonsters() {
  const byId = computed(() => {
    const m = window.monstersService;
    return m ? m.byId : {};
  });

  // Get monster by ID
  function getMonsterById(id) {
    return byId.value[id] || null;
  }

  return {
    byId,
    getMonsterById,
  };
}
