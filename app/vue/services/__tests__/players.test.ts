/**
 * Tests for Players Service
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { players } from '../players';
import type { Player, Party } from '../players';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem(key: string) {
      return store[key] || null;
    },
    setItem(key: string, value: string) {
      store[key] = value.toString();
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      store = {};
    },
  };
})();

global.localStorage = localStorageMock as any;

describe('Players Service', () => {
  beforeEach(async () => {
    localStorage.clear();
    players.raw = '';
    await players.initialize();
  });

  describe('raw text parsing', () => {
    it('should parse simple player format', () => {
      players.raw = 'Gandalf +5 50';

      expect(players.parties).toHaveLength(1);
      expect(players.parties[0]).toHaveLength(1);

      const player = players.parties[0][0];
      expect(player.name).toBe('Gandalf');
      expect(player.initiativeMod).toBe(5);
      expect(player.hp).toBe(50);
      expect(player.damage).toBe(0);
      expect(player.advantageOnInitiative).toBe(false);
    });

    it('should parse player with advantage on initiative', () => {
      players.raw = 'Aragorn +3! 60';

      const player = players.parties[0][0];
      expect(player.name).toBe('Aragorn');
      expect(player.initiativeMod).toBe(3);
      expect(player.advantageOnInitiative).toBe(true);
    });

    it('should parse player with current/max HP', () => {
      players.raw = 'Frodo +2 25/50';

      const player = players.parties[0][0];
      expect(player.name).toBe('Frodo');
      expect(player.hp).toBe(50);
      expect(player.damage).toBe(25); // 50 - 25 = 25 damage
    });

    it('should parse negative initiative modifier', () => {
      players.raw = 'Samwise -1 40';

      const player = players.parties[0][0];
      expect(player.initiativeMod).toBe(-1);
    });

    it('should parse multiple players in one party', () => {
      players.raw = `Gandalf +5 50
Aragorn +3 60
Legolas +4 45`;

      expect(players.parties).toHaveLength(1);
      expect(players.parties[0]).toHaveLength(3);
      expect(players.parties[0][0].name).toBe('Gandalf');
      expect(players.parties[0][1].name).toBe('Aragorn');
      expect(players.parties[0][2].name).toBe('Legolas');
    });

    it('should parse multiple parties separated by double newlines', () => {
      players.raw = `Gandalf +5 50
Aragorn +3 60

Frodo +2 30
Samwise -1 40`;

      expect(players.parties).toHaveLength(2);
      expect(players.parties[0]).toHaveLength(2);
      expect(players.parties[1]).toHaveLength(2);
    });

    it('should ignore invalid lines', () => {
      players.raw = `Gandalf +5 50
Invalid Line
Aragorn +3 60`;

      expect(players.parties[0]).toHaveLength(2);
      expect(players.parties[0][0].name).toBe('Gandalf');
      expect(players.parties[0][1].name).toBe('Aragorn');
    });
  });

  describe('raw text compilation', () => {
    it('should compile parties back to raw text', () => {
      players.raw = 'Gandalf +5 50';

      const raw = players.raw;
      expect(raw).toContain('Gandalf +5 50 / 50');
    });

    it('should show current HP with damage', () => {
      players.raw = 'Gandalf +5 50';
      const party = players.parties[0];
      players.selectParty(party);
      players.setDamage('Gandalf', 10);

      const raw = players.raw;
      expect(raw).toContain('40 / 50'); // 50 - 10 = 40
    });

    it('should preserve advantage marker', () => {
      players.raw = 'Aragorn +3! 60';

      const raw = players.raw;
      expect(raw).toContain('+3!');
    });

    it('should handle negative initiative in output', () => {
      players.raw = 'Samwise -1 40';

      const raw = players.raw;
      expect(raw).toContain('-1');
    });
  });

  describe('selectParty', () => {
    it('should select a party', () => {
      players.raw = `Gandalf +5 50
Aragorn +3 60`;

      const party = players.parties[0];
      players.selectParty(party);

      expect(players.selectedParty).toBe(party);
    });
  });

  describe('setDamage', () => {
    it('should set damage for a player', () => {
      players.raw = 'Gandalf +5 50';
      const party = players.parties[0];
      players.selectParty(party);

      players.setDamage('Gandalf', 15);

      expect(party[0].damage).toBe(15);
    });

    it('should update localStorage when setting damage', async () => {
      players.raw = 'Gandalf +5 50';
      const party = players.parties[0];
      players.selectParty(party);

      players.setDamage('Gandalf', 20);

      // Should have persisted
      const stored = localStorage.getItem('5em-players');
      expect(stored).toBeTruthy();
    });

    it('should handle setting damage for non-existent player', () => {
      players.raw = 'Gandalf +5 50';
      const party = players.parties[0];
      players.selectParty(party);

      expect(() => players.setDamage('Unknown', 10)).not.toThrow();
    });

    it('should do nothing if no party selected', () => {
      expect(() => players.setDamage('Anyone', 10)).not.toThrow();
    });
  });

  describe('persistence', () => {
    it('should persist parties to localStorage', async () => {
      players.raw = 'Gandalf +5 50';
      // Access parties to trigger compilation and freezing
      const parties = players.parties;

      const stored = localStorage.getItem('5em-players');
      expect(stored).toBeTruthy();
    });

    it('should load parties from localStorage', async () => {
      players.raw = `Gandalf +5 50
Aragorn +3 60`;
      // Trigger compilation
      const parties = players.parties;

      // Clear the current state
      players.raw = '';
      // Reload from localStorage
      await players.initialize();

      // Should have restored the parties
      expect(players.parties.length).toBeGreaterThan(0);
    });
  });

  describe('integration', () => {
    it('should handle full workflow', async () => {
      // Create a party
      players.raw = `Gandalf +5 50
Aragorn +3 60
Legolas +4 45`;

      expect(players.parties).toHaveLength(1);
      expect(players.parties[0]).toHaveLength(3);

      // Select party and apply damage
      const party = players.parties[0];
      players.selectParty(party);
      players.setDamage('Aragorn', 15);

      // Check compiled raw text reflects damage
      const raw = players.raw;
      expect(raw).toContain('Aragorn +3 45 / 60'); // 60 - 15 = 45

      // Reload from storage
      await players.initialize();
      expect(players.parties[0][1].damage).toBe(15);
    });
  });
});
