/**
 * Players service composable for Vue
 *
 * Provides reactive access to the players service.
 * Migrated from window.playersService bridge to direct TypeScript service import.
 */

import { computed, type ComputedRef, type WritableComputedRef } from 'vue';
import { players, type Party } from '@/services/players';

export interface UsePlayersReturn {
  parties: ComputedRef<Party[]>;
  selectedParty: ComputedRef<Party | null>;
  raw: WritableComputedRef<string>;
  selectParty: (party: Party) => void;
  setDamage: (name: string, damage: number) => void;
}

export function usePlayers(): UsePlayersReturn {
  // Direct access to TypeScript players service
  const parties = computed(() => players.parties);

  const selectedParty = computed(() => players.selectedParty);

  const raw = computed({
    get() {
      return players.raw;
    },
    set(value: string) {
      players.raw = value;
    }
  });

  function selectParty(party: Party): void {
    players.selectParty(party);
  }

  function setDamage(name: string, damage: number): void {
    players.setDamage(name, damage);
  }

  return {
    parties,
    selectedParty,
    raw,
    selectParty,
    setDamage,
  };
}
