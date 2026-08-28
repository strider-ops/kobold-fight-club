/**
 * Players Service
 *
 * Manages player/party data with text-based input parsing.
 * Parses player stats from formatted text and persists to localStorage.
 */

import { reactive, computed } from 'vue';
import { store } from './store';

const STORAGE_KEY = '5em-players';

export interface Player {
  name: string;
  initiativeMod: number;
  advantageOnInitiative: boolean;
  damage: number;
  hp: number;
}

export type Party = Player[];

interface PlayersState {
  selectedParty: Party | null;
  rawText: string;
  parties: Party[];
  rawDirty: boolean;
  partiesDirty: boolean;
}

const state = reactive<PlayersState>({
  selectedParty: null,
  rawText: '',
  parties: [],
  rawDirty: true,
  partiesDirty: false,
});

export interface PlayersService {
  selectedParty: Party | null;
  raw: string;
  parties: Party[];
  selectParty(party: Party): void;
  setDamage(name: string, damage: number): void;
  initialize(): Promise<void>;
}

class Players implements PlayersService {
  get selectedParty(): Party | null {
    return state.selectedParty;
  }

  /**
   * Get/set raw text representation of parties
   */
  get raw(): string {
    if (state.rawDirty) {
      this.compileRaw();
    }
    return state.rawText;
  }

  set raw(value: string) {
    state.rawText = value;
    state.partiesDirty = true;
  }

  /**
   * Get parsed parties
   */
  get parties(): Party[] {
    if (state.partiesDirty) {
      this.compileParties();
    }
    return state.parties;
  }

  /**
   * Select a party for battle tracking
   */
  selectParty(party: Party): void {
    state.selectedParty = party;
  }

  /**
   * Set damage for a player in the selected party
   */
  setDamage(name: string, damage: number): void {
    if (!state.selectedParty) return;

    for (let i = 0; i < state.selectedParty.length; i++) {
      if (state.selectedParty[i].name === name) {
        state.selectedParty[i].damage = damage;
        state.rawDirty = true;
        this.freeze();
        return;
      }
    }
  }

  /**
   * Initialize the service by loading from storage
   */
  async initialize(): Promise<void> {
    await this.thaw();
  }

  /**
   * Parse raw text into parties
   * Format: Name +InitMod HP or Name +InitMod CurrentHP/MaxHP
   * Example: "Gandalf +5 50" or "Aragorn +3! 35/50"
   * ! indicates advantage on initiative
   */
  private compileParties(): void {
    state.partiesDirty = false;
    const partyTexts = state.rawText.split(/\n\n+/);
    state.parties = [];

    for (let i = 0; i < partyTexts.length; i++) {
      const lines = partyTexts[i].split('\n');
      const party: Party = [];

      for (let j = 0; j < lines.length; j++) {
        // Regex groups:
        // 1: Name
        // 2: Initiative mod (with optional !)
        // 3: Current HP (optional)
        // 4: Max HP
        const match = lines[j].match(/(.*?)\s+([-+]?\d+[!]?)\s+(?:(\d+)\s*\/\s*)?(\d+)\s*$/);

        if (match) {
          const advantageMarker = match[2].endsWith('!');
          const initiativeMod = parseInt(match[2].replace(/!$/, ''), 10);
          const maxHp = parseInt(match[4], 10);
          const currentHp = match[3] ? parseInt(match[3], 10) : maxHp;
          const damage = maxHp - currentHp;

          party.push({
            name: match[1],
            initiativeMod,
            advantageOnInitiative: advantageMarker,
            damage,
            hp: maxHp,
          });
        }
      }

      if (party.length > 0) {
        state.parties.push(party);
      }
    }

    state.rawDirty = true;
    this.freeze();
  }

  /**
   * Compile parties back into raw text
   */
  private compileRaw(): void {
    state.rawDirty = false;
    const partyTexts: string[] = [];

    for (let i = 0; i < state.parties.length; i++) {
      const lines: string[] = [];

      for (let j = 0; j < state.parties[i].length; j++) {
        const player = state.parties[i][j];
        const initModStr =
          (player.initiativeMod >= 0 ? '+' + player.initiativeMod : player.initiativeMod) +
          (player.advantageOnInitiative ? '!' : '');
        const currentHp = player.hp - player.damage;

        lines.push(`${player.name} ${initModStr} ${currentHp} / ${player.hp}`);
      }

      partyTexts.push(lines.join('\n'));
    }

    state.rawText = partyTexts.join('\n\n');
  }

  /**
   * Save parties to localStorage
   */
  private freeze(): void {
    store.set(STORAGE_KEY, state.parties);
  }

  /**
   * Load parties from localStorage
   */
  private async thaw(): Promise<void> {
    const frozen = await store.get<Party[]>(STORAGE_KEY);
    if (frozen && Array.isArray(frozen)) {
      state.parties = frozen;
      state.partiesDirty = false;
      state.rawDirty = true;
    }
  }
}

// Export singleton instance
export const players = new Players();

// Expose to window for AngularJS compatibility (temporary)
if (typeof window !== 'undefined') {
  (window as any).players = players;
}
