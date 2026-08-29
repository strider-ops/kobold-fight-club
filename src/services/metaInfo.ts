/**
 * Meta Info Service
 *
 * Static metadata for D&D 5e: challenge ratings, alignments, sizes,
 * types, environments, and other filter options.
 */

import { CR_INFO } from './monsterFactory';
import { misc } from './misc';
import type { ChallengeRating } from '@/types';

// Alignment bit flags
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

// Alignment definitions with bit flags
const ALIGNMENTS: Record<string, AlignmentDefinition> = {
  any: {
    text: 'any',
    flags: LG | NG | CG | LN | N | CN | LE | NE | CE,
    regex: /any/i,
  },
  any_chaotic: {
    text: 'any chaotic',
    flags: CG | CN | CE,
    regex: /any[- ]?chaotic/i,
  },
  any_evil: {
    text: 'any evil',
    flags: LE | NE | CE,
    regex: /any[- ]?evil/i,
  },
  any_good: {
    text: 'any good',
    flags: LG | NG | CG,
    regex: /any[- ]?good/i,
  },
  any_lawful: {
    text: 'any lawful',
    flags: LG | LN | LE,
    regex: /any[- ]?lawful/i,
  },
  any_neutral: {
    text: 'any neutral',
    flags: NG | LN | N | CN | NE,
    regex: /any[- ]?neutral/i,
  },
  non_chaotic: {
    text: 'non-chaotic',
    flags: LG | NG | LN | N | LE | NE | UNALIGNED,
    regex: /non[- ]?chaotic/i,
  },
  non_evil: {
    text: 'non-evil',
    flags: LG | NG | CG | LN | N | CN | UNALIGNED,
    regex: /non[- ]?evil/i,
  },
  non_good: {
    text: 'non-good',
    flags: LN | N | CN | LE | NE | CE | UNALIGNED,
    regex: /non[- ]?good/i,
  },
  non_lawful: {
    text: 'non-lawful',
    flags: NG | CG | N | CN | NE | CE | UNALIGNED,
    regex: /non[- ]?lawful/i,
  },
  unaligned: {
    text: 'unaligned',
    flags: UNALIGNED,
    regex: /unaligned/i,
  },
  lg: { text: 'lawful good', flags: LG, regex: /lawful[- ]?good/i },
  ng: { text: 'neutral good', flags: NG, regex: /neutral[- ]?good/i },
  cg: { text: 'chaotic good', flags: CG, regex: /chaotic[- ]?good/i },
  ln: { text: 'lawful neutral', flags: LN, regex: /lawful[- ]?neutral/i },
  n: { text: 'neutral', flags: N, regex: /neutral/i },
  cn: { text: 'chaotic neutral', flags: CN, regex: /chaotic[- ]?neutral/i },
  le: { text: 'lawful evil', flags: LE, regex: /lawful[- ]?evil/i },
  ne: { text: 'neutral evil', flags: NE, regex: /neutral[- ]?evil/i },
  ce: { text: 'chaotic evil', flags: CE, regex: /chaotic[- ]?evil/i },
};

export interface SortChoice {
  value: string;
  text: string;
}

export interface MetaInfoService {
  alignments: Record<string, AlignmentDefinition>;
  crInfo: Record<string, ChallengeRating>;
  crList: ChallengeRating[];
  legendaryList: string[];
  environments: string[];
  tags: Record<string, any>;
  sizes: string[];
  types: string[];
  sortChoices: SortChoice[];
}

class MetaInfo implements MetaInfoService {
  alignments = ALIGNMENTS;
  crInfo = CR_INFO;

  crList: ChallengeRating[] = [
    CR_INFO['0'], CR_INFO['1/8'], CR_INFO['1/4'], CR_INFO['1/2'],
    CR_INFO['1'], CR_INFO['2'], CR_INFO['3'], CR_INFO['4'],
    CR_INFO['5'], CR_INFO['6'], CR_INFO['7'], CR_INFO['8'],
    CR_INFO['9'], CR_INFO['10'], CR_INFO['11'], CR_INFO['12'],
    CR_INFO['13'], CR_INFO['14'], CR_INFO['15'], CR_INFO['16'],
    CR_INFO['17'], CR_INFO['18'], CR_INFO['19'], CR_INFO['20'],
    CR_INFO['21'], CR_INFO['22'], CR_INFO['23'], CR_INFO['24'],
    CR_INFO['25'], CR_INFO['26'], CR_INFO['27'], CR_INFO['28'],
    CR_INFO['29'], CR_INFO['30'],
  ];

  legendaryList = ['Ordinary', 'Legendary', 'Legendary (in lair)'];

  environments = [
    'aquatic',
    'arctic',
    'cave',
    'coast',
    'desert',
    'dungeon',
    'forest',
    'grassland',
    'mountain',
    'planar',
    'ruins',
    'swamp',
    'underground',
    'urban',
  ];

  get tags(): Record<string, any> {
    return misc.tags;
  }

  sizes = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'];

  types = [
    'Aberration',
    'Beast',
    'Celestial',
    'Construct',
    'Dragon',
    'Elemental',
    'Fey',
    'Fiend',
    'Giant',
    'Humanoid',
    'Monstrosity',
    'Ooze',
    'Plant',
    'Undead',
  ];

  sortChoices: SortChoice[] = [
    { value: 'name', text: 'Name' },
    { value: 'cr', text: 'CR' },
    { value: 'size', text: 'Size' },
    { value: 'type', text: 'Type' },
    { value: 'alignment', text: 'Alignment' },
  ];
}

// Export singleton instance
export const metaInfo = new MetaInfo();
