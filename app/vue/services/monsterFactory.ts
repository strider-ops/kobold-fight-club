/**
 * Monster Factory Service
 *
 * Creates and validates Monster objects from raw database/import data.
 * Includes CR info, alignment parsing, and filtering logic.
 */

import type {
  Monster,
  ChallengeRating,
  Alignment,
  MonsterRow,
  MonsterSource,
  SearchFilters,
} from '@/types';

// ============================================================================
// Challenge Rating Data (from app/meta/crInfo.js)
// ============================================================================

export const CR_INFO: Record<string, ChallengeRating> = {
  '0':    { string: '0',    text: '0',    value: 0,     exp: 10 },
  '1/8':  { string: '1/8',  text: '1/8',  value: 0.125, exp: 25 },
  '1/4':  { string: '1/4',  text: '1/4',  value: 0.25,  exp: 50 },
  '1/2':  { string: '1/2',  text: '1/2',  value: 0.5,   exp: 100 },
  '1':    { string: '1',    text: '1',    value: 1,     exp: 200 },
  '2':    { string: '2',    text: '2',    value: 2,     exp: 450 },
  '3':    { string: '3',    text: '3',    value: 3,     exp: 700 },
  '4':    { string: '4',    text: '4',    value: 4,     exp: 1100 },
  '5':    { string: '5',    text: '5',    value: 5,     exp: 1800 },
  '6':    { string: '6',    text: '6',    value: 6,     exp: 2300 },
  '7':    { string: '7',    text: '7',    value: 7,     exp: 2900 },
  '8':    { string: '8',    text: '8',    value: 8,     exp: 3900 },
  '9':    { string: '9',    text: '9',    value: 9,     exp: 5000 },
  '10':   { string: '10',   text: '10',   value: 10,    exp: 5900 },
  '11':   { string: '11',   text: '11',   value: 11,    exp: 7200 },
  '12':   { string: '12',   text: '12',   value: 12,    exp: 8400 },
  '13':   { string: '13',   text: '13',   value: 13,    exp: 10000 },
  '14':   { string: '14',   text: '14',   value: 14,    exp: 11500 },
  '15':   { string: '15',   text: '15',   value: 15,    exp: 13000 },
  '16':   { string: '16',   text: '16',   value: 16,    exp: 15000 },
  '17':   { string: '17',   text: '17',   value: 17,    exp: 18000 },
  '18':   { string: '18',   text: '18',   value: 18,    exp: 20000 },
  '19':   { string: '19',   text: '19',   value: 19,    exp: 22000 },
  '20':   { string: '20',   text: '20',   value: 20,    exp: 25000 },
  '21':   { string: '21',   text: '21',   value: 21,    exp: 33000 },
  '22':   { string: '22',   text: '22',   value: 22,    exp: 41000 },
  '23':   { string: '23',   text: '23',   value: 23,    exp: 50000 },
  '24':   { string: '24',   text: '24',   value: 24,    exp: 62000 },
  '25':   { string: '25',   text: '25',   value: 25,    exp: 75000 },
  '26':   { string: '26',   text: '26',   value: 26,    exp: 90000 },
  '27':   { string: '27',   text: '27',   value: 27,    exp: 105000 },
  '28':   { string: '28',   text: '28',   value: 28,    exp: 120000 },
  '29':   { string: '29',   text: '29',   value: 29,    exp: 135000 },
  '30':   { string: '30',   text: '30',   value: 30,    exp: 155000 },
};

// ============================================================================
// Alignment Data (from app/meta/alignments.js)
// ============================================================================

// Alignment flags using bit flags
const LG = Math.pow(2, 0);  // 1
const NG = Math.pow(2, 1);  // 2
const CG = Math.pow(2, 2);  // 4
const LN = Math.pow(2, 3);  // 8
const N  = Math.pow(2, 4);  // 16
const CN = Math.pow(2, 5);  // 32
const LE = Math.pow(2, 6);  // 64
const NE = Math.pow(2, 7);  // 128
const CE = Math.pow(2, 8);  // 256
const UNALIGNED = Math.pow(2, 9);  // 512

interface AlignmentDefinition {
  text: string;
  flags: number;
  regex: RegExp;
}

export const ALIGNMENTS: Record<string, AlignmentDefinition> = {
  any:          { text: 'any',           flags: LG | NG | CG | LN | N | CN | LE | NE | CE, regex: /any/i },
  any_chaotic:  { text: 'any chaotic',   flags: CG | CN | CE, regex: /any[- ]?chaotic/i },
  any_evil:     { text: 'any evil',      flags: LE | NE | CE, regex: /any[- ]?evil/i },
  any_good:     { text: 'any good',      flags: LG | NG | CG, regex: /any[- ]?good/i },
  any_lawful:   { text: 'any lawful',    flags: LG | LN | LE, regex: /any[- ]?lawful/i },
  any_neutral:  { text: 'any neutral',   flags: NG | LN | N | CN | NE, regex: /any[- ]?neutral/i },
  non_chaotic:  { text: 'non-chaotic',   flags: LG | NG | LN | N | LE | NE | UNALIGNED, regex: /non[- ]?chaotic/i },
  non_evil:     { text: 'non-evil',      flags: LG | NG | CG | LN | N | CN | UNALIGNED, regex: /non[- ]?evil/i },
  non_good:     { text: 'non-good',      flags: LN | N | CN | LE | NE | CE | UNALIGNED, regex: /non[- ]?good/i },
  non_lawful:   { text: 'non-lawful',    flags: NG | CG | N | CN | NE | CE | UNALIGNED, regex: /non[- ]?lawful/i },
  unaligned:    { text: 'unaligned',     flags: UNALIGNED, regex: /unaligned/i },
  lg:           { text: 'lawful good',   flags: LG, regex: /lawful[- ]?good/i },
  ng:           { text: 'neutral good',  flags: NG, regex: /neutral[- ]?good/i },
  cg:           { text: 'chaotic good',  flags: CG, regex: /chaotic[- ]?good/i },
  ln:           { text: 'lawful neutral', flags: LN, regex: /lawful[- ]?neutral/i },
  n:            { text: 'neutral',       flags: N, regex: /neutral/i },
  cn:           { text: 'chaotic neutral', flags: CN, regex: /chaotic[- ]?neutral/i },
  le:           { text: 'lawful evil',   flags: LE, regex: /lawful[- ]?evil/i },
  ne:           { text: 'neutral evil',  flags: NE, regex: /neutral[- ]?evil/i },
  ce:           { text: 'chaotic evil',  flags: CE, regex: /chaotic[- ]?evil/i },
};

// Check "neutral" and "any" last, since those are substrings found in more specific alignments
const ALIGNMENT_TEST_ORDER: AlignmentDefinition[] = [
  ALIGNMENTS.any_chaotic,
  ALIGNMENTS.any_evil,
  ALIGNMENTS.any_good,
  ALIGNMENTS.any_lawful,
  ALIGNMENTS.any_neutral,
  ALIGNMENTS.non_chaotic,
  ALIGNMENTS.non_evil,
  ALIGNMENTS.non_good,
  ALIGNMENTS.non_lawful,
  ALIGNMENTS.unaligned,
  ALIGNMENTS.lg,
  ALIGNMENTS.ng,
  ALIGNMENTS.cg,
  ALIGNMENTS.ln,
  ALIGNMENTS.cn,
  ALIGNMENTS.le,
  ALIGNMENTS.ne,
  ALIGNMENTS.ce,
  ALIGNMENTS.n,
  ALIGNMENTS.any,
];

// ============================================================================
// Monster Factory Class
// ============================================================================

class MonsterFactory {
  /**
   * Create a Monster object from raw database/import data
   */
  createMonster(args: Partial<MonsterRow | Monster>): Monster {
    const id = args.guid || args.fid || '';

    // Parse numeric fields (ac, hp, init)
    const ac = this.parseNumeric(args.ac);
    const hp = this.parseNumeric(args.hp);
    const init = this.parseNumeric(args.init);

    // Parse CR
    const crString = typeof args.cr === 'string' ? args.cr : String(args.cr || '0');
    const cr = CR_INFO[crString] || CR_INFO['0'];

    // Parse tags
    const tags = args.tags
      ? (typeof args.tags === 'string' ? args.tags.split(/\s*,\s*/) : args.tags)
      : [];

    // Parse environment
    const environments = args.environment
      ? (typeof args.environment === 'string' ? args.environment.split(/\s*,\s*/) : [])
      : [];

    // Parse sources
    const sources = Array.isArray(args.sources)
      ? args.sources
      : this.parseSources(args.sources || '');

    // Parse alignment
    const alignment = typeof args.alignment === 'object' && 'text' in args.alignment
      ? args.alignment
      : this.parseAlignment(String(args.alignment || ''));

    // Parse size sort order
    const sizeSort = this.parseSize(args.size || '');

    // Build searchable string
    const searchable = [
      args.name || '',
      args.section || '',
      args.type || '',
      args.size || '',
      alignment.text,
      cr.string,
      ...tags,
    ].join('|').toLowerCase();

    const monster: Monster = {
      id,
      fid: args.fid,
      guid: args.guid,
      name: args.name || '',
      section: args.section,
      ac,
      hp,
      init,
      cr,
      type: args.type || '',
      size: args.size || '',
      alignment,
      legendary: !!args.legendary,
      lair: !!args.lair,
      unique: !!args.unique,
      special: !!args.special,
      tags: tags.length > 0 ? tags.sort() : undefined,
      environment: environments.length > 0 ? environments.sort() : undefined,
      sources,
      searchable,
    };

    return monster;
  }

  /**
   * Try to parse a value as a number, otherwise return the string
   */
  private parseNumeric(value: any): string | number {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    const parsed = Number.parseInt(String(value), 10);
    return isNaN(parsed) ? String(value) : parsed;
  }

  /**
   * Parse sources string into array of source objects
   * Format: "Monster Manual: 123, Volo's Guide: 45" or "SRD"
   */
  private parseSources(sourcesString: string): MonsterSource[] {
    if (!sourcesString) return [];

    return sourcesString
      .split(/\s*,\s*/)
      .map((rawSource) => {
        const sourceMatch = rawSource.match(/([^:]*): (.*)/);

        if (!sourceMatch) {
          // Just a source with no page or URL
          return { name: rawSource };
        }

        const name = sourceMatch[1];
        const where = sourceMatch[2];
        const source: MonsterSource = { name };

        if (where.match(/^\d+$/)) {
          source.page = Number.parseInt(where, 10);
        } else {
          source.page = where;
        }

        return source;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
  }

  /**
   * Parse alignment string into alignment object with flags
   */
  private parseAlignment(alignmentString: string): Alignment {
    if (!alignmentString) {
      return {
        text: '',
        tags: [],
      };
    }

    const flags = (alignmentString || '')
      .split(/\s*(,|or|,\s*or)\s*/i)
      .reduce((total, current) => {
        return total | this.parseSingleAlignmentFlags(current);
      }, 0);

    if (!flags) {
      console.warn('Could not parse alignment:', alignmentString);
      return {
        text: alignmentString,
        tags: [],
      };
    }

    return {
      text: alignmentString,
      tags: this.flagsToTags(flags),
    };
  }

  /**
   * Parse a single alignment string into flags
   */
  private parseSingleAlignmentFlags(alignment: string): number {
    let flags = 0;

    ALIGNMENT_TEST_ORDER.some((alignmentDefinition) => {
      if (alignment.match(alignmentDefinition.regex)) {
        flags = alignmentDefinition.flags;
        return true;
      }
      return false;
    });

    return flags;
  }

  /**
   * Convert alignment flags back to tag array
   */
  private flagsToTags(flags: number): string[] {
    const tags: string[] = [];

    if (flags & LG) tags.push('lawful good');
    if (flags & NG) tags.push('neutral good');
    if (flags & CG) tags.push('chaotic good');
    if (flags & LN) tags.push('lawful neutral');
    if (flags & N) tags.push('neutral');
    if (flags & CN) tags.push('chaotic neutral');
    if (flags & LE) tags.push('lawful evil');
    if (flags & NE) tags.push('neutral evil');
    if (flags & CE) tags.push('chaotic evil');
    if (flags & UNALIGNED) tags.push('unaligned');

    return tags;
  }

  /**
   * Parse size string into numeric sort order
   */
  private parseSize(size: string): number {
    switch (size) {
      case 'Tiny': return 1;
      case 'Small': return 2;
      case 'Medium': return 3;
      case 'Large': return 4;
      case 'Huge': return 5;
      case 'Gargantuan': return 6;
      default: return -1;
    }
  }

  /**
   * Check if a monster passes the given filters
   * @returns true if monster passes filters (should be shown)
   */
  checkMonster(monster: Monster, filters: Partial<SearchFilters>): boolean {
    return !this.isFiltered(monster, filters) && this.isNameMatched(monster, filters);
  }

  /**
   * Check if monster is found by name but filtered out
   */
  checkIsMonsterFoundAndFiltered(monster: Monster, filters: Partial<SearchFilters>): boolean {
    return this.isNameMatched(monster, filters) && this.isFiltered(monster, filters);
  }

  /**
   * Check if monster matches the name/regex filter
   */
  private isNameMatched(monster: Monster, filters: Partial<SearchFilters>): boolean {
    if (!filters.text) return true;

    if (filters.isRegex) {
      try {
        const regex = new RegExp(filters.text, 'i');
        return regex.test(monster.searchable || '');
      } catch (e) {
        // Invalid regex, fall back to literal search
        return (monster.searchable || '').toLowerCase().includes(filters.text.toLowerCase());
      }
    }

    return (monster.searchable || '').toLowerCase().includes(filters.text.toLowerCase());
  }

  /**
   * Check if monster is filtered out by the filters
   * @returns true if monster is filtered OUT (should be hidden)
   */
  private isFiltered(monster: Monster, filters: Partial<SearchFilters>): boolean {
    // Legendary filter
    if (filters.legendary !== undefined && filters.legendary !== null) {
      if (filters.legendary && !monster.legendary && !monster.lair) {
        return true;
      }
      if (!filters.legendary && (monster.legendary || monster.lair)) {
        return true;
      }
    }

    // Lair filter
    if (filters.lair !== undefined && filters.lair !== null) {
      if (filters.lair && !monster.lair) {
        return true;
      }
      if (!filters.lair && monster.lair) {
        return true;
      }
    }

    // Unique filter
    if (filters.unique !== undefined && filters.unique !== null) {
      if (filters.unique && !monster.unique) {
        return true;
      }
      if (!filters.unique && monster.unique) {
        return true;
      }
    }

    // CR range filter
    if (filters.minCr !== undefined && monster.cr.value < filters.minCr) {
      return true;
    }
    if (filters.maxCr !== undefined && monster.cr.value > filters.maxCr) {
      return true;
    }

    // Size filter
    if (filters.sizeFilters && filters.sizeFilters.length > 0) {
      if (!filters.sizeFilters.includes(monster.size)) {
        return true;
      }
    }

    // Type filter
    if (filters.typeFilters && filters.typeFilters.length > 0) {
      if (!filters.typeFilters.includes(monster.type)) {
        return true;
      }
    }

    // Alignment filter
    if (filters.alignmentFilters && filters.alignmentFilters.length > 0) {
      const monsterAlignments = monster.alignment?.tags || [];
      const hasMatch = filters.alignmentFilters.some((filterAlign) =>
        monsterAlignments.some((monsterAlign) => monsterAlign.toLowerCase().includes(filterAlign.toLowerCase()))
      );
      if (!hasMatch) {
        return true;
      }
    }

    // Tag filter
    if (filters.tagFilters && filters.tagFilters.length > 0 && monster.tags) {
      const hasMatch = filters.tagFilters.some((filterTag) =>
        monster.tags!.some((monsterTag) => monsterTag.toLowerCase() === filterTag.toLowerCase())
      );
      if (!hasMatch) {
        return true;
      }
    }

    // Environment filter
    if (filters.environmentFilters && filters.environmentFilters.length > 0 && monster.environment) {
      const hasMatch = filters.environmentFilters.some((filterEnv) =>
        monster.environment!.some((monsterEnv) => monsterEnv.toLowerCase() === filterEnv.toLowerCase())
      );
      if (!hasMatch) {
        return true;
      }
    }

    // Source filter
    if (filters.sourceFilters) {
      const monsterSources = monster.sources.map((s) => s.name);
      const hasEnabledSource = monsterSources.some((sourceName) => filters.sourceFilters![sourceName]);
      if (!hasEnabledSource) {
        return true;
      }
    }

    return false;
  }

  /**
   * Validate monster data and return array of error messages
   */
  checkMonsterValidity(monster: Partial<Monster>): string[] {
    const errors: string[] = [];

    if (!monster.name) {
      errors.push('Monster must have a name');
    }

    if (!monster.cr) {
      errors.push('Monster must have a CR');
    }

    if (!monster.type) {
      errors.push('Monster must have a type');
    }

    if (!monster.size) {
      errors.push('Monster must have a size');
    }

    return errors;
  }
}

// Export singleton instance
export const monsterFactory = new MonsterFactory();
