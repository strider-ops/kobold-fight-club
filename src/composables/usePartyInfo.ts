/**
 * Party info composable for Vue
 *
 * Provides reactive access to the partyInfo service for Vue components.
 * Migrated from window.partyInfoService bridge to direct TypeScript service import.
 */

import { computed, type ComputedRef } from 'vue';
import { partyInfo, type PartyLevel, type ExpThresholds } from '@/services/partyInfo';
import { PLAYER_LEVELS } from '@/services/playerLevels';

export interface UsePartyInfoReturn {
  partyLevels: ComputedRef<PartyLevel[]>;
  totalPlayerCount: ComputedRef<number>;
  totalPartyExpLevels: ComputedRef<ExpThresholds>;
  addPartyLevel: () => void;
  removePartyLevel: (index: number) => void;
  setPartyLevel: (index: number, level: number) => void;
  freeze: () => void;
}

export function usePartyInfo(): UsePartyInfoReturn {
  const partyLevels = computed(() => partyInfo.partyLevels);

  const totalPlayerCount = computed(() => partyInfo.totalPlayerCount);

  const totalPartyExpLevels = computed(() => partyInfo.totalPartyExpLevels);

  function addPartyLevel(): void {
    partyInfo.partyLevels = [
      ...partyInfo.partyLevels,
      { level: PLAYER_LEVELS[1], playerCount: 1 },
    ];
    partyInfo.freeze();
  }

  function removePartyLevel(index: number): void {
    const updated = partyInfo.partyLevels.slice();
    updated.splice(index, 1);
    partyInfo.partyLevels = updated;
    partyInfo.freeze();
  }

  function setPartyLevel(index: number, level: number): void {
    const info = PLAYER_LEVELS[level];
    if (!info) {
      return;
    }
    partyInfo.partyLevels[index].level = info;
    partyInfo.freeze();
  }

  function freeze(): void {
    partyInfo.freeze();
  }

  return {
    partyLevels,
    totalPlayerCount,
    totalPartyExpLevels,
    addPartyLevel,
    removePartyLevel,
    setPartyLevel,
    freeze,
  };
}
