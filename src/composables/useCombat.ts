/**
 * Combat service composable for Vue
 *
 * Provides reactive access to battle tracker functionality.
 * Migrated from window.combatService bridge to direct TypeScript service import.
 */

import { computed, type ComputedRef, type WritableComputedRef } from 'vue';
import { combat } from '@/services/combat';
import type { Combatant } from '@/types';

export interface UseCombatReturn {
  combatants: ComputedRef<Combatant[]>;
  delta: WritableComputedRef<number>;
  begin: () => void;
  nextTurn: () => void;
  rollInitiative: (combatant: Combatant) => void;
  applyDelta: (combatant: Combatant, multiplier?: number) => void;
  reset: () => void;
}

export function useCombat(): UseCombatReturn {
  // Direct access to TypeScript combat service
  const combatants = computed(() => combat.combatants);

  const delta = computed({
    get() {
      return combat.delta;
    },
    set(value: number) {
      combat.delta = value;
    }
  });

  function begin(): void {
    combat.begin();
  }

  function nextTurn(): void {
    combat.nextTurn();
  }

  function rollInitiative(combatant: Combatant): void {
    combat.rollInitiative(combatant);
  }

  function applyDelta(combatant: Combatant, multiplier: number = 1): void {
    combat.applyDelta(combatant, multiplier);
  }

  function reset(): void {
    combat.reset();
  }

  return {
    combatants,
    delta,
    begin,
    nextTurn,
    rollInitiative,
    applyDelta,
    reset,
  };
}
