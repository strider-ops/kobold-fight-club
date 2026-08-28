import { describe, it, expect, beforeEach, vi } from 'vitest';
import { combat } from '../combat';
import { CombatStatus } from '@/types';
import type { Monster, Combatant } from '@/types';

describe('CombatService', () => {
  beforeEach(() => {
    combat.reset();
  });

  describe('initialization', () => {
    it('should start with empty combatants', () => {
      expect(combat.combatants).toEqual([]);
      expect(combat.active).toBe(0);
      expect(combat.delta).toBe(0);
    });

    it('should reset state when reset is called', () => {
      combat.delta = 10;
      (combat as any).state = { active: 2, combatants: [{}, {}], delta: 10 };
      combat.reset();
      expect(combat.combatants).toEqual([]);
      expect(combat.active).toBe(0);
      expect(combat.delta).toBe(0);
    });
  });

  describe('addMonster', () => {
    const mockMonster: Monster = {
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

    it('should add a single monster', () => {
      combat.addMonster(mockMonster, 1);
      expect(combat.combatants).toHaveLength(1);
      expect(combat.combatants[0]).toMatchObject({
        type: 'enemy',
        name: 'Goblin',
        ac: 15,
        hp: 7,
        initiativeMod: 2,
        initiative: 12, // 10 + init modifier
        id: 'test.goblin',
      });
    });

    it('should add multiple numbered monsters', () => {
      combat.addMonster(mockMonster, 3);
      expect(combat.combatants).toHaveLength(3);
      expect(combat.combatants[0].name).toBe('Goblin 1');
      expect(combat.combatants[1].name).toBe('Goblin 2');
      expect(combat.combatants[2].name).toBe('Goblin 3');
    });

    it('should handle string ac/hp/init values', () => {
      const monsterWithStrings: Monster = {
        ...mockMonster,
        ac: '15' as any,
        hp: '7' as any,
        init: '2' as any,
      };

      combat.addMonster(monsterWithStrings, 1);
      expect(combat.combatants[0]).toMatchObject({
        ac: 15,
        hp: 7,
        initiativeMod: 2,
        initiative: 12,
      });
    });
  });

  describe('addPlayer', () => {
    it('should add a player combatant', () => {
      const player = {
        name: 'Aragorn',
        hp: 45,
        init: 3,
        advantageOnInitiative: false,
        initiative: 13,
        ac: 16,
        maxHp: 45,
      };

      combat.addPlayer(player);
      expect(combat.combatants).toHaveLength(1);
      expect(combat.combatants[0]).toMatchObject({
        type: 'player',
        name: 'Aragorn',
        hp: 45,
        initiativeMod: 3,
        initiative: 13,
        damage: 0,
      });
    });

    it('should handle player with advantage on initiative', () => {
      const player = {
        name: 'Legolas',
        hp: 40,
        init: 4,
        advantageOnInitiative: true,
        initiative: 14,
        ac: 15,
        maxHp: 40,
      };

      combat.addPlayer(player);
      expect(combat.combatants[0].advantageOnInitiative).toBe(true);
    });
  });

  describe('addLair', () => {
    it('should add lair action combatant', () => {
      combat.addLair();
      expect(combat.combatants).toHaveLength(1);
      expect(combat.combatants[0]).toMatchObject({
        type: 'lair',
        name: 'Lair',
        initiativeMod: 0,
        initiative: 20,
        fixedInitiative: true,
        noHp: true,
      });
    });
  });

  describe('init', () => {
    const mockMonster: Monster = {
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

    const mockLairMonster: Monster = {
      ...mockMonster,
      id: 'test.dragon',
      name: 'Adult Red Dragon',
      lair: true,
    };

    it('should return NO_MONSTERS when no monsters', () => {
      const result = combat.init({}, {}, []);
      expect(result).toBe(CombatStatus.NO_MONSTERS);
    });

    it('should return NO_PLAYERS when no party selected', () => {
      const encounterGroups = { 'test.goblin': { qty: 2 } };
      const monstersById = { 'test.goblin': mockMonster };

      const result = combat.init(encounterGroups, monstersById, null);
      expect(result).toBe(CombatStatus.NO_PLAYERS);
    });

    it('should return combined status when missing both', () => {
      const result = combat.init({}, {}, null);
      expect(result).toBe(CombatStatus.NO_MONSTERS | CombatStatus.NO_PLAYERS);
    });

    it('should initialize combat with players and monsters', () => {
      const encounterGroups = { 'test.goblin': { qty: 2 } };
      const monstersById = { 'test.goblin': mockMonster };
      const selectedParty = [
        {
          name: 'Aragorn',
          hp: 45,
          initiativeMod: 3,
          damage: 0,
        },
      ];

      const result = combat.init(encounterGroups, monstersById, selectedParty);

      expect(result).toBe(CombatStatus.READY);
      expect(combat.combatants).toHaveLength(3); // 1 player + 2 goblins
    });

    it('should add lair action if any monster has lair', () => {
      const encounterGroups = { 'test.dragon': { qty: 1 } };
      const monstersById = { 'test.dragon': mockLairMonster };
      const selectedParty = [
        {
          name: 'Aragorn',
          hp: 45,
          initiativeMod: 3,
          damage: 0,
        },
      ];

      const result = combat.init(encounterGroups, monstersById, selectedParty);

      expect(result).toBe(CombatStatus.READY);
      expect(combat.combatants).toHaveLength(3); // 1 player + 1 dragon + 1 lair
      expect(combat.combatants.some((c) => c.type === 'lair')).toBe(true);
    });

    it('should clear previous combatants on init', () => {
      // Add some combatants first
      combat.addPlayer({ name: 'Test', hp: 10, init: 0, ac: 10, maxHp: 10 });
      expect(combat.combatants).toHaveLength(1);

      // Now init with new encounter
      const encounterGroups = { 'test.goblin': { qty: 1 } };
      const monstersById = { 'test.goblin': mockMonster };
      const selectedParty = [
        {
          name: 'Aragorn',
          hp: 45,
          initiativeMod: 3,
          damage: 0,
        },
      ];

      combat.init(encounterGroups, monstersById, selectedParty);
      expect(combat.combatants).toHaveLength(2); // Only new combatants
    });
  });

  describe('begin', () => {
    it('should sort combatants by initiative descending', () => {
      combat.addPlayer({ name: 'Slow', hp: 10, init: 1, ac: 10, maxHp: 10, initiative: 11 } as any);
      combat.addPlayer({ name: 'Fast', hp: 10, init: 5, ac: 10, maxHp: 10, initiative: 25 } as any);
      combat.addPlayer({ name: 'Medium', hp: 10, init: 3, ac: 10, maxHp: 10, initiative: 15 } as any);

      combat.begin();

      expect(combat.combatants[0].name).toBe('Fast');
      expect(combat.combatants[1].name).toBe('Medium');
      expect(combat.combatants[2].name).toBe('Slow');
    });

    it('should activate first combatant', () => {
      combat.addPlayer({ name: 'Player', hp: 10, init: 3, ac: 10, maxHp: 10 } as any);

      combat.begin();

      expect(combat.combatants[0].active).toBe(true);
    });

    it('should handle empty combatants list', () => {
      expect(() => combat.begin()).not.toThrow();
    });
  });

  describe('nextTurn', () => {
    beforeEach(() => {
      combat.addPlayer({ name: 'Player 1', hp: 10, init: 3, ac: 10, maxHp: 10 } as any);
      combat.addPlayer({ name: 'Player 2', hp: 10, init: 2, ac: 10, maxHp: 10 } as any);
      combat.addPlayer({ name: 'Player 3', hp: 10, init: 1, ac: 10, maxHp: 10 } as any);
      combat.begin();
    });

    it('should advance to next combatant', () => {
      expect(combat.active).toBe(0);
      expect(combat.combatants[0].active).toBe(true);

      combat.nextTurn();

      expect(combat.active).toBe(1);
      expect(combat.combatants[0].active).toBe(false);
      expect(combat.combatants[1].active).toBe(true);
    });

    it('should wrap around to first combatant', () => {
      combat.nextTurn();
      combat.nextTurn();
      combat.nextTurn(); // Should wrap to index 0

      expect(combat.active).toBe(0);
      expect(combat.combatants[0].active).toBe(true);
      expect(combat.combatants[2].active).toBe(false);
    });
  });

  describe('applyDelta', () => {
    let combatant: Combatant;

    beforeEach(() => {
      combatant = {
        type: 'player',
        name: 'Test Player',
        hp: 20,
        initiative: 10,
        damage: 0,
      };
      combat.delta = 5;
    });

    it('should apply positive delta as damage', () => {
      combat.applyDelta(combatant);
      expect(combatant.damage).toBe(5);
      expect(combat.delta).toBe(0);
    });

    it('should apply negative delta as healing with multiplier', () => {
      combatant.damage = 10;
      combat.delta = 5;
      combat.applyDelta(combatant, -1);
      expect(combatant.damage).toBe(5); // 10 + (5 * -1)
      expect(combat.delta).toBe(0);
    });

    it('should not allow damage to exceed hp', () => {
      combat.delta = 100;
      combat.applyDelta(combatant);
      expect(combatant.damage).toBe(20); // Capped at hp
    });

    it('should not allow negative damage', () => {
      combatant.damage = 5;
      combat.delta = 10;
      combat.applyDelta(combatant, -1);
      expect(combatant.damage).toBe(0); // Can't go negative
    });

    it('should initialize damage if undefined', () => {
      delete combatant.damage;
      combat.applyDelta(combatant);
      expect(combatant.damage).toBe(5);
    });

    it('should persist player damage via players service', () => {
      const mockPlayersService = {
        setDamage: vi.fn(),
      };

      combatant.type = 'player';
      combat.applyDelta(combatant, 1, mockPlayersService);

      expect(mockPlayersService.setDamage).toHaveBeenCalledWith('Test Player', 5);
    });

    it('should not call players service for enemy combatants', () => {
      const mockPlayersService = {
        setDamage: vi.fn(),
      };

      combatant.type = 'enemy';
      combat.applyDelta(combatant, 1, mockPlayersService);

      expect(mockPlayersService.setDamage).not.toHaveBeenCalled();
    });
  });

  describe('rollInitiative', () => {
    beforeEach(() => {
      // Mock lodash random
      window._ = {
        random: vi.fn().mockReturnValue(10),
      };
    });

    it('should roll initiative and add modifier', () => {
      const combatant: Combatant = {
        type: 'player',
        name: 'Test',
        initiativeMod: 3,
        initiative: 0,
      };

      combat.rollInitiative(combatant);

      expect(combatant.initiative).toBe(13); // 10 (roll) + 3 (mod)
      expect(combatant.initiativeRolled).toBe(true);
    });

    it('should handle advantage on initiative', () => {
      const rolls = [8, 15]; // Second roll is higher
      let callCount = 0;
      window._.random = vi.fn(() => rolls[callCount++]);

      const combatant: Combatant = {
        type: 'player',
        name: 'Test',
        initiativeMod: 2,
        advantageOnInitiative: true,
        initiative: 0,
      };

      combat.rollInitiative(combatant);

      expect(combatant.initiative).toBe(17); // 15 (higher roll) + 2 (mod)
      expect(window._.random).toHaveBeenCalledTimes(2);
    });

    it('should use first roll if higher with advantage', () => {
      const rolls = [18, 12]; // First roll is higher
      let callCount = 0;
      window._.random = vi.fn(() => rolls[callCount++]);

      const combatant: Combatant = {
        type: 'player',
        name: 'Test',
        initiativeMod: 1,
        advantageOnInitiative: true,
        initiative: 0,
      };

      combat.rollInitiative(combatant);

      expect(combatant.initiative).toBe(19); // 18 (higher roll) + 1 (mod)
    });

    it('should handle missing initiative modifier', () => {
      const combatant: Combatant = {
        type: 'player',
        name: 'Test',
        initiative: 0,
      };

      combat.rollInitiative(combatant);

      expect(combatant.initiative).toBe(10); // 10 (roll) + 0 (default)
    });
  });

  describe('delta property', () => {
    it('should allow setting delta', () => {
      combat.delta = 15;
      expect(combat.delta).toBe(15);
    });

    it('should reset delta to 0', () => {
      combat.delta = 10;
      combat.delta = 0;
      expect(combat.delta).toBe(0);
    });
  });
});
