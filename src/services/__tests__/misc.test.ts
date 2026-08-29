/**
 * Tests for Misc Service
 */
import { describe, it, expect } from 'vitest';
import { misc } from '../misc';

describe('MiscService', () => {
  describe('getMultiplier', () => {
    describe('standard party size (3-5 players)', () => {
      it('should return 0 for 0 monsters', () => {
        expect(misc.getMultiplier(4, 0)).toBe(0);
      });

      it('should return 1 for single monster', () => {
        expect(misc.getMultiplier(4, 1)).toBe(1);
      });

      it('should return 1.5 for pair of monsters', () => {
        expect(misc.getMultiplier(4, 2)).toBe(1.5);
      });

      it('should return 2 for group of monsters (3-6)', () => {
        expect(misc.getMultiplier(4, 3)).toBe(2);
        expect(misc.getMultiplier(4, 4)).toBe(2);
        expect(misc.getMultiplier(4, 5)).toBe(2);
        expect(misc.getMultiplier(4, 6)).toBe(2);
      });

      it('should return 2.5 for large group (7-10)', () => {
        expect(misc.getMultiplier(4, 7)).toBe(2.5);
        expect(misc.getMultiplier(4, 8)).toBe(2.5);
        expect(misc.getMultiplier(4, 9)).toBe(2.5);
        expect(misc.getMultiplier(4, 10)).toBe(2.5);
      });

      it('should return 3 for very large group (11-14)', () => {
        expect(misc.getMultiplier(4, 11)).toBe(3);
        expect(misc.getMultiplier(4, 12)).toBe(3);
        expect(misc.getMultiplier(4, 13)).toBe(3);
        expect(misc.getMultiplier(4, 14)).toBe(3);
      });

      it('should return 4 for horde (15+)', () => {
        expect(misc.getMultiplier(4, 15)).toBe(4);
        expect(misc.getMultiplier(4, 20)).toBe(4);
        expect(misc.getMultiplier(4, 100)).toBe(4);
      });
    });

    describe('small party (1-2 players)', () => {
      it('should increase multiplier by one category for 1 player', () => {
        // Single monster: 1 → 1.5
        expect(misc.getMultiplier(1, 1)).toBe(1.5);
        // Pair: 1.5 → 2
        expect(misc.getMultiplier(1, 2)).toBe(2);
        // Group (3-6): 2 → 2.5
        expect(misc.getMultiplier(1, 3)).toBe(2.5);
        expect(misc.getMultiplier(1, 6)).toBe(2.5);
        // Large group (7-10): 2.5 → 3
        expect(misc.getMultiplier(1, 7)).toBe(3);
        // Very large (11-14): 3 → 4
        expect(misc.getMultiplier(1, 11)).toBe(4);
        // Horde (15+): 4 → 5
        expect(misc.getMultiplier(1, 15)).toBe(5);
      });

      it('should increase multiplier by one category for 2 players', () => {
        expect(misc.getMultiplier(2, 1)).toBe(1.5);
        expect(misc.getMultiplier(2, 2)).toBe(2);
        expect(misc.getMultiplier(2, 5)).toBe(2.5);
      });
    });

    describe('large party (6+ players)', () => {
      it('should decrease multiplier by one category for 6 players', () => {
        // Single monster: 1 → 0.5
        expect(misc.getMultiplier(6, 1)).toBe(0.5);
        // Pair: 1.5 → 1
        expect(misc.getMultiplier(6, 2)).toBe(1);
        // Group (3-6): 2 → 1.5
        expect(misc.getMultiplier(6, 3)).toBe(1.5);
        expect(misc.getMultiplier(6, 6)).toBe(1.5);
        // Large group (7-10): 2.5 → 2
        expect(misc.getMultiplier(6, 7)).toBe(2);
        // Very large (11-14): 3 → 2.5
        expect(misc.getMultiplier(6, 11)).toBe(2.5);
        // Horde (15+): 4 → 3
        expect(misc.getMultiplier(6, 15)).toBe(3);
      });

      it('should decrease multiplier for 8 players', () => {
        expect(misc.getMultiplier(8, 1)).toBe(0.5);
        expect(misc.getMultiplier(8, 2)).toBe(1);
        expect(misc.getMultiplier(8, 5)).toBe(1.5);
      });
    });

    describe('edge cases', () => {
      it('should handle 0 players with monsters', () => {
        // Should decrease multiplier (0 < 3)
        expect(misc.getMultiplier(0, 1)).toBe(1.5);
      });

      it('should handle extreme party sizes', () => {
        expect(misc.getMultiplier(100, 1)).toBe(0.5);
        expect(misc.getMultiplier(100, 5)).toBe(1.5);
      });

      it('should handle extreme monster counts', () => {
        expect(misc.getMultiplier(4, 1000)).toBe(4);
      });
    });
  });

  describe('data properties', () => {
    it('should initialize sourceFilters as empty object', () => {
      expect(misc.sourceFilters).toBeDefined();
      expect(typeof misc.sourceFilters).toBe('object');
    });

    it('should initialize sources as empty array', () => {
      expect(misc.sources).toBeDefined();
      expect(Array.isArray(misc.sources)).toBe(true);
    });

    it('should initialize sourcesByType as empty object', () => {
      expect(misc.sourcesByType).toBeDefined();
      expect(typeof misc.sourcesByType).toBe('object');
    });

    it('should initialize shortNames as empty object', () => {
      expect(misc.shortNames).toBeDefined();
      expect(typeof misc.shortNames).toBe('object');
    });

    it('should initialize tags as empty object', () => {
      expect(misc.tags).toBeDefined();
      expect(typeof misc.tags).toBe('object');
    });
  });
});
