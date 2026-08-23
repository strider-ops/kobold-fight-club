// Library management composable for Vue
import { ref, computed } from 'vue';
import { store } from '@lib/store';

export function useLibrary() {
  const encounters = ref([]);

  const storageKey = '5em-library';

  // Load encounters from storage
  async function loadEncounters() {
    const frozen = await store.get(storageKey);
    if (frozen) {
      encounters.value = Array.isArray(frozen) ? frozen : [];
    }
  }

  // Save encounters to storage
  async function saveEncounters() {
    await store.set(storageKey, encounters.value);
  }

  // Store a new encounter/table
  async function storeEncounter(encounter) {
    // Check if already exists
    for (let i = 0; i < encounters.value.length; i++) {
      if (deepEqual(encounter, encounters.value[i])) {
        return encounters.value[i];
      }
    }

    encounters.value.push(encounter);
    await saveEncounters();
    return encounter;
  }

  // Remove an encounter/table
  async function removeEncounter(storedEncounter) {
    const index = encounters.value.indexOf(storedEncounter);
    if (index !== -1) {
      encounters.value.splice(index, 1);
      await saveEncounters();
    }
  }

  // Filter encounters (not pools)
  const savedEncounters = computed(() =>
    encounters.value.filter(e => e.type !== 'pool')
  );

  // Filter pools
  const savedPools = computed(() =>
    encounters.value.filter(e => e.type === 'pool')
  );

  // Load on init
  loadEncounters();

  return {
    encounters,
    savedEncounters,
    savedPools,
    storeEncounter,
    removeEncounter,
    loadEncounters,
  };
}

// Deep equality check (simple version for objects)
function deepEqual(obj1, obj2) {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}
