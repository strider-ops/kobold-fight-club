import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { useMonsterFilter } from '../useMonsterFilter';
import { monsterFactory } from '@/services/monsterFactory';
import { metaInfo } from '@/services/metaInfo';

// Mock library service
const mockLibrary = vi.hoisted(() => ({ encounters: [] as any[] }));
vi.mock('@/services/library', () => ({
  library: mockLibrary,
}));

describe('useMonsterFilter', () => {
  beforeEach(() => {
    mockLibrary.encounters = [];
  });

  const createMockMonster = (name: string, cr: number, size: string, type: string) => ({
    id: name.toLowerCase().replace(/\s/g, '-'),
    name,
    cr: { string: cr.toString(), value: cr },
    size,
    sizeSort: { Tiny: 0, Small: 1, Medium: 2, Large: 3, Huge: 4, Gargantuan: 5 }[size] || 2,
    type,
    alignment: { text: 'Neutral', tags: [], flags: 0 },
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
      monsters.value[0].alignment = { text: 'Lawful Evil', tags: [], flags: 0 };
      monsters.value[1].alignment = { text: 'Lawful Good', tags: [], flags: 0 };
      monsters.value[2].alignment = { text: 'Neutral Evil', tags: [], flags: 0 };

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

  // Every SearchForm.vue filter control gets its own describe block below,
  // exercised through real monsterFactory/metaInfo objects (not hand-rolled
  // mocks) so the option value types match production exactly. This is a
  // regression suite for the bug where minCr/maxCr defaulted to '' but were
  // checked with `!= null` (true for ''), and alignment objects were missing
  // their `flags` field entirely - both silently filtered out everything.
  describe('Min CR filter (number field, default "")', () => {
    const monsters = ref([
      monsterFactory.createMonster({ name: 'Rat', cr: '0', sources: 'Monster Manual' }),
      monsterFactory.createMonster({ name: 'Kobold', cr: '1/8', sources: 'Monster Manual' }),
      monsterFactory.createMonster({ name: 'Goblin', cr: '1/4', sources: 'Monster Manual' }),
      monsterFactory.createMonster({ name: 'Dragon', cr: '15', sources: 'Monster Manual' }),
    ]);
    const baseFilters = { sort: 'name', source: { 'Monster Manual': true } };

    it('does not filter anything when left at its default empty string', () => {
      const filters = { ...baseFilters, minCr: '', maxCr: '' };
      const { filteredMonsters } = useMonsterFilter(monsters, filters);
      expect(filteredMonsters.value).toHaveLength(4);
    });

    it('excludes monsters below the selected CR when used alone (maxCr left at default)', () => {
      const filters = { ...baseFilters, minCr: metaInfo.crList[1].value, maxCr: '' }; // 1/8
      const { filteredMonsters } = useMonsterFilter(monsters, filters);
      expect(filteredMonsters.value.map(m => m.name)).toEqual(['Dragon', 'Goblin', 'Kobold']);
    });

    it('is inclusive at the boundary (monster exactly at minCr is kept)', () => {
      const filters = { ...baseFilters, minCr: 0.125, maxCr: '' };
      const { filteredMonsters } = useMonsterFilter(monsters, filters);
      expect(filteredMonsters.value.map(m => m.name)).toContain('Kobold');
    });
  });

  describe('Max CR filter (number field, default "")', () => {
    const monsters = ref([
      monsterFactory.createMonster({ name: 'Rat', cr: '0', sources: 'Monster Manual' }),
      monsterFactory.createMonster({ name: 'Kobold', cr: '1/8', sources: 'Monster Manual' }),
      monsterFactory.createMonster({ name: 'Goblin', cr: '1/4', sources: 'Monster Manual' }),
      monsterFactory.createMonster({ name: 'Dragon', cr: '15', sources: 'Monster Manual' }),
    ]);
    const baseFilters = { sort: 'name', source: { 'Monster Manual': true } };

    it('excludes monsters above the selected CR when used alone (minCr left at default)', () => {
      const filters = { ...baseFilters, minCr: '', maxCr: metaInfo.crList[1].value }; // 1/8
      const { filteredMonsters } = useMonsterFilter(monsters, filters);
      expect(filteredMonsters.value.map(m => m.name)).toEqual(['Kobold', 'Rat']);
    });

    it('is inclusive at the boundary (monster exactly at maxCr is kept)', () => {
      const filters = { ...baseFilters, minCr: '', maxCr: 0.125 };
      const { filteredMonsters } = useMonsterFilter(monsters, filters);
      expect(filteredMonsters.value.map(m => m.name)).toContain('Kobold');
    });

    it('combined with minCr narrows to an exact CR range', () => {
      const filters = { ...baseFilters, minCr: 0.125, maxCr: 0.125 };
      const { filteredMonsters } = useMonsterFilter(monsters, filters);
      expect(filteredMonsters.value.map(m => m.name)).toEqual(['Kobold']);
    });
  });

  describe('Alignment filter (object field bound to metaInfo.alignments, default "")', () => {
    const lawfulGood = monsterFactory.createMonster({ name: 'Paladin', alignment: 'lawful good', sources: 'Monster Manual' });
    const chaoticEvil = monsterFactory.createMonster({ name: 'Demon', alignment: 'chaotic evil', sources: 'Monster Manual' });
    const unaligned = monsterFactory.createMonster({ name: 'Zombie', alignment: 'unaligned', sources: 'Monster Manual' });
    const monsters = ref([lawfulGood, chaoticEvil, unaligned]);
    const baseFilters = { sort: 'name', source: { 'Monster Manual': true } };

    it('does not filter anything when left at its default empty string', () => {
      const filters = { ...baseFilters, alignment: '' };
      const { filteredMonsters } = useMonsterFilter(monsters, filters);
      expect(filteredMonsters.value).toHaveLength(3);
    });

    it('matches only monsters sharing a flag bit with a specific alignment', () => {
      const filters = { ...baseFilters, alignment: metaInfo.alignments.lg };
      const { filteredMonsters } = useMonsterFilter(monsters, filters);
      expect(filteredMonsters.value.map(m => m.name)).toEqual(['Paladin']);
    });

    it('"any" matches every aligned monster but excludes unaligned', () => {
      const filters = { ...baseFilters, alignment: metaInfo.alignments.any };
      const { filteredMonsters } = useMonsterFilter(monsters, filters);
      expect(filteredMonsters.value.map(m => m.name)).toEqual(['Demon', 'Paladin']);
    });

    it('"unaligned" matches only the unaligned monster', () => {
      const filters = { ...baseFilters, alignment: metaInfo.alignments.unaligned };
      const { filteredMonsters } = useMonsterFilter(monsters, filters);
      expect(filteredMonsters.value.map(m => m.name)).toEqual(['Zombie']);
    });

    it('"any_evil" matches chaotic evil but not lawful good', () => {
      const filters = { ...baseFilters, alignment: metaInfo.alignments.any_evil };
      const { filteredMonsters } = useMonsterFilter(monsters, filters);
      expect(filteredMonsters.value.map(m => m.name)).toEqual(['Demon']);
    });
  });

  describe('Type filter (string field, default "")', () => {
    it('does not filter anything when left at its default empty string', () => {
      const monsters = ref([
        createMockMonster('Goblin', 1/4, 'Small', 'Humanoid'),
        createMockMonster('Wolf', 1/4, 'Medium', 'Beast'),
      ]);
      const filters = { type: '', sort: 'name', source: { 'Monster Manual': true } };
      const { filteredMonsters } = useMonsterFilter(monsters, filters);
      expect(filteredMonsters.value).toHaveLength(2);
    });
  });

  describe('Size filter (string field, default "")', () => {
    it('does not filter anything when left at its default empty string', () => {
      const monsters = ref([
        createMockMonster('Goblin', 1/4, 'Small', 'Humanoid'),
        createMockMonster('Giant', 5, 'Huge', 'Giant'),
      ]);
      const filters = { size: '', sort: 'name', source: { 'Monster Manual': true } };
      const { filteredMonsters } = useMonsterFilter(monsters, filters);
      expect(filteredMonsters.value).toHaveLength(2);
    });
  });

  describe('Legendary filter (string field, default "")', () => {
    const monsters = ref([
      { ...createMockMonster('Commoner', 0, 'Medium', 'Humanoid'), legendary: false, lair: false },
      { ...createMockMonster('Ancient Dragon', 20, 'Gargantuan', 'Dragon'), legendary: true, lair: false },
      { ...createMockMonster('Lich', 21, 'Medium', 'Undead'), legendary: false, lair: true },
    ]);
    const baseFilters = { sort: 'name', source: { 'Monster Manual': true } };

    it('does not filter anything when left at its default empty string', () => {
      const filters = { ...baseFilters, legendary: '' };
      const { filteredMonsters } = useMonsterFilter(monsters, filters);
      expect(filteredMonsters.value).toHaveLength(3);
    });

    it('"Ordinary" keeps only non-legendary, non-lair monsters', () => {
      const filters = { ...baseFilters, legendary: 'Ordinary' };
      const { filteredMonsters } = useMonsterFilter(monsters, filters);
      expect(filteredMonsters.value.map(m => m.name)).toEqual(['Commoner']);
    });

    it('"Legendary" keeps only legendary monsters', () => {
      const filters = { ...baseFilters, legendary: 'Legendary' };
      const { filteredMonsters } = useMonsterFilter(monsters, filters);
      expect(filteredMonsters.value.map(m => m.name)).toEqual(['Ancient Dragon']);
    });

    it('"Legendary (in lair)" keeps only lair monsters', () => {
      const filters = { ...baseFilters, legendary: 'Legendary (in lair)' };
      const { filteredMonsters } = useMonsterFilter(monsters, filters);
      expect(filteredMonsters.value.map(m => m.name)).toEqual(['Lich']);
    });
  });

  describe('Environment/terrain filter (string field, default "")', () => {
    it('does not filter anything when left at its default empty string', () => {
      const monsters = ref([
        createMockMonster('Wolf', 1/4, 'Medium', 'Beast'),
        { ...createMockMonster('Shark', 1/2, 'Medium', 'Beast'), environment: ['Underwater'] },
      ]);
      const filters = { environment: '', sort: 'name', source: { 'Monster Manual': true } };
      const { filteredMonsters } = useMonsterFilter(monsters, filters);
      expect(filteredMonsters.value).toHaveLength(2);
    });
  });

  describe('Source filter (checkbox record field)', () => {
    it('excludes monsters whose only source is unchecked', () => {
      const monsters = ref([
        { ...createMockMonster('SRD Goblin', 1/4, 'Small', 'Humanoid'), sources: [{ name: 'Monster Manual' }] },
        { ...createMockMonster('Homebrew Beast', 1, 'Medium', 'Beast'), sources: [{ name: 'Homebrew' }] },
      ]);
      const filters = { sort: 'name', source: { 'Monster Manual': true, Homebrew: false } };
      const { filteredMonsters } = useMonsterFilter(monsters, filters);
      expect(filteredMonsters.value.map(m => m.name)).toEqual(['SRD Goblin']);
    });

    it('includes a monster if any one of its sources is checked', () => {
      const monsters = ref([
        {
          ...createMockMonster('Multi-source Monster', 1, 'Medium', 'Beast'),
          sources: [{ name: 'Homebrew' }, { name: 'Monster Manual' }],
        },
      ]);
      const filters = { sort: 'name', source: { 'Monster Manual': true, Homebrew: false } };
      const { filteredMonsters } = useMonsterFilter(monsters, filters);
      expect(filteredMonsters.value).toHaveLength(1);
    });
  });

  describe('Pool/table filter (string field referencing a saved pool)', () => {
    it('does not filter anything when left at its default empty string', () => {
      const monsters = ref([createMockMonster('Goblin', 1/4, 'Small', 'Humanoid')]);
      const filters = { pool: '', sort: 'name', source: { 'Monster Manual': true } };
      const { filteredMonsters } = useMonsterFilter(monsters, filters);
      expect(filteredMonsters.value).toHaveLength(1);
    });

    it('keeps only monsters present in the named saved pool', () => {
      const goblin = createMockMonster('Goblin', 1/4, 'Small', 'Humanoid');
      const wolf = createMockMonster('Wolf', 1/4, 'Medium', 'Beast');
      mockLibrary.encounters = [
        { type: 'pool', name: 'My Table', groups: { [goblin.id]: { qty: 1 } } },
      ];
      const monsters = ref([goblin, wolf]);
      const filters = { pool: 'My Table', sort: 'name', source: { 'Monster Manual': true } };
      const { filteredMonsters } = useMonsterFilter(monsters, filters);
      expect(filteredMonsters.value.map(m => m.name)).toEqual(['Goblin']);
    });
  });

  describe('Search text box (string field, default "")', () => {
    it('does not filter anything when left at its default empty string', () => {
      const monsters = ref([
        createMockMonster('Goblin', 1/4, 'Small', 'Humanoid'),
        createMockMonster('Wolf', 1/4, 'Medium', 'Beast'),
      ]);
      const filters = { search: '', sort: 'name', source: { 'Monster Manual': true } };
      const { filteredMonsters } = useMonsterFilter(monsters, filters);
      expect(filteredMonsters.value).toHaveLength(2);
    });

    it('supports plain substring search (case-insensitive)', () => {
      const monsters = ref([
        createMockMonster('Red Dragon', 15, 'Huge', 'Dragon'),
        createMockMonster('Goblin', 1/4, 'Small', 'Humanoid'),
      ]);
      const filters = { search: 'DRAGON', sort: 'name', source: { 'Monster Manual': true } };
      const { filteredMonsters } = useMonsterFilter(monsters, filters);
      expect(filteredMonsters.value.map(m => m.name)).toEqual(['Red Dragon']);
    });

    it('supports /regex/ search syntax', () => {
      const monsters = ref([
        createMockMonster('Red Dragon', 15, 'Huge', 'Dragon'),
        createMockMonster('Blue Dragon', 15, 'Huge', 'Dragon'),
        createMockMonster('Goblin', 1/4, 'Small', 'Humanoid'),
      ]);
      const filters = { search: '/^red/', sort: 'name', source: { 'Monster Manual': true } };
      const { filteredMonsters } = useMonsterFilter(monsters, filters);
      expect(filteredMonsters.value.map(m => m.name)).toEqual(['Red Dragon']);
    });
  });
});
