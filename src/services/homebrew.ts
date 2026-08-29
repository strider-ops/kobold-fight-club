/**
 * Homebrew Service - Import and manage custom monster content
 *
 * Handles:
 * - CSV and JSON file imports
 * - Validation and error reporting
 * - Storage quota management
 * - Pack persistence in localStorage
 */

import { reactive } from 'vue';
import type { MonsterRow } from '@/types';
import * as csvService from './csv';
import { CR_INFO } from './monsterFactory';

// Storage configuration
const STORAGE_KEY = '5em-homebrew';

// localStorage is a ~5MB budget shared with saved encounters, parties and filters.
// Refuse an import that would obviously crowd those out, with a message, rather than
// letting the browser throw QuotaExceededError somewhere less obvious later.
const MAX_PACK_BYTES = 1024 * 1024; // 1MB per pack
const MAX_TOTAL_BYTES = 2 * 1024 * 1024; // 2MB total

const SIZES = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'];

// Types
export interface HomebrewPack {
  name: string;
  shortName: string;
  rows: MonsterRow[];
}

export interface ImportResult {
  sourceName: string;
  added: number;
  skipped: number;
  errors: string[];
}

// State
const state = reactive<{
  packs: HomebrewPack[];
}>({
  packs: [],
});

/**
 * Homebrew Service
 */
class HomebrewService {
  // Dependencies (to be injected)
  private store: any;
  private monsters: any;

  constructor() {}

  /**
   * Set dependencies
   */
  setDependencies(deps: { store: any; monsters: any }): void {
    this.store = deps.store;
    this.monsters = deps.monsters;
  }

  /**
   * Get current packs
   */
  get packs(): HomebrewPack[] {
    return state.packs;
  }

  /**
   * Reset service state (for testing)
   */
  reset(): void {
    state.packs.length = 0;
  }

  /**
   * Parse and add a homebrew file. Everything happens in the browser — the file is
   * never uploaded anywhere.
   *
   * Returns { added, skipped, errors, sourceName }. Valid rows are imported even if
   * some rows fail; the failures are reported rather than silently dropped.
   */
  importText(filename: string, text: string): ImportResult {
    const sourceName = this.packName(filename);
    const result: ImportResult = { sourceName, added: 0, skipped: 0, errors: [] };

    if (this.findPack(sourceName)) {
      result.errors.push(`"${sourceName}" is already imported. Remove it first.`);
      return result;
    }

    let raw: Record<string, any>[];
    try {
      raw = this.parseAny(text);
    } catch (e: any) {
      result.errors.push(`Could not read the file: ${e.message}`);
      return result;
    }

    if (!raw.length) {
      result.errors.push('No rows found. Expected a CSV with a header row, or a JSON array.');
      return result;
    }

    const rows: MonsterRow[] = [];
    raw.forEach((input, index) => {
      const problems: string[] = [];
      const row = this.toMonsterRow(input, sourceName, problems);

      if (problems.length) {
        result.skipped++;
        // Row 1 is the header in a CSV, so the user's line number is index + 2
        result.errors.push(`Row ${index + 2}: ${problems.join('; ')}`);
        return;
      }

      if (row) {
        rows.push(row);
      }
    });

    // Filter duplicates
    const seen: Record<string, boolean> = {};
    const uniqueRows = rows.filter((row) => {
      if (seen[row.fid!] || this.monsters.hasId(row.fid)) {
        result.skipped++;
        result.errors.push(`Duplicate monster "${row.name}" skipped.`);
        return false;
      }
      seen[row.fid!] = true;
      return true;
    });

    if (!uniqueRows.length) {
      return result;
    }

    const pack: HomebrewPack = {
      name: sourceName,
      shortName: this.shortNameFor(sourceName),
      rows: uniqueRows,
    };

    const sizeError = this.checkBudget(pack);
    if (sizeError) {
      result.errors.push(sizeError);
      return result;
    }

    state.packs.push(pack);
    this.persist();

    result.added = this.monsters.addCustom(pack.name, pack.shortName, pack.rows);
    return result;
  }

  /**
   * Remove a homebrew pack
   */
  remove(sourceName: string): boolean {
    const pack = this.findPack(sourceName);
    const index = state.packs.indexOf(pack!);

    if (index === -1) {
      return false;
    }

    state.packs.splice(index, 1);
    this.persist();
    this.monsters.removeCustom(sourceName);

    return true;
  }

  /**
   * Re-add previously imported packs. Call after monsters.load() resolves.
   */
  async restore(): Promise<number> {
    try {
      const stored = await this.store.get(STORAGE_KEY);
      (stored || []).forEach((pack: HomebrewPack) => {
        if (!pack || !pack.name || !pack.rows) {
          return;
        }
        state.packs.push(pack);
        this.monsters.addCustom(pack.name, pack.shortName, pack.rows);
      });
      return state.packs.length;
    } catch (e) {
      // A corrupt value should not stop the app from starting
      return 0;
    }
  }

  // Private methods

  private parseAny(text: string): Record<string, any>[] {
    const trimmed = text.replace(/^﻿/, '').trim(); // Remove BOM

    if (trimmed.charAt(0) === '[' || trimmed.charAt(0) === '{') {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : parsed.monsters || [];
    }

    return csvService.toObjects(csvService.parse(trimmed));
  }

  /**
   * Map one input row onto the shape monsters.service's SQL produces, so imported
   * monsters go through exactly the same Monster construction as built-in ones.
   * Accepts the Google Sheets template's column names, with or without the "?".
   */
  private toMonsterRow(
    input: Record<string, any>,
    sourceName: string,
    problems: string[]
  ): MonsterRow | null {
    const pick = (...keys: string[]): string => {
      for (const key of keys) {
        const value = input[key];
        if (value !== undefined && value !== null && String(value).trim() !== '') {
          return String(value).trim();
        }
      }
      return '';
    };

    const name = pick('name', 'Name');
    const cr = pick('cr', 'CR');
    const size = pick('size', 'Size');
    const type = pick('type', 'Type');

    if (!name) {
      problems.push('missing name');
    }
    if (!cr) {
      problems.push('missing cr');
    } else if (!CR_INFO[cr]) {
      problems.push(`unknown cr "${cr}" (use 0, 1/8, 1/4, 1/2, or 1-30)`);
    }
    if (size && SIZES.indexOf(size) === -1) {
      problems.push(`unknown size "${size}" (use ${SIZES.join(', ')})`);
    }
    if (!type) {
      problems.push('missing type');
    }

    if (problems.length) {
      return null;
    }

    return {
      // Namespaced so an import can never collide with a built-in fid, and so
      // saved encounters referencing it stay distinguishable
      fid: `homebrew.${this.slug(sourceName)}.${this.slug(name)}`,
      guid: '',
      name,
      section: pick('section', 'Section'),
      ac: pick('ac', 'AC'),
      hp: pick('hp', 'HP'),
      init: pick('init', 'Init'),
      cr,
      type,
      size: size || 'Medium',
      alignment: pick('alignment', 'Alignment') || 'unaligned',
      legendary: this.truthy(pick('legendary?', 'legendary', 'Legendary')) ? 1 : 0,
      lair: this.truthy(pick('lair?', 'lair', 'Lair')) ? 1 : 0,
      unique: this.truthy(pick('unique?', 'unique', 'Unique')) ? 1 : 0,
      special: 0,
      tags: pick('tags', 'Tags'),
      environment: pick('environment', 'environments', 'Environment'),
      // The pack is the source, so its filter checkbox controls its monsters.
      // A page number from the file is kept; any source name in it is not.
      sources: sourceName + this.pageSuffix(pick('sources', 'source', 'Sources')),
    };
  }

  private pageSuffix(sources: string): string {
    const match = /:\s*(\d+)\s*$/.exec(sources || '');
    return match ? `: ${match[1]}` : '';
  }

  private truthy(value: string): boolean {
    return /^(1|y|yes|true|lair|legendary|unique)$/i.test(value);
  }

  private slug(value: string): string {
    return String(value)
      .toLowerCase()
      .replace(/['']/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private packName(filename: string): string {
    return (
      String(filename || 'Homebrew')
        .replace(/\.[^.]+$/, '')
        .replace(/[_-]+/g, ' ')
        .trim() || 'Homebrew'
    );
  }

  private shortNameFor(sourceName: string): string {
    const initials = sourceName
      .split(/\s+/)
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase();

    return initials.slice(0, 5);
  }

  private findPack(sourceName: string): HomebrewPack | undefined {
    return state.packs.find((p) => p.name === sourceName);
  }

  private checkBudget(pack: HomebrewPack): string | null {
    const packBytes = JSON.stringify(pack).length;
    const totalBytes = JSON.stringify(state.packs).length + packBytes;

    if (packBytes > MAX_PACK_BYTES) {
      return `That file is too large to store (${Math.round(packBytes / 1024)}KB). The limit is ${MAX_PACK_BYTES / 1024}KB per import.`;
    }

    if (totalBytes > MAX_TOTAL_BYTES) {
      return 'Not enough room left for imported content. Remove an existing import and try again.';
    }

    return null;
  }

  private persist(): void {
    try {
      this.store.set(STORAGE_KEY, state.packs);
    } catch (e) {
      // Saving failed, but the monsters are already loaded for this session
      console.error('Could not save imported content.', e);
    }
  }
}

// Export singleton instance
export const homebrew = new HomebrewService();
