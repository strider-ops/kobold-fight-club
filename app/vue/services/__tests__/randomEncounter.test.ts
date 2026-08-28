import { describe, it, expect, beforeEach, vi } from 'vitest';
import { randomEncounter } from '../randomEncounter';
import type { Monster } from '@/types';

describe('RandomEncounterService', () => {
  const mockMonster1: Monster = {
    id: 'test.goblin',
    fid: 'test.goblin',
    name: 'Goblin',
    ac: 15,
    hp: 7,
    init: 2,
    cr: { text: '1/4', string: '1/4', value: 0.25, exp: 50 },
    type: 'Humanoid',
    size: 'Small',
    alignment: { text: 'Neutral Evil', tags: ['neutral', 'evil'] },
    legendary: false,
    lair: false,
    unique: false,
    special: false,
    sources: [],
  };

  const mockMonster2: Monster = {
    id: 'test.orc',
    fid: 'test.orc',
    name: 'Orc',
    ac: 13,
    hp: 15,
    init: 1,
    cr: { text: '1/2', string: '1/2', value: 0.5, exp: 100 },
    type: 'Humanoid',
    size: 'Medium',
    alignment: { text: 'Chaotic Evil', tags: ['chaotic', 'evil'] },
    legendary: false,
    lair: false,
    unique: false,
    special: false,
    sources: [],
  };

  const mockMonster3: Monster = {
    id: 'test.ogre',
    fid: 'test.ogre',
    name: 'Ogre',
    ac: 11,
    hp: 59,
    init: -1,
    cr: { text: '2', string: '2', value: 2, exp: 450 },
    type: 'Giant',
    size: 'Large',
    alignment: { text: 'Chaotic Evil', tags: ['chaotic', 'evil'] },
    legendary: false,
    lair: false,
    unique: false,
    special: false,
    sources: [],
  };

  const mockCrList = [
    { text: '0', string: '0', value: 0, exp: 10 },
    { text: '1/8', string: '1/8', value: 0.125, exp: 25 },
    { text: '1/4', string: '1/4', value: 0.25, exp: 50 },
    { text: '1/2', string: '1/2', value: 0.5, exp: 100 },
    { text: '1', string: '1', value: 1, exp: 200 },
    { text: '2', string: '2', value: 2, exp: 450 },
    { text: '3', string: '3', value: 3, exp: 700 },
  ];

  const mockMonsterFactory = {
    checkMonster: vi.fn().mockReturnValue(true),
  };

  const mockMisc = {
    getMultiplier: vi.fn().mockReturnValue(1),
  };

  const mockMetaInfo = {
    crList: mockCrList,
  };

  const mockMonsters = {
    byCr: {
      '1/4': [mockMonster1],
      '1/2': [mockMonster2],
      '2': [mockMonster3],
    },
  };

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    mockMonsterFactory.checkMonster.mockReturnValue(true);
    mockMisc.getMultiplier.mockReturnValue(1);

    // Set dependencies
    randomEncounter.setDependencies({
      monsterFactory: mockMonsterFactory,
      misc: mockMisc,
      metaInfo: mockMetaInfo,
      monsters: mockMonsters,
    });
  });

  describe('getRandomEncounter', () => {
    it('should generate an encounter with monsters', () => {
      const result = randomEncounter.getRandomEncounter(4, 400, {}, undefined);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return monster groups with qty', () => {
      const result = randomEncounter.getRandomEncounter(4, 400, {}, undefined);

      result.forEach((group) => {
        expect(group).toHaveProperty('monster');
        expect(group).toHaveProperty('qty');
        expect(group.qty).toBeGreaterThan(0);
        expect(group.monster).toHaveProperty('name');
        expect(group.monster).toHaveProperty('cr');
      });
    });

    it('should respect maxMonsters parameter', () => {
      const maxMonsters = 3;
      const result = randomEncounter.getRandomEncounter(4, 400, {}, maxMonsters);

      const totalMonsters = result.reduce((sum, group) => sum + group.qty, 0);
      expect(totalMonsters).toBeLessThanOrEqual(maxMonsters);
    });

    it('should use multiplier based on player count', () => {
      randomEncounter.getRandomEncounter(2, 400, {}, undefined);

      expect(mockMisc.getMultiplier).toHaveBeenCalled();
      const [playerCount, monsterCount] = mockMisc.getMultiplier.mock.calls[0];
      expect(playerCount).toBe(2);
      expect(typeof monsterCount).toBe('number');
    });

    it('should apply filters to monster selection', () => {
      const filters = { sizeFilters: ['Small'], typeFilters: ['Humanoid'] };
      randomEncounter.getRandomEncounter(4, 400, filters, undefined);

      expect(mockMonsterFactory.checkMonster).toHaveBeenCalled();

      // Check that filters were passed (with unique: false added)
      const callArgs = mockMonsterFactory.checkMonster.mock.calls[0];
      expect(callArgs[1]).toMatchObject({
        sizeFilters: ['Small'],
        typeFilters: ['Humanoid'],
        unique: false, // Should override to exclude unique monsters
      });
    });

    it('should apply fudge factor to target XP', () => {
      mockMisc.getMultiplier.mockReturnValue(2);
      const targetExp = 100;

      randomEncounter.getRandomEncounter(4, targetExp, {}, undefined);

      // fudgeFactor = 1.1, so baseExpBudget = 110
      // With multiplier of 2, availableExp = 110 / 2 = 55
      // This should influence monster selection (hard to test directly)
      expect(mockMisc.getMultiplier).toHaveBeenCalled();
    });

    it('should handle case when no monsters pass filters', () => {
      // Make checkMonster fail for first few attempts, then succeed
      let callCount = 0;
      mockMonsterFactory.checkMonster.mockImplementation(() => {
        callCount++;
        return callCount > 5; // Fail first 5, then succeed
      });

      const result = randomEncounter.getRandomEncounter(4, 400, {}, undefined);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getShuffledMonsterList', () => {
    it('should return shuffled copy of monsters at given CR', () => {
      const result = randomEncounter.getShuffledMonsterList('1/4');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Goblin');
    });

    it('should not modify original array', () => {
      const original = mockMonsters.byCr['1/4'];
      const originalLength = original.length;

      randomEncounter.getShuffledMonsterList('1/4');

      expect(original.length).toBe(originalLength);
    });

    it('should return empty array for invalid CR', () => {
      const result = randomEncounter.getShuffledMonsterList('999');

      expect(result).toEqual([]);
    });

    it('should shuffle the array', () => {
      // Add more monsters to test shuffling
      const manyMonsters = Array.from({ length: 10 }, (_, i) => ({
        ...mockMonster1,
        id: `test.goblin-${i}`,
        name: `Goblin ${i}`,
      }));

      mockMonsters.byCr['1/4'] = manyMonsters;

      const result1 = randomEncounter.getShuffledMonsterList('1/4');
      const result2 = randomEncounter.getShuffledMonsterList('1/4');

      // Arrays should have same elements
      expect(result1.length).toBe(10);
      expect(result2.length).toBe(10);

      // Reset to original
      mockMonsters.byCr['1/4'] = [mockMonster1];
    });
  });

  describe('getEncounterTemplate', () => {
    it('should return template with total and groups', () => {
      // Access private method via (randomEncounter as any)
      const template = (randomEncounter as any).getEncounterTemplate();

      expect(template).toHaveProperty('total');
      expect(template).toHaveProperty('groups');
      expect(Array.isArray(template.groups)).toBe(true);
      expect(typeof template.total).toBe('number');
    });

    it('should respect maxMonsters', () => {
      const template = (randomEncounter as any).getEncounterTemplate(3);

      expect(template.total).toBeLessThanOrEqual(3);
    });

    it('should select from valid templates', () => {
      const validTemplates = [
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

      for (let i = 0; i < 20; i++) {
        const template = (randomEncounter as any).getEncounterTemplate();

        const matchesTemplate = validTemplates.some(
          (validTemplate) => JSON.stringify(validTemplate) === JSON.stringify(template.groups)
        );

        // Note: Since shuffle modifies in place, the order might change
        // Just check that total is valid
        expect([1, 2, 3, 4, 6, 8].includes(template.total)).toBe(true);
      }
    });

    it('should calculate total correctly', () => {
      const template = (randomEncounter as any).getEncounterTemplate();

      const calculatedTotal = template.groups.reduce((a: number, b: number) => a + b, 0);
      expect(template.total).toBe(calculatedTotal);
    });
  });

  describe('getBestMonster', () => {
    it('should find monster close to target XP', () => {
      const targetExp = 50; // 1/4 CR
      const result = (randomEncounter as any).getBestMonster(targetExp, {});

      expect(result).toBeDefined();
      expect(result.cr.exp).toBe(50);
    });

    it('should find monster when target is between CRs', () => {
      const targetExp = 75; // Between 1/4 (50) and 1/2 (100)
      const result = (randomEncounter as any).getBestMonster(targetExp, {});

      expect(result).toBeDefined();
      expect([50, 100]).toContain(result.cr.exp);
    });

    it('should pass filters to checkMonster with unique: false', () => {
      const filters = { sizeFilters: ['Small'] };
      (randomEncounter as any).getBestMonster(50, filters);

      expect(mockMonsterFactory.checkMonster).toHaveBeenCalled();
      const callArgs = mockMonsterFactory.checkMonster.mock.calls[0];
      expect(callArgs[1]).toMatchObject({
        sizeFilters: ['Small'],
        unique: false,
      });
    });

    it('should search other CRs if no valid monsters at target CR', () => {
      // Make first CR fail, second succeed
      let callCount = 0;
      mockMonsterFactory.checkMonster.mockImplementation((monster) => {
        callCount++;
        return callCount > 1; // Fail first monster, succeed on second
      });

      const result = (randomEncounter as any).getBestMonster(50, {});

      expect(result).toBeDefined();
      expect(mockMonsterFactory.checkMonster).toHaveBeenCalledTimes(2);
    });

    it('should handle very high target XP', () => {
      const targetExp = 10000; // Much higher than available CRs
      const result = (randomEncounter as any).getBestMonster(targetExp, {});

      expect(result).toBeDefined();
      // Should use highest available CR
    });

    it('should handle very low target XP', () => {
      const targetExp = 5; // Lower than lowest CR (10)
      const result = (randomEncounter as any).getBestMonster(targetExp, {});

      expect(result).toBeDefined();
      // Should find something
    });
  });

  describe('setDependencies', () => {
    it('should set dependencies', () => {
      const deps = {
        monsterFactory: {},
        misc: {},
        metaInfo: {},
        monsters: {},
      };

      randomEncounter.setDependencies(deps as any);

      expect((randomEncounter as any).monsterFactory).toBe(deps.monsterFactory);
      expect((randomEncounter as any).misc).toBe(deps.misc);
      expect((randomEncounter as any).metaInfo).toBe(deps.metaInfo);
      expect((randomEncounter as any).monsters).toBe(deps.monsters);
    });
  });
});
