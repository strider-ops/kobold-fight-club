/**
 * Integration Service - Export encounters to external tools
 *
 * Currently supports:
 * - Improved Initiative (improved-initiative.com)
 */

import type { EncounterGroups } from '@/types';

// Improved Initiative API types
interface ImprovedInitCombatant {
  Name: string;
  HP?: { Value: number | string };
  TotalInitiativeModifier?: number | string;
  AC?: { Value: number | string };
  Player: 'player' | 'npc';
  Id?: string;
}

interface ImprovedInitPayload {
  Combatants: ImprovedInitCombatant[];
}

// Configuration
const IMPROVED_INIT_URL = 'https://www.improved-initiative.com/launchencounter/';

/**
 * Integration Service
 */
class IntegrationService {
  /**
   * Launch Improved Initiative with current encounter
   * Opens in new window/tab with POST data
   */
  launchImpInit(encounterGroups: EncounterGroups, selectedParty: any[]): void {
    const payload = this.generatePayload(encounterGroups, selectedParty);

    console.log('Launching Improved Initiative with payload:', payload);

    this.openWindow(IMPROVED_INIT_URL, { Combatants: payload });
  }

  /**
   * Generate Improved Initiative payload from encounter and players
   */
  private generatePayload(
    encounterGroups: EncounterGroups,
    selectedParty: any[]
  ): ImprovedInitCombatant[] {
    const combatants: ImprovedInitCombatant[] = [];

    // Add monsters
    Object.keys(encounterGroups).forEach((monsterId) => {
      const monsterGroup = encounterGroups[monsterId];
      const monster = monsterGroup.monster;
      const qty = monsterGroup.qty;

      for (let i = 1; i <= qty; i++) {
        combatants.push({
          Name: monster.name,
          HP: { Value: monster.hp },
          TotalInitiativeModifier: monster.init,
          AC: { Value: monster.ac },
          Player: 'npc',
          Id: monster.fid || monster.guid,
        });
      }
    });

    // Add players
    selectedParty.forEach((player) => {
      combatants.push({
        Name: player.name,
        TotalInitiativeModifier: player.initiativeMod,
        HP: { Value: player.hp },
        Player: 'player',
      });
    });

    return combatants;
  }

  /**
   * Open external window via POST form submission
   * Creates a hidden form, submits it, then removes it
   */
  private openWindow(targetUrl: string, data: ImprovedInitPayload): void {
    const form = document.createElement('form');
    form.style.display = 'none';
    form.setAttribute('method', 'POST');
    form.setAttribute('action', targetUrl);

    Object.keys(data).forEach((key) => {
      const input = document.createElement('input');
      input.setAttribute('type', 'hidden');
      input.setAttribute('name', key);
      input.setAttribute('value', JSON.stringify((data as any)[key]));

      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    form.parentNode?.removeChild(form);
  }
}

// Export singleton instance
export const integration = new IntegrationService();
