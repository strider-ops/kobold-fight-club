/**
 * Alignment Definitions
 * Alignment bit flags and regex patterns for D&D 5e
 *
 * ES Module export for build scripts.
 * Source of truth: app/vue/services/monsterFactory.ts (ALIGNMENTS)
 */

// Bit flags
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

export const alignments = {
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
