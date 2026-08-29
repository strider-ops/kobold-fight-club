/**
 * Encounter management composable for Vue
 *
 * Provides reactive access to the encounter service for Vue components.
 * Migrated from window.encounterService bridge to direct TypeScript service import.
 */

import { computed, type ComputedRef, type WritableComputedRef } from 'vue';
import { encounter } from '@/services/encounter';
import type { EncounterGroups } from '@/types';

export interface UseEncounterReturn {
  groups: ComputedRef<EncounterGroups>;
  quantity: ComputedRef<number>;
  totalExp: ComputedRef<number>;
  adjustedExp: ComputedRef<number>;
  difficulty: ComputedRef<string>;
  reference: WritableComputedRef<any | null>;
  type: ComputedRef<string>;
  placeholder: ComputedRef<string>;
  threat: ComputedRef<any>;
  resetEncounter: (storedEncounter?: any) => void;
  add: (monster: any, qty?: number) => void;
  remove: (monster: any, removeAll?: boolean) => void;
  generateRandom: (filters: any, targetDifficulty?: string, maxMonsters?: number) => void;
  randomize: (monster: any, filters: any) => void;
}

export function useEncounter(): UseEncounterReturn {
  // Direct access to TypeScript encounter service (no more window.encounterService!)
  const groups = computed(() => encounter.groups);

  const quantity = computed(() => encounter.qty);

  const totalExp = computed(() => encounter.exp);

  const adjustedExp = computed(() => encounter.adjustedExp);

  const difficulty = computed(() => encounter.difficulty);

  const reference = computed({
    get() {
      return encounter.reference;
    },
    set(value: any | null) {
      encounter.reference = value;
    }
  });

  // Create placeholder text from current groups
  const placeholder = computed(() => {
    const parts: string[] = [];
    Object.values(encounter.groups).forEach(group => {
      if (group.monster) {
        const prefix = group.qty > 1 ? `${group.qty}x` : '';
        parts.push(`${prefix}${group.monster.name}`.trim());
      }
    });
    return parts.join(', ');
  });

  // Reset encounter with a stored encounter
  function resetEncounter(storedEncounter?: any): void {
    encounter.reset(storedEncounter);
  }

  // Add monster to encounter
  function add(monster: any, qty: number = 1): void {
    encounter.add(monster, qty);
  }

  // Remove monster from encounter
  function remove(monster: any, removeAll: boolean = false): void {
    encounter.remove(monster, removeAll);
  }

  // Generate a random encounter
  function generateRandom(filters: any, targetDifficulty: string = 'medium', maxMonsters?: number): void {
    encounter.generateRandom(filters, targetDifficulty, maxMonsters);
  }

  // Randomize a specific monster in the encounter
  function randomize(monster: any, filters: any): void {
    encounter.randomize(monster, filters);
  }

  // Type of the currently loaded encounter ('encounter' or 'pool')
  const type = computed(() => encounter.reference?.type || 'encounter');

  // Get threat levels for party
  const threat = computed(() => encounter.threat);

  return {
    groups,
    quantity,
    totalExp,
    adjustedExp,
    difficulty,
    reference,
    type,
    placeholder,
    threat,
    resetEncounter,
    add,
    remove,
    generateRandom,
    randomize,
  };
}
