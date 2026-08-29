/**
 * Monsters Service
 *
 * Manages the monster catalog loaded from SQLite database.
 * Provides access to all monsters, indexed by ID and CR.
 */

import { reactive } from 'vue';
import type { Monster } from '@/types';
import { db } from './db';
import { misc } from './misc';
import { monsterFactory } from './monsterFactory';

// ============================================================================
// SQL Queries
// ============================================================================

/**
 * The columns are deliberately shaped to match what the Google Sheets rows used to
 * look like — delimited strings for tags/environment/sources, a CR label rather than
 * a number — so that monsterFactory.createMonster can consume them completely unchanged.
 *
 * That means the parsing monsterFactory already does is still done at load time
 * rather than read from the precomputed columns (alignment_flags, size_sort,
 * searchable) that build-db.mjs also writes. That is intentional for this phase:
 * changing where the data comes from and how monster objects are built in the same
 * step would make any regression impossible to attribute to one or the other.
 * Phase 6 switches to the precomputed columns, once Phase 5 is green.
 *
 * COALESCE to '' rather than leaving NULLs, because the sheets never produced null —
 * they produced empty strings, and Monster's parsing depends on that distinction
 * (e.g. Number.parseInt("") is NaN and falls back to "", which templates render as
 * blank, whereas null would surface differently).
 */
const MONSTER_SQL = [
  'SELECT m.fid, COALESCE(m.guid, \'\') AS guid, m.name,',
  '       COALESCE(m.section, \'\') AS section,',
  '       COALESCE(m.ac, m.ac_text, \'\') AS ac,',
  '       COALESCE(m.hp, m.hp_text, \'\') AS hp,',
  '       COALESCE(m.init, \'\') AS init,',
  '       c.label AS cr, m.type, m.size,',
  '       COALESCE(m.alignment_text, \'\') AS alignment,',
  // aliased back to `unique`: the column is unique_npc only because `unique` is a
  // reserved word in SQL, but monsterFactory reads args.unique.
  '       m.legendary, m.lair, m.unique_npc AS "unique", m.special,',
  '       (SELECT group_concat(t.name, \', \') FROM monster_tag mt',
  '          JOIN tag t ON t.id = mt.tag_id WHERE mt.monster_id = m.id) AS tags,',
  '       (SELECT group_concat(e.name, \', \') FROM monster_environment me',
  '          JOIN environment e ON e.id = me.environment_id',
  '         WHERE me.monster_id = m.id) AS environment,',
  '       (SELECT group_concat(',
  '                 CASE WHEN p.page IS NOT NULL THEN s.name || \': \' || p.page',
  '                      WHEN p.url  IS NOT NULL THEN s.name || \': \' || p.url',
  '                      ELSE s.name END, \', \')',
  '          FROM monster_printing p JOIN source s ON s.id = p.source_id',
  '         WHERE p.monster_id = m.id) AS sources',
  '  FROM monster m',
  '  JOIN cr c ON c.numeric = m.cr_numeric',
].join('\n');

const SOURCE_SQL =
  'SELECT name, COALESCE(short_name, \'\') AS shortname, COALESCE(type, \'\') AS type,' +
  '       default_selected FROM source ORDER BY name';

// ============================================================================
// State
// ============================================================================

interface MonsterState {
  all: Monster[];
  byId: Record<string, Monster>;
  byCr: Record<string, Monster[]>;
}

const state = reactive<MonsterState>({
  all: [],
  byId: {},
  byCr: {},
});

// ============================================================================
// Event Emitter (replaces $rootScope.$broadcast)
// ============================================================================

type EventCallback = (...args: any[]) => void;

class EventEmitter {
  private events: Record<string, EventCallback[]> = {};

  on(event: string, callback: EventCallback): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  off(event: string, callback: EventCallback): void {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter((cb) => cb !== callback);
  }

  emit(event: string, ...args: any[]): void {
    if (!this.events[event]) return;
    this.events[event].forEach((callback) => callback(...args));
  }
}

const eventEmitter = new EventEmitter();

// ============================================================================
// Monsters Service
// ============================================================================

interface SourceRow {
  name: string;
  shortname: string;
  type: string;
  default_selected: number | boolean;
}

class MonstersService {
  private loadPromise: Promise<{ monsters: number; sources: number }> | null = null;

  /**
   * All monsters in the catalog (sorted by name)
   */
  get all(): Monster[] {
    return state.all;
  }

  /**
   * Monsters indexed by ID (fid or guid)
   */
  get byId(): Record<string, Monster> {
    return state.byId;
  }

  /**
   * Monsters indexed by CR string ("0", "1/8", "1", "2", etc.)
   */
  get byCr(): Record<string, Monster[]> {
    return state.byCr;
  }

  /**
   * Check if a monster with the given ID exists
   */
  hasId(id: string): boolean {
    return state.byId[id] !== undefined;
  }

  /**
   * Validate a monster object
   */
  check(monster: Partial<Monster>): string[] {
    return monsterFactory.checkMonsterValidity(monster);
  }

  /**
   * Populate all / byCr / byId from the database. Idempotent — every caller after
   * the first gets the same promise, so injecting this service from several places
   * cannot load the catalog twice.
   */
  load(): Promise<{ monsters: number; sources: number }> {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = (async () => {
      const [sources, monsters] = await Promise.all([
        db.query<SourceRow>(SOURCE_SQL),
        db.query<any>(MONSTER_SQL),
      ]);

      this.registerSources(sources);
      this.addMonsters(monsters);

      return { monsters: state.all.length, sources: sources.length };
    })();

    // Don't cache a rejection — transient failures shouldn't poison the service
    this.loadPromise.catch(() => {
      this.loadPromise = null;
    });

    return this.loadPromise;
  }

  /**
   * Add an imported homebrew pack. Rows must be in the same shape the database
   * query produces, so they go through the identical Monster construction path —
   * an imported monster is not a second-class citizen with a different code path.
   */
  addCustom(sourceName: string, shortName: string, rows: any[]): number {
    this.registerSources([
      {
        name: sourceName,
        shortname: shortName || '',
        type: 'Homebrew',
        // Imported content is switched on immediately; the user just asked for it.
        default_selected: 1,
      },
    ]);

    this.addMonsters(rows);

    // Emit event for components listening for new sources
    eventEmitter.emit('custom-source-added', sourceName);

    return rows.length;
  }

  /**
   * Remove an imported pack: its monsters, and its entry in the source lists.
   */
  removeCustom(sourceName: string): number {
    let removed = 0;

    // Remove monsters from this source (iterate backwards to safely splice)
    for (let i = state.all.length - 1; i >= 0; i--) {
      const monster = state.all[i];
      const fromThisSource = monster.sources.some((source) => source.name === sourceName);

      if (!fromThisSource) {
        continue;
      }

      state.all.splice(i, 1);
      delete state.byId[monster.id];

      const bucket = state.byCr[monster.cr.string] || [];
      const at = bucket.indexOf(monster);
      if (at !== -1) {
        bucket.splice(at, 1);
      }

      removed++;
    }

    // Remove source from misc service
    const sourceIndex = misc.sources.indexOf(sourceName);
    if (sourceIndex !== -1) {
      misc.sources.splice(sourceIndex, 1);
    }

    delete misc.sourceFilters[sourceName];
    delete misc.shortNames[sourceName];

    Object.keys(misc.sourcesByType).forEach((type) => {
      const list = misc.sourcesByType[type];
      const at = list.indexOf(sourceName);
      if (at !== -1) {
        list.splice(at, 1);
      }
      if (!list.length) {
        delete misc.sourcesByType[type];
      }
    });

    return removed;
  }

  /**
   * Subscribe to custom source added events
   */
  onCustomSourceAdded(callback: (sourceName: string) => void): void {
    eventEmitter.on('custom-source-added', callback);
  }

  /**
   * Unsubscribe from custom source added events
   */
  offCustomSourceAdded(callback: (sourceName: string) => void): void {
    eventEmitter.off('custom-source-added', callback);
  }

  /**
   * Reset service state (for testing only)
   * @private
   */
  _reset(): void {
    state.all.length = 0;
    Object.keys(state.byId).forEach((key) => delete state.byId[key]);
    Object.keys(state.byCr).forEach((key) => delete state.byCr[key]);
    this.loadPromise = null;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private registerSources(rows: SourceRow[]): void {
    rows.forEach((row) => {
      if (misc.sourceFilters[row.name] !== undefined) {
        console.warn('Duplicate source', row.name);
        return;
      }

      misc.sources.push(row.name);
      misc.sourceFilters[row.name] = !!row.default_selected;
      misc.shortNames[row.name] = row.shortname;

      if (!misc.sourcesByType[row.type]) {
        misc.sourcesByType[row.type] = [];
      }

      misc.sourcesByType[row.type].push(row.name);
    });

    misc.sources.sort();
  }

  private addMonsters(rows: any[]): void {
    rows.forEach((row) => {
      const monster = monsterFactory.createMonster(row);

      // Reprints are separate rows with their own fid now, so there is nothing
      // left to merge — the id collision the old loadMonsters() guarded against
      // cannot happen. build-db.mjs fails the build on a duplicate fid.
      state.all.push(monster);
      state.byId[monster.id] = monster;

      if (!state.byCr[monster.cr.string]) {
        state.byCr[monster.cr.string] = [];
      }

      state.byCr[monster.cr.string].push(monster);
    });

    state.all.sort((a, b) => (a.name > b.name ? 1 : -1));
  }
}

// ============================================================================
// Export
// ============================================================================

export const monsters = new MonstersService();
