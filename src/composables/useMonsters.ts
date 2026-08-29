/**
 * Monsters service composable for Vue
 *
 * Provides reactive access to the monster catalog.
 * Migrated from window.monstersService bridge to direct TypeScript service import.
 */

import { computed, type ComputedRef } from 'vue';
import { monsters } from '@/services/monsters';
import type { Monster } from '@/types';

export interface UseMonstersReturn {
  all: ComputedRef<Monster[]>;
  byId: ComputedRef<Record<string, Monster>>;
  byCr: ComputedRef<Record<string, Monster[]>>;
  getMonsterById: (id: string) => Monster | undefined;
  hasId: (id: string) => boolean;
}

export function useMonsters(): UseMonstersReturn {
  // Direct access to TypeScript monsters service
  const all = computed(() => monsters.all);

  const byId = computed(() => monsters.byId);

  const byCr = computed(() => monsters.byCr);

  // Get monster by ID
  function getMonsterById(id: string): Monster | undefined {
    return monsters.byId[id];
  }

  // Check if monster ID exists
  function hasId(id: string): boolean {
    return monsters.hasId(id);
  }

  return {
    all,
    byId,
    byCr,
    getMonsterById,
    hasId,
  };
}
