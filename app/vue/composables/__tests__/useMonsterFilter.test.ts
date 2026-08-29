import { describe, it, expect, vi } from 'vitest';
import { ref } from 'vue';
import { useMonsterFilter } from '../useMonsterFilter';

// Mock library service
vi.mock('@/services/library', () => ({
  library: {
    encounters: [],
  },
}));

describe('useMonsterFilter', () => {
  const createMockMonster = (name: string, cr: number, size: string, type: string) => ({
    id: name.toLowerCase().replace(/\s/g, '-'),
    name,
    cr: { string: cr.toString(), value: cr, numeric: cr },
    size,
    sizeSort: { Tiny: 0, Small: 1, Medium: 2, Large: 3, Huge: 4, Gargantuan: 5 }[size] || 2,
    type,
    alignment: { text: 'Neutral' },
    sources: [{ name: 'Monster Manual' }],
    searchable: name.toLowerCase(),
    legendary: false,
    lair: false,
    unique: false,
    special: false,
    environment: ['Forest'],
  });

  describe('monster sorting', () => {
    it('should sort monsters by name alphabetically (default)', () => {
      const monsters = ref([
        createMockMonster('Zombie', 1/4, 'Medium', 'Undead'),
        createMockMonster('Aboleth', 10, 'Large', 'Aberration'),
        createMockMonster('Dragon', 15, 'Huge', 'Dragon'),
        createMockMonster('Beholder', 13, 'Large', 'Aberration'),
      ]);

      const filters = {
        sort: 'name',
        source: { 'Monster Manual': true },
      };

      const { filteredMonsters } = useMonsterFilter(monsters, filters);

      const names = filteredMonsters.value.map(m => m.name);
      expect(names).toEqual(['Aboleth', 'Beholder', 'Dragon', 'Zombie']);
    });

    it('should sort monsters by CR numerically', () => {
      const monsters = ref([
        createMockMonster('Goblin', 1/4, 'Small', 'Humanoid'),
        createMockMonster('Dragon', 15, 'Huge', 'Dragon'),
        createMockMonster('Orc', 1/2, 'Medium', 'Humanoid'),
        createMockMonster('Kobold', 1/8, 'Small', 'Humanoid'),
      ]);

      const filters = {
        sort: 'cr',
        source: { 'Monster Manual': true },
      };

      const { filteredMonsters } = useMonsterFilter(monsters, filters);

      const crs = filteredMonsters.value.map(m => m.cr.value);
      expect(crs).toEqual([1/8, 1/4, 1/2, 15]);
    });

    it('should sort monsters by size', () => {
      const monsters = ref([
        createMockMonster('Giant', 5, 'Huge', 'Giant'),
        createMockMonster('Goblin', 1/4, 'Small', 'Humanoid'),
        createMockMonster('Dragon', 15, 'Gargantuan', 'Dragon'),
        createMockMonster('Human', 0, 'Medium', 'Humanoid'),
      ]);

      const filters = {
        sort: 'size',
        source: { 'Monster Manual': true },
      };

      const { filteredMonsters } = useMonsterFilter(monsters, filters);

      const sizes = filteredMonsters.value.map(m => m.size);
      expect(sizes).toEqual(['Small', 'Medium', 'Huge', 'Gargantuan']);
    });

    it('should sort monsters by type alphabetically', () => {
      const monsters = ref([
        createMockMonster('Zombie', 1/4, 'Medium', 'Undead'),
        createMockMonster('Goblin', 1/4, 'Small', 'Humanoid'),
        createMockMonster('Dragon', 15, 'Huge', 'Dragon'),
        createMockMonster('Wolf', 1/4, 'Medium', 'Beast'),
      ]);

      const filters = {
        sort: 'type',
        source: { 'Monster Manual': true },
      };

      const { filteredMonsters } = useMonsterFilter(monsters, filters);

      const types = filteredMonsters.value.map(m => m.type);
      expect(types).toEqual(['Beast', 'Dragon', 'Humanoid', 'Undead']);
    });

    it('should sort monsters by alignment alphabetically', () => {
      const monsters = ref([
        createMockMonster('Devil', 10, 'Large', 'Fiend'),
        createMockMonster('Angel', 10, 'Large', 'Celestial'),
        createMockMonster('Zombie', 1, 'Medium', 'Undead'),
      ]);

      // Add different alignments
      monsters.value[0].alignment = { text: 'Lawful Evil' };
      monsters.value[1].alignment = { text: 'Lawful Good' };
      monsters.value[2].alignment = { text: 'Neutral Evil' };

      const filters = {
        sort: 'alignment',
        source: { 'Monster Manual': true },
      };

      const { filteredMonsters } = useMonsterFilter(monsters, filters);

      const alignments = filteredMonsters.value.map(m => m.alignment.text);
      expect(alignments).toEqual(['Lawful Evil', 'Lawful Good', 'Neutral Evil']);
    });
  });

  describe('monster filtering', () => {
    it('should filter by search text', () => {
      const monsters = ref([
        createMockMonster('Red Dragon', 15, 'Huge', 'Dragon'),
        createMockMonster('Blue Dragon', 15, 'Huge', 'Dragon'),
        createMockMonster('Goblin', 1/4, 'Small', 'Humanoid'),
      ]);

      const filters = {
        search: 'dragon',
        sort: 'name',
        source: { 'Monster Manual': true },
      };

      const { filteredMonsters } = useMonsterFilter(monsters, filters);

      expect(filteredMonsters.value).toHaveLength(2);
      expect(filteredMonsters.value[0].name).toBe('Blue Dragon');
      expect(filteredMonsters.value[1].name).toBe('Red Dragon');
    });

    it('should filter by CR range', () => {
      const monsters = ref([
        createMockMonster('Kobold', 1/8, 'Small', 'Humanoid'),
        createMockMonster('Goblin', 1/4, 'Small', 'Humanoid'),
        createMockMonster('Orc', 1/2, 'Medium', 'Humanoid'),
        createMockMonster('Ogre', 2, 'Large', 'Giant'),
        createMockMonster('Dragon', 15, 'Huge', 'Dragon'),
      ]);

      const filters = {
        minCr: 0.25, // 1/4
        maxCr: 2,
        sort: 'name',
        source: { 'Monster Manual': true },
      };

      const { filteredMonsters } = useMonsterFilter(monsters, filters);

      expect(filteredMonsters.value).toHaveLength(3);
      const names = filteredMonsters.value.map(m => m.name);
      expect(names).toEqual(['Goblin', 'Ogre', 'Orc']);
    });

    it('should filter by type', () => {
      const monsters = ref([
        createMockMonster('Goblin', 1/4, 'Small', 'Humanoid'),
        createMockMonster('Wolf', 1/4, 'Medium', 'Beast'),
        createMockMonster('Orc', 1/2, 'Medium', 'Humanoid'),
      ]);

      const filters = {
        type: 'Humanoid',
        sort: 'name',
        source: { 'Monster Manual': true },
      };

      const { filteredMonsters } = useMonsterFilter(monsters, filters);

      expect(filteredMonsters.value).toHaveLength(2);
      expect(filteredMonsters.value.every(m => m.type === 'Humanoid')).toBe(true);
    });

    it('should filter by size', () => {
      const monsters = ref([
        createMockMonster('Goblin', 1/4, 'Small', 'Humanoid'),
        createMockMonster('Human', 0, 'Medium', 'Humanoid'),
        createMockMonster('Giant', 5, 'Huge', 'Giant'),
      ]);

      const filters = {
        size: 'Small',
        sort: 'name',
        source: { 'Monster Manual': true },
      };

      const { filteredMonsters } = useMonsterFilter(monsters, filters);

      expect(filteredMonsters.value).toHaveLength(1);
      expect(filteredMonsters.value[0].name).toBe('Goblin');
    });
  });

  describe('hiddenCount', () => {
    it('should count monsters hidden by filters', () => {
      const monsters = ref([
        createMockMonster('Dragon', 15, 'Huge', 'Dragon'),
        createMockMonster('Kobold', 1/8, 'Small', 'Humanoid'),
        createMockMonster('Goblin', 1/4, 'Small', 'Humanoid'),
      ]);

      // Dragon won't match search, but Kobold and Goblin will
      // However, Kobold is filtered out by type filter
      const filters = {
        search: 'gob',
        type: 'Dragon',  // This filters out Kobold
        sort: 'name',
        source: { 'Monster Manual': true },
      };

      const { hiddenCount } = useMonsterFilter(monsters, filters);

      // Kobold matches search but is filtered out by type
      expect(hiddenCount.value).toBe(1);
    });
  });

  describe('environment/terrain filter edge cases', () => {
    it('should handle monsters with undefined environment', () => {
      const monsterWithoutEnv = {
        ...createMockMonster('Ghost', 4, 'Medium', 'Undead'),
        environment: undefined, // Some monsters have no environment
      };

      const monsters = ref([monsterWithoutEnv]);

      const filters = {
        environment: 'Forest',
        sort: 'name',
        source: { 'Monster Manual': true },
      };

      // Should not crash - just filter out the monster
      const { filteredMonsters } = useMonsterFilter(monsters, filters);
      expect(filteredMonsters.value).toHaveLength(0);
    });

    it('should filter by environment when monster has environment array', () => {
      const monsters = ref([
        createMockMonster('Wolf', 1/4, 'Medium', 'Beast'),
        createMockMonster('Reef Shark', 1/2, 'Medium', 'Beast'),
      ]);

      // Wolf has Forest, Shark doesn't
      monsters.value[1].environment = ['Underwater'];

      const filters = {
        environment: 'Forest',
        sort: 'name',
        source: { 'Monster Manual': true },
      };

      const { filteredMonsters } = useMonsterFilter(monsters, filters);

      expect(filteredMonsters.value).toHaveLength(1);
      expect(filteredMonsters.value[0].name).toBe('Wolf');
    });
  });
});
