/**
 * Tests for Monster Factory Service
 */
import { describe, it, expect } from 'vitest';
import { monsterFactory, CR_INFO } from '../monsterFactory';
import type { Monster, SearchFilters } from '@/types';

describe('MonsterFactory', () => {
  describe('createMonster', () => {
    it('should create a basic monster', () => {
      const result = monsterFactory.createMonster({
        fid: 'mm.goblin',
        name: 'Goblin',
        size: 'Small',
        type: 'humanoid',
        alignment: 'neutral evil',
        ac: 15,
        hp: 7,
        init: 2,
        cr: '1/4',
        sources: 'Monster Manual: 166',
      });

      expect(result.name).toBe('Goblin');
      expect(result.size).toBe('Small');
      expect(result.type).toBe('humanoid');
      expect(result.ac).toBe(15);
      expect(result.hp).toBe(7);
      expect(result.init).toBe(2);
      expect(result.cr.text).toBe('1/4');
      expect(result.cr.exp).toBe(50);
    });

    it('should parse CR correctly', () => {
      const cr0 = monsterFactory.createMonster({ cr: '0' });
      expect(cr0.cr).toEqual(CR_INFO['0']);

      const cr1_8 = monsterFactory.createMonster({ cr: '1/8' });
      expect(cr1_8.cr).toEqual(CR_INFO['1/8']);

      const cr20 = monsterFactory.createMonster({ cr: '20' });
      expect(cr20.cr).toEqual(CR_INFO['20']);
    });

    it('should default to CR 0 for invalid CR', () => {
      const result = monsterFactory.createMonster({ cr: 'invalid' });
      expect(result.cr).toEqual(CR_INFO['0']);
    });

    it('should parse numeric fields', () => {
      const numeric = monsterFactory.createMonster({
        ac: '15',
        hp: '50',
        init: '3',
      });
      expect(numeric.ac).toBe(15);
      expect(numeric.hp).toBe(50);
      expect(numeric.init).toBe(3);
    });

    it('should keep non-numeric fields as strings', () => {
      const nonNumeric = monsterFactory.createMonster({
        ac: 'natural armor',
        hp: 'varies',
        init: 'special',
      });
      // parseInt tries to parse numbers from the start of the string
      // Only truly non-numeric strings stay as strings
      expect(nonNumeric.ac).toBe('natural armor'); // NaN, stays as string
      expect(nonNumeric.hp).toBe('varies'); // NaN, stays as string
      expect(nonNumeric.init).toBe('special'); // NaN, stays as string
    });

    it('should handle boolean flags', () => {
      const dragon = monsterFactory.createMonster({
        legendary: true,
        lair: true,
        unique: false,
        special: false,
      });
      expect(dragon.legendary).toBe(true);
      expect(dragon.lair).toBe(true);
      expect(dragon.unique).toBe(false);
      expect(dragon.special).toBe(false);
    });

    it('should parse tags from string', () => {
      const result = monsterFactory.createMonster({
        tags: 'goblinoid, shapechanger',
      });
      expect(result.tags).toEqual(['goblinoid', 'shapechanger']);
    });

    it('should parse environment from string', () => {
      const result = monsterFactory.createMonster({
        environment: 'forest, grassland',
      });
      expect(result.environment).toEqual(['forest', 'grassland']);
    });

    it('should parse alignment with flags', () => {
      const ne = monsterFactory.createMonster({
        alignment: 'neutral evil',
      });
      expect(ne.alignment.text).toBe('neutral evil');
      expect(ne.alignment.tags).toContain('neutral evil');
    });

    it('should handle complex alignments', () => {
      const any = monsterFactory.createMonster({
        alignment: 'any alignment',
      });
      expect(any.alignment.tags).toHaveLength(9); // All 9 standard alignments

      const anyEvil = monsterFactory.createMonster({
        alignment: 'any evil',
      });
      expect(anyEvil.alignment.tags).toEqual(['lawful evil', 'neutral evil', 'chaotic evil']);
    });

    it('should build searchable string', () => {
      const result = monsterFactory.createMonster({
        name: 'Goblin',
        section: 'Humanoids',
        type: 'humanoid',
        size: 'Small',
        alignment: 'neutral evil',
        cr: '1/4',
        tags: 'goblinoid',
      });

      expect(result.searchable).toContain('goblin');
      expect(result.searchable).toContain('humanoid');
      expect(result.searchable).toContain('small');
      expect(result.searchable).toContain('neutral evil');
      expect(result.searchable).toContain('1/4');
      expect(result.searchable).toContain('goblinoid');
    });
  });

  describe('parseSources', () => {
    it('should parse sources with page numbers', () => {
      const result = monsterFactory.createMonster({
        sources: 'Monster Manual: 166, Volo\'s Guide: 45',
      });

      expect(result.sources).toHaveLength(2);
      expect(result.sources[0].name).toBe('Monster Manual');
      expect(result.sources[0].page).toBe(166);
      expect(result.sources[1].name).toBe('Volo\'s Guide');
      expect(result.sources[1].page).toBe(45);
    });

    it('should parse sources without page numbers', () => {
      const result = monsterFactory.createMonster({
        sources: 'SRD',
      });

      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].name).toBe('SRD');
      expect(result.sources[0].page).toBeUndefined();
    });

    it('should parse sources with URLs', () => {
      const result = monsterFactory.createMonster({
        sources: 'Homebrew: https://example.com',
      });

      expect(result.sources[0].name).toBe('Homebrew');
      expect(result.sources[0].page).toBe('https://example.com');
    });

    it('should sort sources alphabetically', () => {
      const result = monsterFactory.createMonster({
        sources: 'Volo\'s Guide: 45, Monster Manual: 166, SRD',
      });

      expect(result.sources[0].name).toBe('Monster Manual');
      expect(result.sources[1].name).toBe('SRD');
      expect(result.sources[2].name).toBe('Volo\'s Guide');
    });
  });

  describe('checkMonster', () => {
    const goblin: Monster = monsterFactory.createMonster({
      name: 'Goblin',
      size: 'Small',
      type: 'humanoid',
      alignment: 'neutral evil',
      cr: '1/4',
      legendary: false,
      lair: false,
      unique: false,
      tags: 'goblinoid',
      environment: 'forest',
      sources: 'Monster Manual: 166',
    } as any);

    it('should pass with no filters', () => {
      expect(monsterFactory.checkMonster(goblin, {})).toBe(true);
    });

    it('should filter by name text', () => {
      expect(monsterFactory.checkMonster(goblin, { text: 'goblin' })).toBe(true);
      expect(monsterFactory.checkMonster(goblin, { text: 'dragon' })).toBe(false);
    });

    it('should filter by regex', () => {
      expect(monsterFactory.checkMonster(goblin, { text: '^gob', isRegex: true })).toBe(true);
      expect(monsterFactory.checkMonster(goblin, { text: '^dra', isRegex: true })).toBe(false);
    });

    it('should filter by CR range', () => {
      expect(monsterFactory.checkMonster(goblin, { minCr: 0, maxCr: 1 })).toBe(true);
      expect(monsterFactory.checkMonster(goblin, { minCr: 1, maxCr: 5 })).toBe(false);
      expect(monsterFactory.checkMonster(goblin, { minCr: 0, maxCr: 0.125 })).toBe(false);
    });

    it('should filter by legendary', () => {
      const dragon = monsterFactory.createMonster({
        name: 'Dragon',
        legendary: true,
        cr: '20',
        sources: 'MM',
      } as any);

      expect(monsterFactory.checkMonster(dragon, { legendary: true })).toBe(true);
      expect(monsterFactory.checkMonster(goblin, { legendary: true })).toBe(false);
      expect(monsterFactory.checkMonster(goblin, { legendary: false })).toBe(true);
      expect(monsterFactory.checkMonster(dragon, { legendary: false })).toBe(false);
    });

    it('should filter by size', () => {
      expect(monsterFactory.checkMonster(goblin, { sizeFilters: ['Small'] })).toBe(true);
      expect(monsterFactory.checkMonster(goblin, { sizeFilters: ['Large'] })).toBe(false);
      expect(monsterFactory.checkMonster(goblin, { sizeFilters: ['Small', 'Medium'] })).toBe(true);
    });

    it('should filter by type', () => {
      expect(monsterFactory.checkMonster(goblin, { typeFilters: ['humanoid'] })).toBe(true);
      expect(monsterFactory.checkMonster(goblin, { typeFilters: ['dragon'] })).toBe(false);
      expect(monsterFactory.checkMonster(goblin, { typeFilters: ['humanoid', 'beast'] })).toBe(true);
    });

    it('should filter by alignment', () => {
      expect(monsterFactory.checkMonster(goblin, { alignmentFilters: ['neutral evil'] })).toBe(true);
      expect(monsterFactory.checkMonster(goblin, { alignmentFilters: ['lawful good'] })).toBe(false);
      expect(monsterFactory.checkMonster(goblin, { alignmentFilters: ['evil'] })).toBe(true); // substring match
    });

    it('should filter by tags', () => {
      expect(monsterFactory.checkMonster(goblin, { tagFilters: ['goblinoid'] })).toBe(true);
      expect(monsterFactory.checkMonster(goblin, { tagFilters: ['shapechanger'] })).toBe(false);
    });

    it('should filter by environment', () => {
      expect(monsterFactory.checkMonster(goblin, { environmentFilters: ['forest'] })).toBe(true);
      expect(monsterFactory.checkMonster(goblin, { environmentFilters: ['desert'] })).toBe(false);
    });

    it('should filter by source', () => {
      expect(monsterFactory.checkMonster(goblin, {
        sourceFilters: { 'Monster Manual': true },
      })).toBe(true);

      expect(monsterFactory.checkMonster(goblin, {
        sourceFilters: { 'Monster Manual': false },
      })).toBe(false);

      expect(monsterFactory.checkMonster(goblin, {
        sourceFilters: { 'Volo\'s Guide': true },
      })).toBe(false);
    });
  });

  describe('checkIsMonsterFoundAndFiltered', () => {
    const goblin: Monster = monsterFactory.createMonster({
      name: 'Goblin',
      size: 'Small',
      type: 'humanoid',
      cr: '1/4',
      sources: 'MM',
    });

    it('should return true if name matches but filtered out', () => {
      const result = monsterFactory.checkIsMonsterFoundAndFiltered(goblin, {
        text: 'goblin',
        minCr: 5, // Filters out the goblin
      });
      expect(result).toBe(true);
    });

    it('should return false if name does not match', () => {
      const result = monsterFactory.checkIsMonsterFoundAndFiltered(goblin, {
        text: 'dragon',
        minCr: 0,
      });
      expect(result).toBe(false);
    });

    it('should return false if name matches and not filtered', () => {
      const result = monsterFactory.checkIsMonsterFoundAndFiltered(goblin, {
        text: 'goblin',
        minCr: 0,
      });
      expect(result).toBe(false);
    });
  });

  describe('checkMonsterValidity', () => {
    it('should return no errors for valid monster', () => {
      const valid = monsterFactory.createMonster({
        name: 'Goblin',
        size: 'Small',
        type: 'humanoid',
        cr: '1/4',
        sources: 'MM',
      });

      const errors = monsterFactory.checkMonsterValidity(valid);
      expect(errors).toHaveLength(0);
    });

    it('should require name', () => {
      const errors = monsterFactory.checkMonsterValidity({
        size: 'Small',
        type: 'humanoid',
        cr: CR_INFO['1/4'],
      });

      expect(errors).toContain('Monster must have a name');
    });

    it('should require CR', () => {
      const errors = monsterFactory.checkMonsterValidity({
        name: 'Goblin',
        size: 'Small',
        type: 'humanoid',
      });

      expect(errors).toContain('Monster must have a CR');
    });

    it('should require type', () => {
      const errors = monsterFactory.checkMonsterValidity({
        name: 'Goblin',
        size: 'Small',
        cr: CR_INFO['1/4'],
      });

      expect(errors).toContain('Monster must have a type');
    });

    it('should require size', () => {
      const errors = monsterFactory.checkMonsterValidity({
        name: 'Goblin',
        type: 'humanoid',
        cr: CR_INFO['1/4'],
      });

      expect(errors).toContain('Monster must have a size');
    });

    it('should return multiple errors', () => {
      const errors = monsterFactory.checkMonsterValidity({});

      expect(errors).toHaveLength(4);
      expect(errors).toContain('Monster must have a name');
      expect(errors).toContain('Monster must have a CR');
      expect(errors).toContain('Monster must have a type');
      expect(errors).toContain('Monster must have a size');
    });
  });

  describe('CR_INFO', () => {
    it('should have all standard CRs', () => {
      expect(CR_INFO['0']).toBeDefined();
      expect(CR_INFO['1/8']).toBeDefined();
      expect(CR_INFO['1/4']).toBeDefined();
      expect(CR_INFO['1/2']).toBeDefined();
      expect(CR_INFO['1']).toBeDefined();
      expect(CR_INFO['20']).toBeDefined();
      expect(CR_INFO['30']).toBeDefined();
    });

    it('should have correct EXP values', () => {
      expect(CR_INFO['0'].exp).toBe(10);
      expect(CR_INFO['1/4'].exp).toBe(50);
      expect(CR_INFO['1'].exp).toBe(200);
      expect(CR_INFO['10'].exp).toBe(5900);
      expect(CR_INFO['20'].exp).toBe(25000);
      expect(CR_INFO['30'].exp).toBe(155000);
    });
  });
});
