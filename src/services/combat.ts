// Combat Service - Battle tracker for D&D 5e encounters
// Manages combatants, initiative order, and turn tracking

import { reactive } from 'vue';
import type { Combatant, CombatState, CombatStatusType, Monster } from '@/types';
import { CombatStatus } from '@/types';
import type { Player } from '@/types';

// State
const state = reactive<CombatState>({
  active: 0,
  combatants: [],
  delta: 0,
});

/**
 * Combat Service
 *
 * Manages battle tracker state including:
 * - Combatant management (players and monsters)
 * - Initiative tracking
 * - Turn order
 * - Damage tracking
 */
class CombatService {
  // Getters
  get active(): number {
    return state.active;
  }

  get combatants(): Combatant[] {
    return state.combatants;
  }

  get delta(): number {
    return state.delta;
  }

  set delta(value: number) {
    state.delta = value;
  }

  /**
   * Add a monster to combat
   * Creates multiple combatants if qty > 1 (numbered copies)
   */
  addMonster(monster: Monster, qty: number = 1): void {
    for (let i = 0; i < qty; i++) {
      const name = qty > 1 ? `${monster.name} ${i + 1}` : monster.name;

      state.combatants.push({
        type: 'enemy',
        name,
        ac: typeof monster.ac === 'number' ? monster.ac : parseInt(String(monster.ac)),
        hp: typeof monster.hp === 'number' ? monster.hp : parseInt(String(monster.hp)),
        initiativeMod: typeof monster.init === 'number' ? monster.init : parseInt(String(monster.init)),
        initiative: 10 + (typeof monster.init === 'number' ? monster.init : parseInt(String(monster.init))),
        id: monster.id,
      });
    }
  }

  /**
   * Add lair action combatant
   * Lair actions always go on initiative count 20
   */
  addLair(): void {
    state.combatants.push({
      type: 'lair',
      name: 'Lair',
      initiativeMod: 0,
      initiative: 20,
      fixedInitiative: true,
      noHp: true,
    });
  }

  /**
   * Add a player to combat
   */
  addPlayer(player: Player): void {
    state.combatants.push({
      type: 'player',
      name: player.name,
      initiativeMod: player.init,
      advantageOnInitiative: (player as any).advantageOnInitiative,
      initiative: (player as any).initiative || player.init + 10,
      hp: player.hp,
      damage: 0,
    });
  }

  /**
   * Apply damage/healing delta to a combatant
   * @param combatant - The combatant to apply delta to
   * @param multiplier - Optional multiplier (e.g., -1 for healing)
   */
  applyDelta(combatant: Combatant, multiplier: number = 1, playersService?: any): void {
    // Make sure damage is initialized
    combatant.damage = combatant.damage || 0;

    combatant.damage += state.delta * multiplier;
    state.delta = 0;

    // Damage can't reduce you below 0
    if (combatant.hp && combatant.damage > combatant.hp) {
      combatant.damage = combatant.hp;
    }

    // Damage can't be negative
    if (combatant.damage < 0) {
      combatant.damage = 0;
    }

    // Persist player damage
    if (combatant.type === 'player' && playersService) {
      playersService.setDamage(combatant.name, combatant.damage);
    }
  }

  /**
   * Begin combat - sort by initiative and activate first combatant
   */
  begin(): void {
    state.combatants.sort((a, b) => b.initiative - a.initiative);

    if (state.combatants.length > 0) {
      state.combatants[state.active].active = true;
    }
  }

  /**
   * Initialize combat from encounter and players
   *
   * @param encounterGroups - Monster groups from encounter service
   * @param monstersById - Monsters lookup from monsters service
   * @param selectedParty - Selected party from players service
   * @returns Status code (READY, NO_MONSTERS, NO_PLAYERS)
   */
  init(
    encounterGroups: Record<string, any>,
    monstersById: Record<string, Monster>,
    selectedParty: any[] | null
  ): CombatStatusType {
    // Clear existing state
    state.combatants.length = 0;
    state.active = 0;
    state.delta = 0;

    const monsterIds = Object.keys(encounterGroups);
    let lair = false;
    let retValue: number = 0;

    // Validate we have monsters and players
    if (!monsterIds.length) {
      retValue |= CombatStatus.NO_MONSTERS;
    }

    if (!selectedParty) {
      retValue |= CombatStatus.NO_PLAYERS;
    }

    if (retValue) {
      return retValue as CombatStatusType;
    }

    // Add players
    if (selectedParty) {
      for (const player of selectedParty) {
        this.addPlayer({
          name: player.name,
          initiativeMod: player.initiativeMod,
          advantageOnInitiative: player.advantageOnInitiative,
          initiative: player.initiativeMod + 10,
          hp: player.hp,
          damage: player.damage,
        } as any);
      }
    }

    // Add monsters
    for (const monsterId of monsterIds) {
      const monster = monstersById[monsterId];
      const qty = encounterGroups[monsterId].qty;
      lair = lair || monster.lair;

      this.addMonster(monster, qty);
    }

    // Add lair action if any monster has it
    if (lair) {
      this.addLair();
    }

    return CombatStatus.READY;
  }

  /**
   * Advance to next turn
   */
  nextTurn(): void {
    state.combatants[state.active].active = false;
    state.active = (state.active + 1) % state.combatants.length;
    state.combatants[state.active].active = true;
  }

  /**
   * Roll initiative for a combatant
   * Uses d20, with advantage if applicable
   */
  rollInitiative(combatant: Combatant): void {
    // Use window._ for lodash (same as AngularJS version)
    const _ = window._;

    let initRoll = _.random(1, 20);

    if (combatant.advantageOnInitiative) {
      const secondRoll = _.random(1, 20);
      if (secondRoll > initRoll) {
        initRoll = secondRoll;
      }
    }

    combatant.initiative = initRoll + (combatant.initiativeMod || 0);
    combatant.initiativeRolled = true;
  }

  /**
   * Reset combat state
   */
  reset(): void {
    state.combatants.length = 0;
    state.active = 0;
    state.delta = 0;
  }
}

// Export singleton instance
export const combat = new CombatService();
