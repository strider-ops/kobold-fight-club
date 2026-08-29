// Random Encounter Service - Generates random encounters based on target difficulty
// Uses encounter templates and monster selection algorithms

import type { Monster, MonsterGroup, SearchFilters } from '@/types';
import { shuffle } from './shuffle';

interface EncounterTemplate {
  total: number;
  groups: number[];
}

interface RandomEncounterOptions {
  playerCount: number;
  targetTotalExp: number;
  filters: Partial<SearchFilters>;
  maxMonsters?: number;
}

/**
 * Random Encounter Service
 *
 * Generates random encounters by:
 * 1. Selecting an encounter template (e.g., [1, 2, 3] = 1 monster, 2 monsters, 3 monsters)
 * 2. Calculating XP budget per group
 * 3. Finding monsters that match the XP target and filters
 */
class RandomEncounterService {
  // Dependencies (to be injected)
  private monsterFactory: any;
  private misc: any;
  private metaInfo: any;
  private monsters: any;

  constructor() {}

  /**
   * Set dependencies (to be called during initialization)
   */
  setDependencies(deps: {
    monsterFactory: any;
    misc: any;
    metaInfo: any;
    monsters: any;
  }): void {
    this.monsterFactory = deps.monsterFactory;
    this.misc = deps.misc;
    this.metaInfo = deps.metaInfo;
    this.monsters = deps.monsters;
  }

  /**
   * Generate a random encounter
   *
   * @param playerCount - Number of players in the party
   * @param targetTotalExp - Target XP value (already adjusted for difficulty)
   * @param filters - Filters to apply when selecting monsters
   * @param maxMonsters - Maximum number of monsters in encounter (optional)
   * @returns Array of monster groups
   */
  getRandomEncounter(
    playerCount: number,
    targetTotalExp: number,
    filters: Partial<SearchFilters>,
    maxMonsters?: number
  ): MonsterGroup[] {
    const fudgeFactor = 1.1; // Algorithm is conservative, this gets closer to actual value
    const baseExpBudget = targetTotalExp * fudgeFactor;
    const encounterTemplate = this.getEncounterTemplate(maxMonsters);
    const multiplier = this.misc.getMultiplier(playerCount, encounterTemplate.total);
    let availableExp = baseExpBudget / multiplier;

    const monsterGroups: MonsterGroup[] = [];

    while (encounterTemplate.groups.length > 0) {
      // XP should be shared equally between groups
      let targetExp = availableExp / encounterTemplate.groups.length;
      const currentGroup = encounterTemplate.groups.shift()!;

      // Find monster who, in the correct number, is close to target exp
      targetExp /= currentGroup;

      const monster = this.getBestMonster(targetExp, filters);

      monsterGroups.push({
        monster,
        qty: currentGroup,
      });

      // Subtract actual exp value
      availableExp -= currentGroup * monster.cr.exp;
    }

    return monsterGroups;
  }

  /**
   * Get shuffled list of monsters at a specific CR
   */
  getShuffledMonsterList(crString: string): Monster[] {
    const list = this.monsters.byCr[crString]?.slice(0) || [];
    return shuffle(list);
  }

  /**
   * Get random encounter template
   * Templates define groups of monsters (e.g., [1, 2] = 1 group of 1, 1 group of 2)
   */
  private getEncounterTemplate(maxMonsters?: number): EncounterTemplate {
    let templates = [
      [1],
      [1, 1],
      [1, 2],
      [1, 5],
      [1, 1, 1],
      [1, 1, 2],
      [1, 2, 3],
      [2, 2],
      [2, 4],
      [8],
    ];

    if (maxMonsters) {
      templates = templates.filter((t) => {
        const sum = t.reduce((a, b) => a + b, 0);
        return sum <= maxMonsters;
      });
    }

    // Select random template
    const selectedTemplate = templates[Math.floor(Math.random() * templates.length)];

    // Clone the template
    const groups = JSON.parse(JSON.stringify(selectedTemplate)) as number[];
    const total = groups.reduce((a, b) => a + b, 0);

    return {
      total,
      groups,
    };
  }

  /**
   * Find best monster for target XP value
   * Searches by CR, falling back to nearby CRs if no valid monsters found
   */
  private getBestMonster(targetExp: number, filters: Partial<SearchFilters>): Monster {
    let bestBelow = 0;
    let bestAbove: number | undefined;

    // Find CRs closest to target
    for (let i = 1; i < this.metaInfo.crList.length; i++) {
      if (this.metaInfo.crList[i].exp < targetExp) {
        bestBelow = i;
      } else {
        bestAbove = i;
        break;
      }
    }

    // If no CR above target, use highest CR
    if (bestAbove === undefined) {
      bestAbove = this.metaInfo.crList.length - 1;
    }

    // Choose CR closest to target
    let crIndex: number;
    const belowDiff = targetExp - this.metaInfo.crList[bestBelow].exp;
    const aboveDiff = this.metaInfo.crList[bestAbove].exp - targetExp;

    if (belowDiff < aboveDiff) {
      crIndex = bestBelow;
    } else {
      crIndex = bestAbove;
    }

    let currentIndex = crIndex;
    let step = -1; // Start by looking at lower CRs

    let monsterList = this.getShuffledMonsterList(this.metaInfo.crList[crIndex].string);

    // Find a monster that passes filters
    while (true) {
      // Check if current monster passes filters
      if (monsterList.length > 0) {
        const candidate = monsterList[0];

        // Create modified filters for random encounter (skip unique monsters)
        const randomFilters: Partial<SearchFilters> = {
          ...filters,
          unique: false, // Don't include unique monsters
        };

        if (this.monsterFactory.checkMonster(candidate, randomFilters)) {
          return candidate;
        } else {
          monsterList.shift(); // Remove failed candidate
        }
      }

      // If we exhausted all monsters at this CR, try different CR
      if (monsterList.length === 0) {
        // If we're at CR 0 and searching down, switch to searching up
        if (currentIndex === 0) {
          currentIndex = crIndex;
          step = 1;
        }

        currentIndex += step;

        // Wrap around if we go out of bounds
        if (currentIndex < 0) {
          currentIndex = this.metaInfo.crList.length - 1;
        } else if (currentIndex >= this.metaInfo.crList.length) {
          currentIndex = 0;
        }

        monsterList = this.getShuffledMonsterList(this.metaInfo.crList[currentIndex].string);
      }
    }
  }
}

// Export singleton instance
export const randomEncounter = new RandomEncounterService();
