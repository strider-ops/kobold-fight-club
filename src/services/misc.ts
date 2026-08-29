/**
 * Misc Service
 *
 * Static data and utility functions for D&D 5e encounter building.
 * Contains XP multiplier calculations, source filters, and metadata.
 */

import type { SourceFilters } from '@/types';

export interface MiscService {
  getMultiplier(playerCount: number, monsterCount: number): number;
  sourceFilters: SourceFilters;
  sources: string[];
  sourcesByType: Record<string, string[]>;
  shortNames: Record<string, string>;
  tags: Record<string, any>;
}

class Misc implements MiscService {
  sourceFilters: SourceFilters = {};
  sources: string[] = [];
  sourcesByType: Record<string, string[]> = {};
  shortNames: Record<string, string> = {};
  tags: Record<string, any> = {};

  /**
   * Calculate XP multiplier based on party size and monster count.
   * From D&D 5e DMG p. 82 (Encounter Multipliers table).
   *
   * @param playerCount Number of players in the party
   * @param monsterCount Number of monsters in the encounter
   * @returns XP multiplier
   */
  getMultiplier(playerCount: number, monsterCount: number): number {
    const multipliers = [
      0.5,  // 0: shouldn't happen
      1,    // 1: single monster
      1.5,  // 2: pair of monsters
      2,    // 3-6: group of monsters
      2.5,  // 7-10: large group
      3,    // 11-14: very large group
      4,    // 15+: horde
      5,    // (unused, but matches original array)
    ];

    let multiplierCategory: number;

    if (monsterCount === 0) {
      return 0;
    } else if (monsterCount === 1) {
      multiplierCategory = 1;
    } else if (monsterCount === 2) {
      multiplierCategory = 2;
    } else if (monsterCount < 7) {
      multiplierCategory = 3;
    } else if (monsterCount < 11) {
      multiplierCategory = 4;
    } else if (monsterCount < 15) {
      multiplierCategory = 5;
    } else {
      multiplierCategory = 6;
    }

    // Adjust for party size (DMG p. 83)
    if (playerCount < 3) {
      // Increase multiplier for small parties (1-2 players)
      multiplierCategory++;
    } else if (playerCount > 5) {
      // Decrease multiplier for large parties (6+ players)
      multiplierCategory--;
    }

    return multipliers[multiplierCategory];
  }
}

// Export singleton instance
export const misc = new Misc();
