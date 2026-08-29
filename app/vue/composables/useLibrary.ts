/**
 * Library management composable for Vue
 *
 * Provides reactive access to saved encounters.
 * Migrated from custom implementation to TypeScript library service.
 */

import { computed, type ComputedRef } from 'vue';
import { library } from '@/services/library';
import type { SavedEncounter } from '@/types';

export interface UseLibraryReturn {
  encounters: ComputedRef<SavedEncounter[]>;
  savedEncounters: ComputedRef<SavedEncounter[]>;
  savedPools: ComputedRef<SavedEncounter[]>;
  storeEncounter: (encounter: SavedEncounter) => SavedEncounter;
  removeEncounter: (encounter: SavedEncounter) => void;
}

export function useLibrary(): UseLibraryReturn {
  // Direct access to TypeScript library service
  const encounters = computed(() => library.encounters);

  // Filter encounters (not pools)
  const savedEncounters = computed(() =>
    library.encounters.filter((e: SavedEncounter) => e.type !== 'pool')
  );

  // Filter pools
  const savedPools = computed(() =>
    library.encounters.filter((e: SavedEncounter) => e.type === 'pool')
  );

  // Store a new encounter/table
  function storeEncounter(encounter: SavedEncounter): SavedEncounter {
    return library.store(encounter);
  }

  // Remove an encounter/table
  function removeEncounter(storedEncounter: SavedEncounter): void {
    library.remove(storedEncounter);
  }

  return {
    encounters,
    savedEncounters,
    savedPools,
    storeEncounter,
    removeEncounter,
  };
}
