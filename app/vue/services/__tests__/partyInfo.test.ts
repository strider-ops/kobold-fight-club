/**
 * Tests for Party Info Service
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { partyInfo } from '../partyInfo';
import { PLAYER_LEVELS } from '../playerLevels';
import type { PartyLevel } from '../partyInfo';

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

describe('Party Info Service', () => {
  beforeEach(async () => {
    localStorage.clear();
    // Reset to defaults
    partyInfo.partyLevels = [
      {
        level: PLAYER_LEVELS[1],
        playerCount: 4,
      },
    ];
    await partyInfo.initialize();
  });

  describe('totalPlayerCount', () => {
    it('should calculate total player count for single level', () => {
      partyInfo.partyLevels = [
        {
          level: PLAYER_LEVELS[5],
          playerCount: 4,
        },
      ];

      expect(partyInfo.totalPlayerCount).toBe(4);
    });

    it('should calculate total player count for multiple levels', () => {
      partyInfo.partyLevels = [
        {
          level: PLAYER_LEVELS[3],
          playerCount: 2,
        },
        {
          level: PLAYER_LEVELS[5],
          playerCount: 3,
        },
      ];

      expect(partyInfo.totalPlayerCount).toBe(5);
    });

    it('should return 0 for empty party', () => {
      partyInfo.partyLevels = [];
      expect(partyInfo.totalPlayerCount).toBe(0);
    });
  });

  describe('totalPartyExpLevels', () => {
    it('should calculate XP thresholds for single level party', () => {
      partyInfo.partyLevels = [
        {
          level: PLAYER_LEVELS[1],
          playerCount: 4,
        },
      ];

      const thresholds = partyInfo.totalPartyExpLevels;
      // Level 1: easy=25, medium=50, hard=75, deadly=100, budget=300
      // 4 players: easy=100, medium=200, hard=300, deadly=400, budget=1200
      expect(thresholds.easy).toBe(100);
      expect(thresholds.medium).toBe(200);
      expect(thresholds.hard).toBe(300);
      expect(thresholds.deadly).toBe(400);
      expect(thresholds.budget).toBe(1200);
    });

    it('should calculate XP thresholds for higher level party', () => {
      partyInfo.partyLevels = [
        {
          level: PLAYER_LEVELS[5],
          playerCount: 4,
        },
      ];

      const thresholds = partyInfo.totalPartyExpLevels;
      // Level 5: easy=250, medium=500, hard=750, deadly=1100, budget=3500
      // 4 players: easy=1000, medium=2000, hard=3000, deadly=4400, budget=14000
      expect(thresholds.easy).toBe(1000);
      expect(thresholds.medium).toBe(2000);
      expect(thresholds.hard).toBe(3000);
      expect(thresholds.deadly).toBe(4400);
      expect(thresholds.budget).toBe(14000);
    });

    it('should calculate XP thresholds for multi-level party', () => {
      partyInfo.partyLevels = [
        {
          level: PLAYER_LEVELS[3],
          playerCount: 2,
        },
        {
          level: PLAYER_LEVELS[5],
          playerCount: 2,
        },
      ];

      const thresholds = partyInfo.totalPartyExpLevels;
      // Level 3: easy=75, medium=150, hard=225, deadly=400
      // Level 5: easy=250, medium=500, hard=750, deadly=1100
      // 2 players each:
      // Level 3: easy=150, medium=300, hard=450, deadly=800
      // Level 5: easy=500, medium=1000, hard=1500, deadly=2200
      // Total: easy=650, medium=1300, hard=1950, deadly=3000
      expect(thresholds.easy).toBe(650);
      expect(thresholds.medium).toBe(1300);
      expect(thresholds.hard).toBe(1950);
      expect(thresholds.deadly).toBe(3000);
    });

    it('should return zero thresholds for empty party', () => {
      partyInfo.partyLevels = [];

      const thresholds = partyInfo.totalPartyExpLevels;
      expect(thresholds.easy).toBe(0);
      expect(thresholds.medium).toBe(0);
      expect(thresholds.hard).toBe(0);
      expect(thresholds.deadly).toBe(0);
      expect(thresholds.budget).toBe(0);
    });
  });

  describe('freeze / thaw', () => {
    it('should persist party levels to localStorage', () => {
      partyInfo.partyLevels = [
        {
          level: PLAYER_LEVELS[10],
          playerCount: 6,
        },
      ];

      partyInfo.freeze();

      const stored = localStorage.getItem('5em-party-info');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].level).toBe(10);
      expect(parsed[0].playerCount).toBe(6);
    });

    it('should load party levels from localStorage', async () => {
      const data = [
        { level: 7, playerCount: 5 },
        { level: 8, playerCount: 1 },
      ];

      localStorage.setItem('5em-party-info', JSON.stringify(data));

      await partyInfo.initialize();

      expect(partyInfo.partyLevels).toHaveLength(2);
      expect(partyInfo.partyLevels[0].level.level).toBe(7);
      expect(partyInfo.partyLevels[0].playerCount).toBe(5);
      expect(partyInfo.partyLevels[1].level.level).toBe(8);
      expect(partyInfo.partyLevels[1].playerCount).toBe(1);
    });

    it('should skip invalid level data', async () => {
      const data = [
        { level: 5, playerCount: 4 },
        { level: 999, playerCount: 2 }, // Invalid level
        { level: 10, playerCount: 3 },
      ];

      localStorage.setItem('5em-party-info', JSON.stringify(data));

      await partyInfo.initialize();

      // Should only load valid levels (5 and 10)
      expect(partyInfo.partyLevels).toHaveLength(2);
      expect(partyInfo.partyLevels[0].level.level).toBe(5);
      expect(partyInfo.partyLevels[1].level.level).toBe(10);
    });

    it('should preserve defaults when storage is empty', async () => {
      const original = partyInfo.partyLevels;

      await partyInfo.initialize();

      expect(partyInfo.partyLevels).toEqual(original);
    });
  });

  describe('legacy format migration', () => {
    it('should migrate from old 5em-encounter format', async () => {
      const legacyData = {
        partyLevel: 5,
        playerCount: 4,
      };

      localStorage.setItem('5em-encounter', JSON.stringify(legacyData));

      await partyInfo.initialize();

      expect(partyInfo.partyLevels).toHaveLength(1);
      expect(partyInfo.partyLevels[0].level.level).toBe(5);
      expect(partyInfo.partyLevels[0].playerCount).toBe(4);

      // Should have migrated to new format
      const newFormat = localStorage.getItem('5em-party-info');
      expect(newFormat).toBeTruthy();
    });

    it('should not migrate if partyLevel is undefined', async () => {
      const legacyData = {
        groups: {},
      };

      localStorage.setItem('5em-encounter', JSON.stringify(legacyData));

      partyInfo.partyLevels = [
        {
          level: PLAYER_LEVELS[3],
          playerCount: 3,
        },
      ];

      await partyInfo.initialize();

      // Should not change defaults
      expect(partyInfo.partyLevels[0].level.level).toBe(3);
    });
  });

  describe('integration', () => {
    it('should handle full workflow', async () => {
      // Set a multi-level party
      partyInfo.partyLevels = [
        {
          level: PLAYER_LEVELS[5],
          playerCount: 3,
        },
        {
          level: PLAYER_LEVELS[7],
          playerCount: 2,
        },
      ];

      // Check calculations
      expect(partyInfo.totalPlayerCount).toBe(5);
      const thresholds = partyInfo.totalPartyExpLevels;
      expect(thresholds.deadly).toBeGreaterThan(0);

      // Persist
      partyInfo.freeze();

      // Reset and reload
      partyInfo.partyLevels = [];
      await partyInfo.initialize();

      // Should restore
      expect(partyInfo.partyLevels).toHaveLength(2);
      expect(partyInfo.totalPlayerCount).toBe(5);
    });
  });
});
