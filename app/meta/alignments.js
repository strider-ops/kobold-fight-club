/**
 * Alignment Definitions
 * Alignment bit flags and regex patterns for D&D 5e
 *
 * This file is in AngularJS format for compatibility with build scripts.
 * The canonical source is app/vue/services/monsterFactory.ts (ALIGNMENTS)
 */

(function() {
  'use strict';

  angular.module('app').factory('alignments', function() {
    // Bit flags
    var LG = Math.pow(2, 0);  // 1
    var NG = Math.pow(2, 1);  // 2
    var CG = Math.pow(2, 2);  // 4
    var LN = Math.pow(2, 3);  // 8
    var N  = Math.pow(2, 4);  // 16
    var CN = Math.pow(2, 5);  // 32
    var LE = Math.pow(2, 6);  // 64
    var NE = Math.pow(2, 7);  // 128
    var CE = Math.pow(2, 8);  // 256
    var UNALIGNED = Math.pow(2, 9);  // 512

    return {
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
  });
})();
