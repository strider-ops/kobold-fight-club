/**
 * Tests for Library Service
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { library } from '../library';
import { store } from '../store';
import type { SavedEncounter } from '@/types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem(key: string) {
      return store[key] || null;
    },
    setItem(key: string, value: string) {
      store[key] = value.toString();
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      store = {};
    },
  };
})();

global.localStorage = localStorageMock as any;

describe('Library Service', () => {
  beforeEach(async () => {
    localStorage.clear();
    // Reset library state
    library.encounters.splice(0, library.encounters.length);
    await library.initialize();
  });

  describe('store', () => {
    it('should store a new encounter', () => {
      const encounter: SavedEncounter = {
        name: 'Dragon Fight',
        groups: {
          'mm.adult-red-dragon': {
            monster: {
              id: 'mm.adult-red-dragon',
              name: 'Adult Red Dragon',
              cr: { string: '17', text: '17', value: 17, exp: 18000 },
            } as any,
            qty: 1,
          },
        },
      };

      const stored = library.store(encounter);

      expect(stored).toStrictEqual(encounter);
      expect(library.encounters).toHaveLength(1);
      expect(library.encounters[0]).toStrictEqual(encounter);
    });

    it('should not duplicate identical encounters', () => {
      const encounter: SavedEncounter = {
        name: 'Goblin Ambush',
        groups: {},
      };

      const first = library.store(encounter);
      const second = library.store({ ...encounter }); // Create a copy with same content

      // Should return the first stored encounter when duplicate is stored
      expect(second).toStrictEqual(first);
      expect(library.encounters).toHaveLength(1);
    });

    it('should persist encounters to localStorage', async () => {
      const encounter: SavedEncounter = {
        name: 'Test Encounter',
        groups: {},
      };

      library.store(encounter);

      // Create a new library instance and load
      const stored = await store.get<SavedEncounter[]>('5em-library');
      expect(stored).toHaveLength(1);
      expect(stored![0].name).toBe('Test Encounter');
    });
  });

  describe('remove', () => {
    it('should remove an encounter from the library', () => {
      const encounter: SavedEncounter = {
        name: 'To Remove',
        groups: {},
      };

      library.store(encounter);
      expect(library.encounters).toHaveLength(1);

      library.remove(encounter);
      expect(library.encounters).toHaveLength(0);
    });

    it('should persist removal to localStorage', async () => {
      const encounter: SavedEncounter = {
        name: 'Will Be Removed',
        groups: {},
      };

      library.store(encounter);
      library.remove(encounter);

      const stored = await store.get<SavedEncounter[]>('5em-library');
      expect(stored).toEqual([]);
    });

    it('should handle removing non-existent encounter gracefully', () => {
      const encounter: SavedEncounter = {
        name: 'Not Stored',
        groups: {},
      };

      expect(() => library.remove(encounter)).not.toThrow();
      expect(library.encounters).toHaveLength(0);
    });
  });

  describe('initialize', () => {
    it('should load encounters from localStorage', async () => {
      const encounters: SavedEncounter[] = [
        { name: 'Encounter 1', groups: {} },
        { name: 'Encounter 2', groups: {} },
      ];

      await store.set('5em-library', encounters);

      // Clear and reinitialize
      library.encounters.splice(0, library.encounters.length);
      await library.initialize();

      expect(library.encounters).toHaveLength(2);
      expect(library.encounters[0].name).toBe('Encounter 1');
      expect(library.encounters[1].name).toBe('Encounter 2');
    });

    it('should handle empty localStorage', async () => {
      await library.initialize();
      expect(library.encounters).toHaveLength(0);
    });

    it('should handle invalid data in localStorage', async () => {
      localStorage.setItem('5em-library', 'invalid json');

      // Should not throw
      await expect(library.initialize()).rejects.toThrow();
    });
  });

  describe('integration', () => {
    it('should handle full workflow', async () => {
      // Store multiple encounters
      const enc1: SavedEncounter = { name: 'Fight 1', groups: {} };
      const enc2: SavedEncounter = { name: 'Fight 2', groups: {} };
      const enc3: SavedEncounter = { name: 'Fight 3', groups: {} };

      library.store(enc1);
      library.store(enc2);
      library.store(enc3);

      expect(library.encounters).toHaveLength(3);

      // Remove middle encounter
      library.remove(enc2);
      expect(library.encounters).toHaveLength(2);
      expect(library.encounters[0].name).toBe('Fight 1');
      expect(library.encounters[1].name).toBe('Fight 3');

      // Reload from storage
      library.encounters.splice(0, library.encounters.length);
      await library.initialize();

      expect(library.encounters).toHaveLength(2);
      expect(library.encounters[0].name).toBe('Fight 1');
      expect(library.encounters[1].name).toBe('Fight 3');
    });
  });
});
