import { describe, it, expect } from 'vitest';
import { parse, toObjects } from '../csv';

describe('CSV Service', () => {
  describe('parse', () => {
    it('should parse simple CSV', () => {
      const result = parse('a,b,c\n1,2,3');
      expect(result).toEqual([
        ['a', 'b', 'c'],
        ['1', '2', '3'],
      ]);
    });

    it('should handle quoted fields', () => {
      const result = parse('name,value\n"John Doe",42');
      expect(result).toEqual([
        ['name', 'value'],
        ['John Doe', '42'],
      ]);
    });

    it('should handle commas inside quoted fields', () => {
      const result = parse('name,description\n"Smith, John","A person"');
      expect(result).toEqual([
        ['name', 'description'],
        ['Smith, John', 'A person'],
      ]);
    });

    it('should handle newlines inside quoted fields', () => {
      const result = parse('name,bio\n"John","Line 1\nLine 2"');
      expect(result).toEqual([
        ['name', 'bio'],
        ['John', 'Line 1\nLine 2'],
      ]);
    });

    it('should handle doubled quotes as escaped quotes', () => {
      const result = parse('name,quote\n"John","He said ""hi"""');
      expect(result).toEqual([
        ['name', 'quote'],
        ['John', 'He said "hi"'],
      ]);
    });

    it('should handle empty fields', () => {
      const result = parse('a,b,c\n1,,3');
      expect(result).toEqual([
        ['a', 'b', 'c'],
        ['1', '', '3'],
      ]);
    });

    it('should handle CRLF line endings', () => {
      const result = parse('a,b\r\n1,2\r\n3,4');
      expect(result).toEqual([
        ['a', 'b'],
        ['1', '2'],
        ['3', '4'],
      ]);
    });

    it('should handle empty CSV', () => {
      const result = parse('');
      expect(result).toEqual([]);
    });

    it('should handle single row', () => {
      const result = parse('a,b,c');
      expect(result).toEqual([['a', 'b', 'c']]);
    });

    it('should handle trailing newline', () => {
      const result = parse('a,b\n1,2\n');
      expect(result).toEqual([
        ['a', 'b'],
        ['1', '2'],
      ]);
    });

    it('should handle complex example from homebrew tests', () => {
      const csv = [
        'name,cr,size,type,tags,alignment,environment,ac,hp,sources',
        'Clockwork Hound,2,Medium,Construct,Clockwork,unaligned,urban,14,26,"My Brews: 7"',
        '"Grubb, the Unclean",1/2,Small,Humanoid,Goblinoid,chaotic evil,"cave, ruins",13,11,My Brews',
      ].join('\n');

      const result = parse(csv);

      expect(result[0]).toEqual([
        'name',
        'cr',
        'size',
        'type',
        'tags',
        'alignment',
        'environment',
        'ac',
        'hp',
        'sources',
      ]);
      expect(result[1]).toEqual([
        'Clockwork Hound',
        '2',
        'Medium',
        'Construct',
        'Clockwork',
        'unaligned',
        'urban',
        '14',
        '26',
        'My Brews: 7',
      ]);
      expect(result[2]).toEqual([
        'Grubb, the Unclean',
        '1/2',
        'Small',
        'Humanoid',
        'Goblinoid',
        'chaotic evil',
        'cave, ruins',
        '13',
        '11',
        'My Brews',
      ]);
    });
  });

  describe('toObjects', () => {
    it('should convert rows to objects using first row as header', () => {
      const rows = [
        ['name', 'age'],
        ['John', '30'],
        ['Jane', '25'],
      ];

      const result = toObjects(rows);

      expect(result).toEqual([
        { name: 'John', age: '30' },
        { name: 'Jane', age: '25' },
      ]);
    });

    it('should trim header values', () => {
      const rows = [
        [' name ', ' age '],
        ['John', '30'],
      ];

      const result = toObjects(rows);

      expect(result).toEqual([{ name: 'John', age: '30' }]);
    });

    it('should trim cell values', () => {
      const rows = [
        ['name', 'age'],
        [' John ', ' 30 '],
      ];

      const result = toObjects(rows);

      expect(result).toEqual([{ name: 'John', age: '30' }]);
    });

    it('should filter out blank rows', () => {
      const rows = [
        ['name', 'age'],
        ['John', '30'],
        ['', ''],
        ['Jane', '25'],
      ];

      const result = toObjects(rows);

      expect(result).toEqual([
        { name: 'John', age: '30' },
        { name: 'Jane', age: '25' },
      ]);
    });

    it('should handle missing values as empty strings', () => {
      const rows = [
        ['name', 'age', 'city'],
        ['John', '30'],
        ['Jane', '', 'NYC'],
      ];

      const result = toObjects(rows);

      expect(result).toEqual([
        { name: 'John', age: '30', city: '' },
        { name: 'Jane', age: '', city: 'NYC' },
      ]);
    });

    it('should handle null and undefined as empty strings', () => {
      const rows = [
        ['name', 'age'],
        ['John', null as any],
        ['Jane', undefined as any],
      ];

      const result = toObjects(rows);

      expect(result).toEqual([
        { name: 'John', age: '' },
        { name: 'Jane', age: '' },
      ]);
    });

    it('should return empty array for empty input', () => {
      const result = toObjects([]);
      expect(result).toEqual([]);
    });

    it('should return empty array for header-only input', () => {
      const result = toObjects([['name', 'age']]);
      expect(result).toEqual([]);
    });

    it('should handle complex homebrew example', () => {
      const csv = [
        'name,cr,size,type,tags,alignment,environment,ac,hp,sources',
        'Clockwork Hound,2,Medium,Construct,Clockwork,unaligned,urban,14,26,"My Brews: 7"',
        '"Grubb, the Unclean",1/2,Small,Humanoid,Goblinoid,chaotic evil,"cave, ruins",13,11,My Brews',
      ].join('\n');

      const rows = parse(csv);
      const result = toObjects(rows);

      expect(result).toEqual([
        {
          name: 'Clockwork Hound',
          cr: '2',
          size: 'Medium',
          type: 'Construct',
          tags: 'Clockwork',
          alignment: 'unaligned',
          environment: 'urban',
          ac: '14',
          hp: '26',
          sources: 'My Brews: 7',
        },
        {
          name: 'Grubb, the Unclean',
          cr: '1/2',
          size: 'Small',
          type: 'Humanoid',
          tags: 'Goblinoid',
          alignment: 'chaotic evil',
          environment: 'cave, ruins',
          ac: '13',
          hp: '11',
          sources: 'My Brews',
        },
      ]);
    });
  });
});
