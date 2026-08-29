import { describe, it, expect, beforeEach, vi } from 'vitest';
import { homebrew } from '../homebrew';
import type { HomebrewPack } from '../homebrew';

describe('HomebrewService', () => {
  const VALID_CSV = [
    'name,cr,size,type,tags,alignment,environment,ac,hp,sources',
    'Clockwork Hound,2,Medium,Construct,Clockwork,unaligned,urban,14,26,"My Brews: 7"',
    '"Grubb, the Unclean",1/2,Small,Humanoid,Goblinoid,chaotic evil,"cave, ruins",13,11,My Brews',
  ].join('\n');

  const mockStore = {
    get: vi.fn(),
    set: vi.fn(),
  };

  const mockMonsters = {
    addCustom: vi.fn(),
    removeCustom: vi.fn(),
    hasId: vi.fn(),
  };

  beforeEach(() => {
    // Clear packs
    homebrew.reset();

    // Reset mocks
    vi.clearAllMocks();
    mockStore.get.mockResolvedValue(null);
    // Make addCustom return the number of rows it receives
    mockMonsters.addCustom.mockImplementation((name: string, shortName: string, rows: any[]) => rows.length);
    mockMonsters.hasId.mockReturnValue(false);

    // Set dependencies
    homebrew.setDependencies({
      store: mockStore,
      monsters: mockMonsters,
    });
  });

  describe('importText', () => {
    it('should import valid CSV', () => {
      const result = homebrew.importText('My Brews.csv', VALID_CSV);

      expect(result.added).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it('should name pack after filename', () => {
      const result = homebrew.importText('My Brews.csv', VALID_CSV);
      expect(result.sourceName).toBe('My Brews');
    });

    it('should strip extension from filename', () => {
      const result = homebrew.importText('Custom Monsters.json', VALID_CSV);
      expect(result.sourceName).toBe('Custom Monsters');
    });

    it('should convert underscores and hyphens to spaces', () => {
      const result = homebrew.importText('my_custom-monsters.csv', VALID_CSV);
      expect(result.sourceName).toBe('my custom monsters');
    });

    it('should namespace fids to prevent collisions', () => {
      homebrew.importText('My Brews.csv', VALID_CSV);

      expect(homebrew.packs).toHaveLength(1);
      expect(homebrew.packs[0].rows[0].fid).toBe('homebrew.my-brews.clockwork-hound');
      expect(homebrew.packs[0].rows[1].fid).toBe('homebrew.my-brews.grubb-the-unclean');
    });

    it('should call monsters.addCustom with pack data', () => {
      homebrew.importText('My Brews.csv', VALID_CSV);

      expect(mockMonsters.addCustom).toHaveBeenCalledWith(
        'My Brews',
        'MB',
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Clockwork Hound',
            cr: '2',
          }),
        ])
      );
    });

    it('should persist pack to storage', () => {
      homebrew.importText('My Brews.csv', VALID_CSV);

      expect(mockStore.set).toHaveBeenCalledWith(
        '5em-homebrew',
        expect.arrayContaining([
          expect.objectContaining({
            name: 'My Brews',
            shortName: 'MB',
          }),
        ])
      );
    });

    it('should refuse to import same pack twice', () => {
      homebrew.importText('My Brews.csv', VALID_CSV);
      const result = homebrew.importText('My Brews.csv', VALID_CSV);

      expect(result.added).toBe(0);
      expect(result.errors).toContainEqual(expect.stringMatching(/already imported/i));
    });

    it('should handle page numbers in sources', () => {
      homebrew.importText('My Brews.csv', VALID_CSV);

      const hound = homebrew.packs[0].rows[0];
      expect(hound.sources).toBe('My Brews: 7');

      const grubb = homebrew.packs[0].rows[1];
      expect(grubb.sources).toBe('My Brews');
    });

    it('should generate short names from initials', () => {
      homebrew.importText('Custom Monster Pack.csv', VALID_CSV);
      expect(homebrew.packs[0].shortName).toBe('CMP');
    });

    it('should limit short names to 5 characters', () => {
      homebrew.importText('Really Long Pack Name Here.csv', VALID_CSV);
      expect(homebrew.packs[0].shortName).toBe('RLPNH');
    });

    it('should handle commas in quoted fields', () => {
      homebrew.importText('My Brews.csv', VALID_CSV);

      const grubb = homebrew.packs[0].rows.find((r) => r.name === 'Grubb, the Unclean');
      expect(grubb).toBeDefined();
      expect(grubb!.name).toBe('Grubb, the Unclean');
      expect(grubb!.environment).toBe('cave, ruins');
    });
  });

  describe('JSON import', () => {
    it('should accept JSON array', () => {
      const json = JSON.stringify([
        { name: 'Paper Golem', cr: '5', size: 'Large', type: 'Construct' },
      ]);

      const result = homebrew.importText('Folded.json', json);

      expect(result.added).toBe(1);
      expect(result.skipped).toBe(0);
      expect(homebrew.packs[0].rows[0].name).toBe('Paper Golem');
    });

    it('should accept JSON object with monsters array', () => {
      const json = JSON.stringify({
        monsters: [{ name: 'Test Monster', cr: '1', type: 'Beast' }],
      });

      const result = homebrew.importText('pack.json', json);

      expect(result.added).toBe(1);
      expect(homebrew.packs[0].rows[0].name).toBe('Test Monster');
    });

    it('should report unreadable JSON', () => {
      const result = homebrew.importText('broken.json', '[{"name": ');

      expect(result.added).toBe(0);
      expect(result.errors[0]).toMatch(/Could not read the file/);
    });
  });

  describe('validation', () => {
    it('should skip rows with missing name', () => {
      const csv = 'name,cr,type\n,3,Beast';
      const result = homebrew.importText('bad.csv', csv);

      expect(result.added).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.errors[0]).toMatch(/missing name/);
    });

    it('should skip rows with missing CR', () => {
      const csv = 'name,cr,type\nTest Monster,,Beast';
      const result = homebrew.importText('bad.csv', csv);

      expect(result.added).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.errors[0]).toMatch(/missing cr/);
    });

    it('should skip rows with unknown CR', () => {
      const csv = 'name,cr,type\nFine Thing,3,Beast\nBroken Thing,99,Beast';
      const result = homebrew.importText('bad.csv', csv);

      expect(result.added).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.errors[0]).toMatch(/Row 3.*unknown cr "99"/);
    });

    it('should skip rows with missing type', () => {
      const csv = 'name,cr,type\nNameless,3,';
      const result = homebrew.importText('bad.csv', csv);

      expect(result.added).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.errors[0]).toMatch(/missing type/);
    });

    it('should reject unknown size', () => {
      const csv = 'name,cr,size,type\nOdd One,3,Enormous,Beast';
      const result = homebrew.importText('bad.csv', csv);

      expect(result.skipped).toBe(1);
      expect(result.errors[0]).toMatch(/unknown size "Enormous"/);
    });

    it('should default to Medium size if not specified', () => {
      const csv = 'name,cr,type\nTest,1,Beast';
      homebrew.importText('test.csv', csv);

      expect(homebrew.packs[0].rows[0].size).toBe('Medium');
    });

    it('should default to unaligned if alignment not specified', () => {
      const csv = 'name,cr,type\nTest,1,Beast';
      homebrew.importText('test.csv', csv);

      expect(homebrew.packs[0].rows[0].alignment).toBe('unaligned');
    });

    it('should report empty file', () => {
      const result = homebrew.importText('empty.csv', 'name,cr,type\n');

      expect(result.added).toBe(0);
      expect(result.errors[0]).toMatch(/No rows found/);
    });

    it('should skip duplicate monsters within same import', () => {
      const csv = 'name,cr,type\nDouble Trouble,3,Beast\nDouble Trouble,4,Beast';
      const result = homebrew.importText('dupes.csv', csv);

      expect(result.added).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.errors[0]).toMatch(/Duplicate monster/);
    });

    it('should skip monsters that collide with existing monsters', () => {
      mockMonsters.hasId.mockImplementation((id: string) => id === 'homebrew.test.existing-monster');

      const csv = 'name,cr,type\nExisting Monster,1,Beast\nNew Monster,1,Beast';
      const result = homebrew.importText('test.csv', csv);

      expect(result.added).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.errors[0]).toMatch(/Duplicate monster "Existing Monster"/);
    });

    it('should parse truthy values correctly', () => {
      const csv = 'name,cr,type,legendary,lair,unique\n' +
        'Mon1,1,Beast,1,yes,true\n' +
        'Mon2,1,Beast,y,legendary,unique\n' +
        'Mon3,1,Beast,0,no,false';

      homebrew.importText('test.csv', csv);

      const rows = homebrew.packs[0].rows;
      expect(rows[0].legendary).toBe(1);
      expect(rows[0].lair).toBe(1);
      expect(rows[0].unique).toBe(1);

      expect(rows[1].legendary).toBe(1);
      expect(rows[1].lair).toBe(1);
      expect(rows[1].unique).toBe(1);

      expect(rows[2].legendary).toBe(0);
      expect(rows[2].lair).toBe(0);
      expect(rows[2].unique).toBe(0);
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      homebrew.importText('My Brews.csv', VALID_CSV);
      vi.clearAllMocks();
    });

    it('should remove pack', () => {
      const result = homebrew.remove('My Brews');

      expect(result).toBe(true);
      expect(homebrew.packs).toHaveLength(0);
    });

    it('should call monsters.removeCustom', () => {
      homebrew.remove('My Brews');

      expect(mockMonsters.removeCustom).toHaveBeenCalledWith('My Brews');
    });

    it('should persist changes', () => {
      homebrew.remove('My Brews');

      expect(mockStore.set).toHaveBeenCalledWith('5em-homebrew', []);
    });

    it('should return false for non-existent pack', () => {
      const result = homebrew.remove('Non Existent');

      expect(result).toBe(false);
      expect(homebrew.packs).toHaveLength(1);
    });
  });

  describe('restore', () => {
    const PACK: HomebrewPack = {
      name: 'Saved Brews',
      shortName: 'SB',
      rows: [
        {
          fid: 'homebrew.saved-brews.tin-soldier',
          guid: '',
          name: 'Tin Soldier',
          section: '',
          ac: '12',
          hp: '9',
          init: '',
          cr: '1',
          type: 'Construct',
          size: 'Small',
          alignment: 'unaligned',
          legendary: 0,
          lair: 0,
          unique: 0,
          special: 0,
          tags: '',
          environment: '',
          sources: 'Saved Brews',
        },
      ],
    };

    it('should restore packs from storage', async () => {
      mockStore.get.mockResolvedValue([PACK]);

      const count = await homebrew.restore();

      expect(count).toBe(1);
      expect(homebrew.packs).toHaveLength(1);
      expect(homebrew.packs[0].name).toBe('Saved Brews');
    });

    it('should call monsters.addCustom for each pack', async () => {
      mockStore.get.mockResolvedValue([PACK]);

      await homebrew.restore();

      expect(mockMonsters.addCustom).toHaveBeenCalledWith(
        'Saved Brews',
        'SB',
        PACK.rows
      );
    });

    it('should survive corrupt stored value', async () => {
      mockStore.get.mockRejectedValue(new Error('unparseable'));

      const count = await homebrew.restore();

      expect(count).toBe(0);
      expect(homebrew.packs).toHaveLength(0);
    });

    it('should skip invalid packs', async () => {
      mockStore.get.mockResolvedValue([
        null,
        { name: 'Valid', shortName: 'V', rows: [] },
        { name: null }, // Invalid: missing name
        { rows: [] }, // Invalid: missing name
      ]);

      const count = await homebrew.restore();

      expect(count).toBe(1);
      expect(homebrew.packs).toHaveLength(1);
    });

    it('should handle null stored value', async () => {
      mockStore.get.mockResolvedValue(null);

      const count = await homebrew.restore();

      expect(count).toBe(0);
      expect(homebrew.packs).toHaveLength(0);
    });
  });

  describe('budget checks', () => {
    it('should reject packs that are too large', () => {
      // Create a CSV with lots of monsters to exceed 1MB
      const largeName = 'A'.repeat(10000);
      const rows = Array.from({ length: 200 }, (_, i) =>
        `Monster ${i},1,Medium,Beast,${largeName},unaligned,forest,10,10,Source`
      );
      const csv = `name,cr,size,type,tags,alignment,environment,ac,hp,sources\n${rows.join('\n')}`;

      const result = homebrew.importText('huge.csv', csv);

      expect(result.added).toBe(0);
      expect(result.errors[0]).toMatch(/too large to store/);
    });

    it('should reject packs when total storage would exceed limit', () => {
      // Import multiple large packs to approach the 2MB total limit
      // Each pack should be under 1MB but total should exceed 2MB
      const createLargePack = (packNum: number) => {
        const hugeName = 'X'.repeat(10000); // Very large tags field
        const rows = Array.from({ length: 100 }, (_, i) =>
          `Monster${packNum}_${i},1,Medium,Beast,${hugeName},unaligned,forest,10,10,Source`
        );
        return `name,cr,size,type,tags,alignment,environment,ac,hp,sources\n${rows.join('\n')}`;
      };

      // Import first pack (under 1MB)
      homebrew.importText('Pack1.csv', createLargePack(1));
      expect(homebrew.packs).toHaveLength(1);

      // Import second pack (total approaching 2MB)
      homebrew.importText('Pack2.csv', createLargePack(2));
      expect(homebrew.packs).toHaveLength(2);

      // Third pack should exceed 2MB total budget
      const result = homebrew.importText('Pack3.csv', createLargePack(3));

      expect(result.added).toBe(0);
      expect(result.errors[0]).toMatch(/Not enough room/);
    });
  });

  describe('helper methods', () => {
    it('should create valid slugs', () => {
      const slug = (homebrew as any).slug;

      expect(slug('Test Monster')).toBe('test-monster');
      expect(slug("Grubb's Dragon")).toBe('grubbs-dragon');
      expect(slug('Multiple   Spaces')).toBe('multiple-spaces');
      expect(slug('-Leading-and-trailing-')).toBe('leading-and-trailing');
      expect(slug('Special!@#$%Characters')).toBe('special-characters');
    });

    it('should extract page suffix from sources', () => {
      const pageSuffix = (homebrew as any).pageSuffix;

      expect(pageSuffix('Book: 42')).toBe(': 42');
      expect(pageSuffix('Book:123')).toBe(': 123');
      expect(pageSuffix('Book')).toBe('');
      expect(pageSuffix('')).toBe('');
      expect(pageSuffix(null)).toBe('');
    });
  });

  describe('packs getter', () => {
    it('should return current packs', () => {
      expect(homebrew.packs).toEqual([]);

      homebrew.importText('Test.csv', VALID_CSV);

      expect(homebrew.packs).toHaveLength(1);
      expect(homebrew.packs[0].name).toBe('Test');
    });
  });

  describe('BOM handling', () => {
    it('should strip UTF-8 BOM from CSV', () => {
      const csvWithBOM = '\uFEFF' + VALID_CSV;
      const result = homebrew.importText('test.csv', csvWithBOM);

      expect(result.added).toBe(2);
      expect(result.errors).toEqual([]);
    });
  });
});
