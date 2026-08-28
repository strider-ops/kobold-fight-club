/**
 * Party Info Service
 *
 * Manages party composition (levels and player counts).
 * Calculates total party XP thresholds for encounter difficulty.
 */

import { reactive, computed } from 'vue';
import { store } from './store';
import { PLAYER_LEVELS, type PlayerLevelInfo } from './playerLevels';

const STORAGE_KEY = '5em-party-info';
const LEGACY_KEY = '5em-encounter';

export interface PartyLevel {
  level: PlayerLevelInfo;
  playerCount: number;
}

export interface ExpThresholds {
  easy: number;
  medium: number;
  hard: number;
  deadly: number;
  budget: number;
}

interface PartyInfoState {
  partyLevels: PartyLevel[];
}

const state = reactive<PartyInfoState>({
  partyLevels: [
    {
      level: PLAYER_LEVELS[1],
      playerCount: 4,
    },
  ],
});

export interface PartyInfoService {
  partyLevels: PartyLevel[];
  totalPlayerCount: number;
  totalPartyExpLevels: ExpThresholds;
  initialize(): Promise<void>;
  freeze(): void;
}

class PartyInfo implements PartyInfoService {
  get partyLevels(): PartyLevel[] {
    return state.partyLevels;
  }

  set partyLevels(value: PartyLevel[]) {
    state.partyLevels = value;
  }

  /**
   * Get total number of players across all levels
   */
  get totalPlayerCount(): number {
    return state.partyLevels.reduce((sum, pl) => sum + pl.playerCount, 0);
  }

  /**
   * Get combined XP thresholds for the entire party
   */
  get totalPartyExpLevels(): ExpThresholds {
    return state.partyLevels.reduce(
      (accum, partyLevel) => {
        const levelThresholds = this.getExpLevels(partyLevel);

        return {
          easy: accum.easy + levelThresholds.easy,
          medium: accum.medium + levelThresholds.medium,
          hard: accum.hard + levelThresholds.hard,
          deadly: accum.deadly + levelThresholds.deadly,
          budget: accum.budget + levelThresholds.budget,
        };
      },
      { easy: 0, medium: 0, hard: 0, deadly: 0, budget: 0 }
    );
  }

  /**
   * Initialize the service by loading from storage
   */
  async initialize(): Promise<void> {
    await this.thaw();
  }

  /**
   * Save party info to localStorage
   */
  freeze(): void {
    const serialized = state.partyLevels.map((pl) => ({
      level: pl.level.level,
      playerCount: pl.playerCount,
    }));

    store.set(STORAGE_KEY, serialized);
  }

  /**
   * Calculate XP thresholds for a single party level
   */
  private getExpLevels(partyLevel: PartyLevel): ExpThresholds {
    return {
      easy: partyLevel.playerCount * partyLevel.level.easy,
      medium: partyLevel.playerCount * partyLevel.level.medium,
      hard: partyLevel.playerCount * partyLevel.level.hard,
      deadly: partyLevel.playerCount * partyLevel.level.deadly,
      budget: partyLevel.playerCount * partyLevel.level.budget,
    };
  }

  /**
   * Load party info from localStorage
   */
  private async thaw(): Promise<void> {
    // Try modern format first
    if (store.hasKey(STORAGE_KEY)) {
      const frozen = await store.get(STORAGE_KEY);
      this.loadPartyInfoFromStore(frozen);
    } else {
      // Fall back to legacy format
      const frozen = await store.get(LEGACY_KEY);
      this.loadFromEncounterStoreAndConvert(frozen);
    }
  }

  /**
   * Load from modern storage format
   */
  private loadPartyInfoFromStore(frozenDataArray: any): void {
    if (!frozenDataArray || !Array.isArray(frozenDataArray)) {
      return;
    }

    const loaded: PartyLevel[] = [];

    for (const frozenData of frozenDataArray) {
      const level = PLAYER_LEVELS[frozenData?.level];

      // Skip invalid level data
      if (!level) {
        continue;
      }

      loaded.push({
        level,
        playerCount: frozenData.playerCount,
      });
    }

    // Only update if we loaded valid data
    if (loaded.length > 0) {
      state.partyLevels = loaded;
    }
  }

  /**
   * Migrate from legacy encounter storage format
   */
  private loadFromEncounterStoreAndConvert(frozenData: any): void {
    // Only migrate if the old format has partyLevel
    if (!frozenData || frozenData.partyLevel === undefined) {
      return;
    }

    const level = PLAYER_LEVELS[frozenData.partyLevel];
    if (!level) {
      return;
    }

    state.partyLevels = [
      {
        level,
        playerCount: frozenData.playerCount,
      },
    ];

    // Save in new format
    this.freeze();

    // Clean up old format if new format exists
    if (store.hasKey('5em-current-encounter')) {
      store.remove(LEGACY_KEY);
    }
  }
}

// Export singleton instance
export const partyInfo = new PartyInfo();

// Auto-initialize (only in browser environment)
if (typeof window !== 'undefined' && typeof process === 'undefined') {
  partyInfo.initialize();
}
