/**
 * Tests for Monsters Service
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { monsters } from '../monsters';
import { db } from '../db';
import { misc } from '../misc';
import { monsterFactory } from '../monsterFactory';

// Mock the db service
vi.mock('../db', () => ({
  db: {
    query: vi.fn(),
  },
}));

describe('MonstersService', () => {
  beforeEach(() => {
    // Reset service state
    monsters._reset();

    // Clear misc state
    misc.sources.length = 0;
    Object.keys(misc.sourceFilters).forEach((key) => delete misc.sourceFilters[key]);
    Object.keys(misc.shortNames).forEach((key) => delete misc.shortNames[key]);
    Object.keys(misc.sourcesByType).forEach((key) => delete misc.sourcesByType[key]);

    // Reset mocks
    vi.clearAllMocks();
  });

  describe('load', () => {
    it('should load monsters and sources from database', async () => {
      const mockSources = [
        {
          name: 'Monster Manual',
          shortname: 'MM',
          type: 'Official',
          default_selected: 1,
        },
      ];

      const mockMonsters = [
        {
          fid: 'mm.goblin',
          guid: '',
          name: 'Goblin',
          section: '',
          ac: 15,
          hp: 7,
          init: 2,
          cr: '1/4',
          type: 'humanoid',
          size: 'Small',
          alignment: 'neutral evil',
          legendary: 0,
          lair: 0,
          unique: 0,
          special: 0,
          tags: 'goblinoid',
          environment: 'forest',
          sources: 'Monster Manual: 166',
        },
        {
          fid: 'mm.dragon',
          guid: '',
          name: 'Ancient Red Dragon',
          section: '',
          ac: 22,
          hp: 546,
          init: 0,
          cr: '24',
          type: 'dragon',
          size: 'Gargantuan',
          alignment: 'chaotic evil',
          legendary: 1,
          lair: 1,
          unique: 0,
          special: 0,
          tags: '',
          environment: 'mountain',
          sources: 'Monster Manual: 98',
        },
      ];

      vi.mocked(db.query).mockResolvedValueOnce(mockSources).mockResolvedValueOnce(mockMonsters);

      const result = await monsters.load();

      expect(result.monsters).toBe(2);
      expect(result.sources).toBe(1);
      expect(monsters.all).toHaveLength(2);
      expect(monsters.all[0].name).toBe('Ancient Red Dragon'); // Sorted by name
      expect(monsters.all[1].name).toBe('Goblin');
    });

    it('should index monsters by ID', async () => {
      const mockMonsters = [
        {
          fid: 'mm.goblin',
          guid: '',
          name: 'Goblin',
          section: '',
          ac: 15,
          hp: 7,
          init: 2,
          cr: '1/4',
          type: 'humanoid',
          size: 'Small',
          alignment: 'neutral evil',
          legendary: 0,
          lair: 0,
          unique: 0,
          special: 0,
          tags: null,
          environment: null,
          sources: 'Monster Manual: 166',
        },
      ];

      vi.mocked(db.query).mockResolvedValueOnce([]).mockResolvedValueOnce(mockMonsters);

      await monsters.load();

      expect(monsters.byId['mm.goblin']).toBeDefined();
      expect(monsters.byId['mm.goblin'].name).toBe('Goblin');
      expect(monsters.hasId('mm.goblin')).toBe(true);
      expect(monsters.hasId('nonexistent')).toBe(false);
    });

    it('should index monsters by CR', async () => {
      const mockMonsters = [
        {
          fid: 'mm.goblin',
          guid: '',
          name: 'Goblin',
          section: '',
          ac: 15,
          hp: 7,
          init: 2,
          cr: '1/4',
          type: 'humanoid',
          size: 'Small',
          alignment: 'neutral evil',
          legendary: 0,
          lair: 0,
          unique: 0,
          special: 0,
          tags: null,
          environment: null,
          sources: 'MM',
        },
        {
          fid: 'mm.kobold',
          guid: '',
          name: 'Kobold',
          section: '',
          ac: 12,
          hp: 5,
          init: 2,
          cr: '1/8',
          type: 'humanoid',
          size: 'Small',
          alignment: 'lawful evil',
          legendary: 0,
          lair: 0,
          unique: 0,
          special: 0,
          tags: null,
          environment: null,
          sources: 'MM',
        },
        {
          fid: 'mm.orc',
          guid: '',
          name: 'Orc',
          section: '',
          ac: 13,
          hp: 15,
          init: 1,
          cr: '1/2',
          type: 'humanoid',
          size: 'Medium',
          alignment: 'chaotic evil',
          legendary: 0,
          lair: 0,
          unique: 0,
          special: 0,
          tags: null,
          environment: null,
          sources: 'MM',
        },
      ];

      vi.mocked(db.query).mockResolvedValueOnce([]).mockResolvedValueOnce(mockMonsters);

      await monsters.load();

      expect(monsters.byCr['1/4']).toHaveLength(1);
      expect(monsters.byCr['1/4'][0].name).toBe('Goblin');

      expect(monsters.byCr['1/8']).toHaveLength(1);
      expect(monsters.byCr['1/8'][0].name).toBe('Kobold');

      expect(monsters.byCr['1/2']).toHaveLength(1);
      expect(monsters.byCr['1/2'][0].name).toBe('Orc');
    });

    it('should register sources', async () => {
      const mockSources = [
        {
          name: 'Monster Manual',
          shortname: 'MM',
          type: 'Official',
          default_selected: 1,
        },
        {
          name: "Volo's Guide",
          shortname: 'VGM',
          type: 'Official',
          default_selected: 0,
        },
        {
          name: 'Homebrew Pack',
          shortname: 'HB',
          type: 'Homebrew',
          default_selected: 1,
        },
      ];

      vi.mocked(db.query).mockResolvedValueOnce(mockSources).mockResolvedValueOnce([]);

      await monsters.load();

      expect(misc.sources).toContain('Monster Manual');
      expect(misc.sources).toContain("Volo's Guide");
      expect(misc.sources).toContain('Homebrew Pack');

      expect(misc.sourceFilters['Monster Manual']).toBe(true);
      expect(misc.sourceFilters["Volo's Guide"]).toBe(false);

      expect(misc.shortNames['Monster Manual']).toBe('MM');
      expect(misc.shortNames["Volo's Guide"]).toBe('VGM');

      expect(misc.sourcesByType['Official']).toContain('Monster Manual');
      expect(misc.sourcesByType['Official']).toContain("Volo's Guide");
      expect(misc.sourcesByType['Homebrew']).toContain('Homebrew Pack');
    });

    it('should be idempotent - multiple calls return same promise', async () => {
      vi.mocked(db.query)
        .mockResolvedValueOnce([{ name: 'Test', shortname: 'T', type: 'Test', default_selected: 1 }])
        .mockResolvedValueOnce([]);

      const promise1 = monsters.load();
      const promise2 = monsters.load();
      const promise3 = monsters.load();

      // All promises should be the exact same instance
      expect(promise2).toBe(promise1);
      expect(promise3).toBe(promise1);

      await promise1;

      // db.query should only be called once (2 calls total for sources and monsters)
      expect(db.query).toHaveBeenCalledTimes(2);
    });

    it('should allow retry after failure', async () => {
      vi.mocked(db.query).mockRejectedValueOnce(new Error('Database error'));

      await expect(monsters.load()).rejects.toThrow('Database error');

      // After failure, should allow retry
      vi.mocked(db.query).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const result = await monsters.load();
      expect(result).toBeDefined();
    });
  });

  describe('addCustom', () => {
    it('should add custom monsters', () => {
      const customMonsters = [
        {
          fid: 'custom.test-monster',
          name: 'Test Monster',
          section: '',
          ac: 10,
          hp: 10,
          init: 0,
          cr: '1',
          type: 'aberration',
          size: 'Medium',
          alignment: 'neutral',
          legendary: false,
          lair: false,
          unique: false,
          special: false,
          tags: '',
          environment: '',
          sources: 'Custom Source',
        },
      ];

      const count = monsters.addCustom('Custom Source', 'CS', customMonsters);

      expect(count).toBe(1);
      expect(monsters.all).toHaveLength(1);
      expect(monsters.all[0].name).toBe('Test Monster');
      expect(monsters.hasId('custom.test-monster')).toBe(true);
    });

    it('should register custom source', () => {
      const customMonsters = [
        {
          fid: 'custom.test',
          name: 'Test',
          cr: '1',
          type: 'aberration',
          size: 'Medium',
          alignment: 'neutral',
          sources: 'My Homebrew',
        },
      ];

      monsters.addCustom('My Homebrew', 'MH', customMonsters);

      expect(misc.sources).toContain('My Homebrew');
      expect(misc.sourceFilters['My Homebrew']).toBe(true); // Default selected
      expect(misc.shortNames['My Homebrew']).toBe('MH');
      expect(misc.sourcesByType['Homebrew']).toContain('My Homebrew');
    });

    it('should emit custom-source-added event', () => {
      const callback = vi.fn();
      monsters.onCustomSourceAdded(callback);

      const customMonsters = [
        {
          fid: 'custom.test',
          name: 'Test',
          cr: '1',
          type: 'aberration',
          size: 'Medium',
          alignment: 'neutral',
          sources: 'New Pack',
        },
      ];

      monsters.addCustom('New Pack', 'NP', customMonsters);

      expect(callback).toHaveBeenCalledWith('New Pack');

      monsters.offCustomSourceAdded(callback);
    });
  });

  describe('removeCustom', () => {
    beforeEach(async () => {
      // Add some custom monsters first
      const customMonsters = [
        {
          fid: 'custom.monster1',
          name: 'Monster 1',
          cr: '1',
          type: 'aberration',
          size: 'Medium',
          alignment: 'neutral',
          sources: 'Custom Pack',
        },
        {
          fid: 'custom.monster2',
          name: 'Monster 2',
          cr: '2',
          type: 'beast',
          size: 'Large',
          alignment: 'unaligned',
          sources: 'Custom Pack',
        },
      ];

      monsters.addCustom('Custom Pack', 'CP', customMonsters);
    });

    it('should remove custom monsters', () => {
      expect(monsters.all).toHaveLength(2);

      const removed = monsters.removeCustom('Custom Pack');

      expect(removed).toBe(2);
      expect(monsters.all).toHaveLength(0);
      expect(monsters.hasId('custom.monster1')).toBe(false);
      expect(monsters.hasId('custom.monster2')).toBe(false);
    });

    it('should remove source from misc', () => {
      monsters.removeCustom('Custom Pack');

      expect(misc.sources).not.toContain('Custom Pack');
      expect(misc.sourceFilters['Custom Pack']).toBeUndefined();
      expect(misc.shortNames['Custom Pack']).toBeUndefined();
      expect(misc.sourcesByType['Homebrew']).toBeUndefined(); // Empty array removed
    });

    it('should remove monsters from byCr index', () => {
      expect(monsters.byCr['1']).toHaveLength(1);
      expect(monsters.byCr['2']).toHaveLength(1);

      monsters.removeCustom('Custom Pack');

      expect(monsters.byCr['1']).toEqual([]);
      expect(monsters.byCr['2']).toEqual([]);
    });

    it('should return 0 if source not found', () => {
      const removed = monsters.removeCustom('Nonexistent Source');
      expect(removed).toBe(0);
    });
  });

  describe('check', () => {
    it('should validate monster', () => {
      const validMonster = monsterFactory.createMonster({
        name: 'Goblin',
        cr: '1/4',
        type: 'humanoid',
        size: 'Small',
        alignment: 'neutral evil',
      });

      const errors = monsters.check(validMonster);
      expect(errors).toHaveLength(0);
    });

    it('should return errors for invalid monster', () => {
      const invalidMonster = {};

      const errors = monsters.check(invalidMonster);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toContain('Monster must have a name');
    });
  });
});
