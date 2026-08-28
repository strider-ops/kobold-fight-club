/**
 * Encounter Service
 *
 * Manages the current encounter state - monster groups, difficulty calculations,
 * and persistence to localStorage.
 */

import { reactive, computed } from 'vue';
import type { Monster, EncounterGroups, MonsterGroup, SearchFilters } from '@/types';
import { store } from './store';
import { monsters } from './monsters';
import { misc } from './misc';
import { partyInfo } from './partyInfo';
import { monsterFactory } from './monsterFactory';

// ============================================================================
// Types
// ============================================================================

interface StoredEncounter {
  groups: Record<string, number>; // Monster ID => quantity
  type?: string;
}

interface ThreatLevels {
  deadly: number;
  hard: number;
  medium: number;
  easy: number;
  pair: number;
  group: number;
  trivial: number;
}

// ============================================================================
// State
// ============================================================================

interface EncounterState {
  groups: EncounterGroups;
  reference: any | null;
}

const state = reactive<EncounterState>({
  groups: {},
  reference: null,
});

// ============================================================================
// Encounter Service
// ============================================================================

class EncounterService {
  /**
   * Monster groups in current encounter
   */
  get groups(): EncounterGroups {
    return state.groups;
  }

  /**
   * Reference to the saved encounter (if loaded from library)
   */
  get reference(): any | null {
    return state.reference;
  }

  set reference(value: any | null) {
    state.reference = value;
  }

  /**
   * Total XP for the encounter (before multiplier)
   */
  get exp(): number {
    if (Object.keys(state.groups).length === 0) {
      return 0;
    }

    return Object.values(state.groups).reduce((total, group) => {
      return total + group.monster.cr.exp * group.qty;
    }, 0);
  }

  /**
   * Total number of monsters in encounter
   */
  get qty(): number {
    return Object.values(state.groups).reduce((total, group) => {
      return total + group.qty;
    }, 0);
  }

  /**
   * XP adjusted by party size and monster count multiplier
   */
  get adjustedExp(): number {
    const qty = this.qty;
    const exp = this.exp;
    const multiplier = misc.getMultiplier(partyInfo.totalPlayerCount, qty);

    if (typeof exp !== 'number') {
      return 0;
    }

    return Math.floor(exp * multiplier);
  }

  /**
   * Encounter difficulty level based on adjusted XP and party thresholds
   */
  get difficulty(): string {
    const exp = this.adjustedExp;
    const levels = partyInfo.totalPartyExpLevels;

    if (exp === 0) {
      return '';
    }

    if (exp < levels.easy) {
      return '';
    } else if (exp < levels.medium) {
      return 'Easy';
    } else if (exp < levels.hard) {
      return 'Medium';
    } else if (exp < levels.deadly) {
      return 'Hard';
    } else {
      return 'Deadly';
    }
  }

  /**
   * CR threat levels adjusted for party size
   */
  get threat(): ThreatLevels {
    const count = partyInfo.totalPlayerCount;
    const levels = partyInfo.totalPartyExpLevels;
    const mediumExp = levels.medium;

    let singleMultiplier = 1;
    let pairMultiplier = 1.5;
    let groupMultiplier = 2;
    let trivialMultiplier = 2.5;

    if (count < 3) {
      // For small groups, increase multiplier
      singleMultiplier = 1.5;
      pairMultiplier = 2;
      groupMultiplier = 2.5;
      trivialMultiplier = 3;
    } else if (count > 5) {
      // For large groups, reduce multiplier
      singleMultiplier = 0.5;
      pairMultiplier = 1;
      groupMultiplier = 1.5;
      trivialMultiplier = 2;
    }

    return {
      deadly: levels.deadly / singleMultiplier,
      hard: levels.hard / singleMultiplier,
      medium: mediumExp / singleMultiplier,
      easy: levels.easy / singleMultiplier,
      pair: mediumExp / (2 * pairMultiplier),
      group: mediumExp / (4 * groupMultiplier),
      trivial: mediumExp / (8 * trivialMultiplier),
    };
  }

  /**
   * Initialize encounter service (load from localStorage)
   */
  initialize(): void {
    this.thaw();
  }

  /**
   * Add monster(s) to the encounter
   */
  add(monster: Monster, qty: number = 1): void {
    const id = monster.id;

    if (!state.groups[id]) {
      state.groups[id] = {
        qty: 0,
        monster,
      };
    }

    state.groups[id].qty += qty;
    state.reference = null;
  }

  /**
   * Generate a random encounter
   * Note: Depends on randomEncounter service which will be migrated separately
   */
  generateRandom(filters: Partial<SearchFilters>, targetDifficulty: string = 'medium', maxMonsters?: number): void {
    // This will be implemented once randomEncounter service is migrated
    console.warn('generateRandom not yet implemented in TypeScript service');
  }

  /**
   * Randomize a specific monster in the encounter
   * Note: Depends on randomEncounter service which will be migrated separately
   */
  randomize(monster: Monster, filters: Partial<SearchFilters>): void {
    // This will be implemented once randomEncounter service is migrated
    console.warn('randomize not yet implemented in TypeScript service');
  }

  /**
   * Remove monster(s) from the encounter
   */
  remove(monster: Monster, removeAll: boolean = false): void {
    const id = monster.id;

    if (!state.groups[id]) {
      return;
    }

    state.groups[id].qty--;

    if (state.groups[id].qty === 0) {
      delete state.groups[id];
    } else if (removeAll) {
      // Removing all is implemented by recursively calling this function until the qty is 0
      this.remove(monster, true);
    }

    state.reference = null;
  }

  /**
   * Reset encounter (clear all groups or load from saved encounter)
   */
  reset(storedEncounter?: StoredEncounter): void {
    state.reference = null;
    state.groups = {};

    if (storedEncounter) {
      Object.keys(storedEncounter.groups).forEach((id) => {
        const monster = monsters.byId[id];
        if (monster) {
          this.add(monster, storedEncounter.groups[id]);
        }
      });

      state.reference = storedEncounter;
    }
  }

  /**
   * Save encounter to localStorage
   */
  freeze(): void {
    const frozen: StoredEncounter = {
      groups: {},
    };

    Object.keys(state.groups).forEach((monsterId) => {
      frozen.groups[monsterId] = state.groups[monsterId].qty;
    });

    store.set('5em-encounter', frozen);
  }

  /**
   * Load encounter from localStorage
   */
  async thaw(): Promise<void> {
    this.reset();

    const frozen = await store.get<StoredEncounter>('5em-encounter');

    if (!frozen) {
      return;
    }

    // The original implementation had a comment about restoring but didn't implement it
    // We'll leave it as-is to match the original behavior
  }

  /**
   * Reset service state (for testing only)
   * @private
   */
  _reset(): void {
    state.groups = {};
    state.reference = null;
  }
}

// ============================================================================
// Export
// ============================================================================

export const encounter = new EncounterService();
