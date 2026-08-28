/**
 * Library Service
 *
 * Manages saved encounters in localStorage.
 * Provides storage and retrieval of encounter snapshots.
 */

import { reactive } from 'vue';
import { store } from './store';
import type { SavedEncounter } from '@/types';

const STORAGE_KEY = '5em-library';

interface LibraryState {
  encounters: SavedEncounter[];
}

const state = reactive<LibraryState>({
  encounters: [],
});

export interface LibraryService {
  encounters: SavedEncounter[];
  remove(storedEncounter: SavedEncounter): void;
  store(encounter: SavedEncounter): SavedEncounter;
  initialize(): Promise<void>;
}

class Library implements LibraryService {
  get encounters(): SavedEncounter[] {
    return state.encounters;
  }

  /**
   * Remove an encounter from the library
   */
  remove(storedEncounter: SavedEncounter): void {
    const index = state.encounters.indexOf(storedEncounter);
    if (index !== -1) {
      state.encounters.splice(index, 1);
      this.freeze();
    }
  }

  /**
   * Store an encounter in the library
   * If it already exists, return the existing one
   */
  store(encounter: SavedEncounter): SavedEncounter {
    // Check if encounter already exists
    for (let i = 0; i < state.encounters.length; i++) {
      if (this.areEncountersEqual(encounter, state.encounters[i])) {
        return state.encounters[i];
      }
    }

    // Add new encounter
    state.encounters.push(encounter);
    this.freeze();

    return encounter;
  }

  /**
   * Initialize the library by loading from storage
   */
  async initialize(): Promise<void> {
    await this.thaw();
  }

  /**
   * Save encounters to localStorage
   */
  private freeze(): void {
    store.set(STORAGE_KEY, state.encounters);
  }

  /**
   * Load encounters from localStorage
   */
  private async thaw(): Promise<void> {
    const frozen = await store.get<SavedEncounter[]>(STORAGE_KEY);
    if (frozen && Array.isArray(frozen)) {
      state.encounters.splice(0, state.encounters.length, ...frozen);
    }
  }

  /**
   * Deep equality check for encounters
   */
  private areEncountersEqual(a: SavedEncounter, b: SavedEncounter): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }
}

// Export singleton instance
export const library = new Library();

// Auto-initialize (only in browser environment)
if (typeof window !== 'undefined' && typeof process === 'undefined') {
  library.initialize();
}
