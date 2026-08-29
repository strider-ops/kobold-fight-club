# AngularJS Removal Plan - Phase 4 (TypeScript Migration)

## Progress Summary

**Overall Progress: Week 3 Complete ✅ (70%)**

- ✅ Week 1: TypeScript Setup + Simple Services (10/10 complete) **DONE**
- ✅ Week 2: Medium Services (8/8 complete) **DONE**
- ✅ Week 3: Complex Services (8/8 complete) **DONE**
- ⬜ Week 4: Cleanup & Testing (0/11 complete)
  - Phase 4A: Configure Vue to be Standalone (0/3)
  - Phase 4B: Remove AngularJS (0/5)
  - Phase 4C: Testing & Documentation (0/3)

**Total: 26/37 tasks complete (70%)**

---

## Overview

This document outlines the complete removal of AngularJS dependencies from Kobold Fight Club, converting all services to **framework-agnostic TypeScript modules** that Vue 3 can consume directly.

**Goal:** Single Vue-only deployment with NO AngularJS dependency + full TypeScript
**Estimated Effort:** 2-4 weeks (comprehensive testing included)
**Risk Level:** Medium (mitigated by TypeScript + existing tests)
**Current Status:** Week 2 COMPLETE ✅ All medium-complexity services extracted with 128 tests passing

---

## Critical Architecture Issue

**The Vue app is NOT standalone - it depends on the AngularJS server!**

### Current Setup (After Week 3)
```
AngularJS Server (port 8080)         Vue Dev Server (port 5173)
├── serves static files              ├── serves Vue app
│   ├── /data/monsters.db           │   └── proxies /data → 8080
│   └── /vendor/sql.js/             │       └── proxies /vendor → 8080
└── npm start                        └── npm run dev:vue
```

**Problem:** The Vue app proxies `/data` and `/vendor` to the AngularJS server. If we delete AngularJS files (Phase 4B), the AngularJS server won't start, breaking the Vue app.

### Week 4 Solution
**Phase 4A** reconfigures Vite to serve static assets directly from the project root:
```
Vue Standalone Server (port 5173)
├── serves Vue app
├── serves /data from project root
├── serves /vendor from project root
├── serves /styles from project root
└── no proxy needed!
```

After Phase 4A completes, the Vue app is truly standalone and AngularJS can be safely deleted.

---

## Current Architecture

### Service Dependency Chain

```
11 AngularJS Services → window object → 10 Vue Composables → Vue Components
```

**The 11 AngularJS Services:**
1. `store` - localStorage wrapper (uses $q, localStorageService)
2. `db` - SQLite database loader (uses $q)
3. `misc` - Static data & multiplier calculations (pure functions)
4. `monsters` - Monster catalog (uses $q, $rootScope, db, misc, monsterFactory)
5. `sources` - Content pack management (uses misc)
6. `metaInfo` - CR/type/size metadata (uses misc)
7. `library` - Saved encounters (uses store)
8. `partyInfo` - Party configuration (uses store, playerLevels)
9. `players` - Player management (uses store)
10. `encounter` - Current encounter state (uses $rootScope, monsters, players, misc, partyInfo, randomEncounter)
11. `combat` - Battle tracker (uses encounter, players, actionQueue)

**Supporting Services:**
- `monsterFactory` - Monster object creation
- `randomEncounter` - Random encounter generation
- `actionQueue` - Combat action queue
- `csv` - CSV parsing
- `integration` - Google Sheets integration
- `playerLevels` - D&D 5e XP thresholds (constant data)
- `homebrew` - Homebrew content management

---

## TypeScript Setup

### Install TypeScript Dependencies

```bash
npm install -D typescript @types/node
npm install -D @types/lodash  # for _ utilities
```

### TypeScript Configuration

Create `tsconfig.json` in project root:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "baseUrl": ".",
    "paths": {
      "@/*": ["app/vue/*"]
    },
    "types": ["vite/client", "node"]
  },
  "include": [
    "app/vue/**/*.ts",
    "app/vue/**/*.d.ts",
    "app/vue/**/*.tsx",
    "app/vue/**/*.vue"
  ],
  "exclude": ["node_modules", "dist", "dist-vue"]
}
```

### Update Vite Config for TypeScript

`app/vue/vite.config.js` → `app/vue/vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/data': 'http://localhost:8080',
      '/vendor': 'http://localhost:8080',
    },
  },
  build: {
    outDir: '../../dist-vue',
  },
});
```

---

## Type Definitions

### Core Types (`app/vue/types/index.ts`)

```typescript
// Monster Types
export interface ChallengeRating {
  text: string;
  value: number;
  exp: number;
}

export interface Monster {
  fid?: string;
  guid?: string;
  name: string;
  section?: string;
  ac: string | number;
  hp: string | number;
  init: string | number;
  cr: ChallengeRating;
  type: string;
  size: string;
  alignment: string;
  legendary: boolean;
  lair: boolean;
  unique: boolean;
  special: boolean;
  tags?: string;
  environment?: string;
  sources: string;
  searchable?: string;
}

export interface MonsterGroup {
  monster: Monster;
  qty: number;
}

// Encounter Types
export interface EncounterGroups {
  [monsterId: string]: MonsterGroup;
}

export interface SavedEncounter {
  name: string;
  groups: EncounterGroups;
}

// Party Types
export interface PartyLevels {
  [level: number]: number; // level -> player count
}

export interface ExpThresholds {
  easy: number;
  medium: number;
  hard: number;
  deadly: number;
}

export interface PartyInfo {
  levels: PartyLevels;
  totalPlayerCount: number;
  totalPartyExpLevels: ExpThresholds;
}

// Player Types
export interface Player {
  name: string;
  ac: number;
  hp: number;
  maxHp: number;
  init: number;
}

// Combat Types
export interface Combatant {
  id: string;
  name: string;
  ac: number;
  hp: number;
  maxHp: number;
  init: number;
  isPlayer: boolean;
  monster?: Monster;
}

// Source Types
export interface Source {
  name: string;
  shortname: string;
  type: string;
  default_selected: boolean;
}

// Metadata Types
export interface MetaOption {
  text: string;
  value: string | number;
}

export interface FilterOptions {
  crs: MetaOption[];
  types: MetaOption[];
  sizes: MetaOption[];
  alignments: MetaOption[];
  environments: MetaOption[];
  tags: MetaOption[];
}
```

---

## Extraction Strategy

### Phase 4.1: Extract Simple Services (Week 1)

**Order:** Bottom-up (dependencies first)

#### 1. `store.service.js` → `app/vue/services/store.ts`
- **Dependencies:** None (uses native localStorage)
- **Angular features to remove:** `$q`, `localStorageService`
- **Replacement:** Native Promises, direct localStorage API
- **Complexity:** LOW

```typescript
// app/vue/services/store.ts

export interface StoreService {
  get<T = any>(key: string): Promise<T | null>;
  set<T = any>(key: string, data: T): void;
  remove(key: string): void;
  hasKey(key: string): boolean;
}

class Store implements StoreService {
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (ex) {
      throw new Error(`Unable to parse stored value for ${key}`);
    }
  }

  set<T = any>(key: string, data: T): void {
    localStorage.setItem(key, JSON.stringify(data));
  }

  remove(key: string): void {
    localStorage.removeItem(key);
  }

  hasKey(key: string): boolean {
    return localStorage.getItem(key) !== null;
  }
}

export const store = new Store();
```

#### 2. `db.service.js` → `app/vue/services/db.ts`

```typescript
// app/vue/services/db.ts

interface SQLDatabase {
  exec(sql: string, params?: any[]): Array<{ columns: string[]; values: any[][] }>;
}

interface SQLJsStatic {
  Database: new (data: Uint8Array) => SQLDatabase;
}

const WASM_PATH = 'vendor/sql.js/';
const DB_PATH = 'data/monsters.db';

class DatabaseService {
  private ready: Promise<SQLDatabase> | null = null;

  async open(): Promise<SQLDatabase> {
    if (this.ready) {
      return this.ready;
    }

    if (typeof window.initSqlJs !== 'function') {
      throw new Error('sql.js is not loaded — check the vendor/sql.js script tag');
    }

    this.ready = (async () => {
      const SQL = await window.initSqlJs({
        locateFile: (file: string) => WASM_PATH + file,
      }) as SQLJsStatic;

      const response = await fetch(DB_PATH);
      if (!response.ok) {
        throw new Error(`Could not fetch ${DB_PATH} (${response.status} ${response.statusText})`);
      }

      const buffer = await response.arrayBuffer();
      return new SQL.Database(new Uint8Array(buffer));
    })();

    // Don't cache a rejection — transient failures shouldn't poison the service
    this.ready.catch(() => {
      this.ready = null;
    });

    return this.ready;
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const database = await this.open();
    const result = database.exec(sql, params);

    if (!result.length) {
      return [];
    }

    const columns = result[0].columns;
    return result[0].values.map((row) => {
      const out: any = {};
      for (let i = 0; i < columns.length; i++) {
        out[columns[i]] = row[i];
      }
      return out as T;
    });
  }
}

export const db = new DatabaseService();

// Extend Window interface for sql.js
declare global {
  interface Window {
    initSqlJs: (config: { locateFile: (file: string) => string }) => Promise<SQLJsStatic>;
  }
}
```

#### 3. `misc.service.js` → `app/vue/services/misc.ts`

```typescript
// app/vue/services/misc.ts

export interface CROption {
  text: string;
  value: number;
}

export interface MiscService {
  getMultiplier(playerCount: number, monsterCount: number): number;
  sourceFilters: Record<string, any>;
  sources: any[];
  sourcesByType: Record<string, any>;
  shortNames: Record<string, string>;
  tags: Record<string, any>;
}

class Misc implements MiscService {
  sourceFilters: Record<string, any> = {};
  sources: any[] = [];
  sourcesByType: Record<string, any> = {};
  shortNames: Record<string, string> = {};
  tags: Record<string, any> = {};

  getMultiplier(playerCount: number, monsterCount: number): number {
    const multipliers = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5];
    let multiplierCategory: number;

    if (monsterCount === 0) {
      return 0;
    } else if (monsterCount === 1) {
      multiplierCategory = 1;
    } else if (monsterCount === 2) {
      multiplierCategory = 2;
    } else if (monsterCount < 7) {
      multiplierCategory = 3;
    } else if (monsterCount < 11) {
      multiplierCategory = 4;
    } else if (monsterCount < 15) {
      multiplierCategory = 5;
    } else {
      multiplierCategory = 6;
    }

    if (playerCount < 3) {
      multiplierCategory++;
    } else if (playerCount > 5) {
      multiplierCategory--;
    }

    return multipliers[multiplierCategory];
  }
}

export const misc = new Misc();
```

#### 4. `monsterFactory.js` → `app/vue/services/monsterFactory.ts`

```typescript
// app/vue/services/monsterFactory.ts
import type { Monster, ChallengeRating } from '@/types';

// CR data from existing service
const CR_DATA: ChallengeRating[] = [
  { text: '0', value: 0, exp: 10 },
  { text: '1/8', value: 0.125, exp: 25 },
  { text: '1/4', value: 0.25, exp: 50 },
  { text: '1/2', value: 0.5, exp: 100 },
  { text: '1', value: 1, exp: 200 },
  // ... all CR values
];

export class MonsterFactory {
  createMonster(args: Partial<Monster>): Monster {
    // Copy existing monsterFactory.Monster logic
    // Parse alignment, size, cr, etc.

    const cr = this.parseCR(args.cr?.text || '0');

    return {
      fid: args.fid,
      guid: args.guid,
      name: args.name || '',
      section: args.section || '',
      ac: args.ac || '',
      hp: args.hp || '',
      init: args.init || '',
      cr,
      type: args.type || '',
      size: args.size || '',
      alignment: args.alignment || '',
      legendary: args.legendary || false,
      lair: args.lair || false,
      unique: args.unique || false,
      special: args.special || false,
      tags: args.tags,
      environment: args.environment,
      sources: args.sources || '',
    };
  }

  checkMonster(monster: Partial<Monster>): string[] {
    const errors: string[] = [];
    // Copy validation logic from existing service
    return errors;
  }

  private parseCR(crText: string): ChallengeRating {
    const cr = CR_DATA.find((c) => c.text === crText);
    return cr || CR_DATA[0];
  }
}

export const monsterFactory = new MonsterFactory();
```

### Phase 4.2: Extract Medium Services (Week 2)

#### 5-9. Sources, MetaInfo, Library, Players, PartyInfo

All follow similar pattern:
- Create TypeScript class/singleton
- Define interfaces
- Replace `$q` with Promises
- Replace `$rootScope` with Vue `reactive()`
- Export singleton instance

### Phase 4.3: Extract Complex Services (Week 2-3)

#### 10. `monsters.service.js` → `app/vue/services/monsters.ts`

```typescript
// app/vue/services/monsters.ts
import { reactive, computed } from 'vue';
import type { Monster } from '@/types';
import { db } from './db';
import { monsterFactory } from './monsterFactory';

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

class MonstersService {
  private loadPromise: Promise<{ monsters: number; sources: number }> | null = null;

  get all(): Monster[] {
    return state.all;
  }

  get byId(): Record<string, Monster> {
    return state.byId;
  }

  get byCr(): Record<string, Monster[]> {
    return state.byCr;
  }

  async load(): Promise<{ monsters: number; sources: number }> {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = (async () => {
      const [sources, monsters] = await Promise.all([
        db.query(SOURCE_SQL),
        db.query(MONSTER_SQL),
      ]);

      this.registerSources(sources);
      this.addMonsters(monsters);

      return { monsters: state.all.length, sources: sources.length };
    })();

    this.loadPromise.catch(() => {
      this.loadPromise = null;
    });

    return this.loadPromise;
  }

  addCustom(monsters: Partial<Monster>[]): void {
    this.addMonsters(monsters);
  }

  removeCustom(id: string): void {
    // Remove from state.all, state.byId, state.byCr
  }

  hasId(id: string): boolean {
    return state.byId[id] !== undefined;
  }

  private addMonsters(rows: any[]): void {
    rows.forEach((row) => {
      const monster = monsterFactory.createMonster(row);
      state.all.push(monster);
      state.byId[monster.fid || monster.guid!] = monster;

      const crKey = monster.cr.text;
      if (!state.byCr[crKey]) {
        state.byCr[crKey] = [];
      }
      state.byCr[crKey].push(monster);
    });
  }

  private registerSources(sources: any[]): void {
    // Register sources to misc service
  }
}

export const monsters = new MonstersService();

const MONSTER_SQL = `...`; // Copy from original
const SOURCE_SQL = `...`; // Copy from original
```

#### 11. `encounter.service.js` → `app/vue/services/encounter.ts`

```typescript
// app/vue/services/encounter.ts
import { reactive, computed } from 'vue';
import type { Monster, EncounterGroups, MonsterGroup } from '@/types';
import { monsters } from './monsters';
import { partyInfo } from './partyInfo';
import { misc } from './misc';

interface EncounterState {
  groups: EncounterGroups;
  reference: string | null;
}

const state = reactive<EncounterState>({
  groups: {},
  reference: null,
});

class EncounterService {
  get groups(): EncounterGroups {
    return state.groups;
  }

  get reference(): string | null {
    return state.reference;
  }

  set reference(value: string | null) {
    state.reference = value;
  }

  get qty(): number {
    return Object.values(state.groups).reduce((sum, g) => sum + g.qty, 0);
  }

  get exp(): number {
    return Object.values(state.groups).reduce(
      (sum, g) => sum + g.monster.cr.exp * g.qty,
      0
    );
  }

  get adjustedExp(): number {
    const multiplier = misc.getMultiplier(partyInfo.totalPlayerCount, this.qty);
    return Math.floor(this.exp * multiplier);
  }

  get difficulty(): string {
    const exp = this.adjustedExp;
    const levels = partyInfo.totalPartyExpLevels;

    if (exp === 0) return '';
    if (exp < levels.easy) return '';
    if (exp < levels.medium) return 'Easy';
    if (exp < levels.hard) return 'Medium';
    if (exp < levels.deadly) return 'Hard';
    return 'Deadly';
  }

  add(monster: Monster, qty: number = 1): void {
    const id = monster.fid || monster.guid!;
    if (state.groups[id]) {
      state.groups[id].qty += qty;
    } else {
      state.groups[id] = { monster, qty };
    }
  }

  remove(monsterId: string): void {
    delete state.groups[monsterId];
  }

  reset(storedEncounter?: any): void {
    state.groups = {};
    state.reference = null;

    if (storedEncounter) {
      this.thaw(storedEncounter);
    }
  }

  freeze(): any {
    // Serialize for saving
    return {
      groups: Object.entries(state.groups).map(([id, group]) => ({
        id,
        qty: group.qty,
      })),
      reference: state.reference,
    };
  }

  thaw(data: any): void {
    // Deserialize from saved
    data.groups.forEach((g: any) => {
      const monster = monsters.byId[g.id];
      if (monster) {
        state.groups[g.id] = { monster, qty: g.qty };
      }
    });
    state.reference = data.reference || null;
  }

  initialize(): void {
    // Called on app startup
  }

  generateRandom(difficulty: string): void {
    // Call randomEncounter service
  }

  randomize(): void {
    // Randomize quantities
  }
}

export const encounter = new EncounterService();
```

#### 12. `combat.service.js` → `app/vue/services/combat.ts`

Similar pattern with TypeScript types.

---

## Directory Structure

### New Services Location

```
app/vue/
├── types/
│   └── index.ts                 # All TypeScript type definitions
├── services/
│   ├── store.ts                 # localStorage wrapper
│   ├── db.ts                    # SQLite database
│   ├── misc.ts                  # Static data & calculations
│   ├── monsterFactory.ts        # Monster object creation
│   ├── monsters.ts              # Monster catalog
│   ├── sources.ts               # Content packs
│   ├── metaInfo.ts              # CR/type/size metadata
│   ├── library.ts               # Saved encounters
│   ├── players.ts               # Player management
│   ├── partyInfo.ts             # Party configuration
│   ├── encounter.ts             # Current encounter
│   ├── combat.ts                # Battle tracker
│   ├── randomEncounter.ts       # Random generation
│   ├── homebrew.ts              # Custom content
│   ├── integration.ts           # Google Sheets
│   ├── csv.ts                   # CSV parser
│   ├── actionQueue.ts           # Combat queue
│   └── playerLevels.ts          # XP thresholds (constants)
├── composables/
│   ├── useEncounter.ts          # Updated for TS services
│   ├── useMonsters.ts           # Updated for TS services
│   └── ... (all .js → .ts)
└── components/
    ├── EncounterBuilder.vue     # <script setup lang="ts">
    └── ... (all updated for TS)
```

---

## Composable Update Pattern

### Before (wraps AngularJS service)

```javascript
// app/vue/composables/useEncounter.js
import { computed } from 'vue';

export function useEncounter() {
  function getEncounter() {
    return window.encounterService; // ❌ AngularJS
  }

  const groups = computed(() => {
    const enc = getEncounter();
    return enc ? enc.groups : {};
  });

  return { groups };
}
```

### After (TypeScript with type safety)

```typescript
// app/vue/composables/useEncounter.ts
import { computed } from 'vue';
import { encounter } from '@/services/encounter';
import type { EncounterGroups } from '@/types';

export function useEncounter() {
  const groups = computed<EncounterGroups>(() => encounter.groups);
  const qty = computed<number>(() => encounter.qty);
  const exp = computed<number>(() => encounter.exp);
  const difficulty = computed<string>(() => encounter.difficulty);

  return {
    groups,
    qty,
    exp,
    difficulty,
    add: encounter.add.bind(encounter),
    remove: encounter.remove.bind(encounter),
    reset: encounter.reset.bind(encounter),
  };
}
```

---

## Testing Strategy

### Vitest TypeScript Configuration

Update `vite.config.ts`:

```typescript
export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

### Service Tests

```typescript
// app/vue/services/__tests__/store.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { store } from '../store';

describe('StoreService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should store and retrieve data', async () => {
    await store.set('test', { foo: 'bar' });
    const data = await store.get<{ foo: string }>('test');
    expect(data).toEqual({ foo: 'bar' });
  });

  it('should return null for missing keys', async () => {
    const data = await store.get('missing');
    expect(data).toBeNull();
  });
});
```

---

## Migration Checklist

### Week 1: TypeScript Setup + Simple Services (10/10 ✅ 100%) **COMPLETE**
- [x] Install TypeScript dependencies (`typescript@7.0.2`, `@types/node@26.3.0`)
- [x] Create `tsconfig.json`
- [x] Create `app/vue/types/index.ts` with all type definitions
- [x] Update `vite.config.js` → `vite.config.ts` (also root config → .mjs)
- [x] Extract `store.service.js` → `services/store.ts`
- [x] Extract `db.service.js` → `services/db.ts`
- [x] Extract `misc.service.js` → `services/misc.ts`
- [x] Extract `monsterFactory.js` → `services/monsterFactory.ts`
- [x] Write Vitest tests for extracted services (85 tests passing)
- [x] Verify compilation with `npm run type-check` (passes with no errors)

### Week 2: Medium Services (8/8 ✅ 100%) **COMPLETE**
- [x] Extract `sources.service.js` → `services/sources.ts`
- [x] Extract `metaInfo.service.js` → `services/metaInfo.ts`
- [x] Extract `library.service.js` → `services/library.ts`
- [x] Extract `players.service.js` → `services/players.ts`
- [x] Extract `partyInfo.service.js` → `services/partyInfo.ts`
- [x] Extract `playerLevels` → `services/playerLevels.ts` (constant data)
- [x] Write tests for library, players, and partyInfo services (43 tests)
- [x] TypeScript compilation verified (passes with no errors)

### Week 3: Complex Services (8/8 ✅ 100%)
- [x] Extract `monsters.service.js` → `services/monsters.ts` (from last commit)
- [x] Extract `encounter.service.js` → `services/encounter.ts` (from last commit)
- [x] Extract `combat.service.js` → `services/combat.ts` (32 tests)
- [x] Extract `randomEncounter.service.js` → `services/randomEncounter.ts` (22 tests)
- [x] Extract `homebrew.service.js` → `services/homebrew.ts` (41 tests)
- [x] Extract `csv.service.js` → `services/csv.ts` (20 tests)
- [x] Extract `actionQueue.service.js` → `services/actionQueue.ts` (23 tests)
- [x] Extract `integration.service.js` → `services/integration.ts` (11 tests)

### Week 4: Cleanup & Testing (0/11 ⬜ 0%)

**⚠️ SUPERSEDED BY NEW PLAN:** This Week 4 plan has been replaced by a more detailed implementation plan.

**SEE:** `PHASE-4-STANDALONE-PLAN.md` for the correct implementation approach.

**Issue Identified:** The original Week 4 plan was incomplete. It addressed serving static assets but missed the critical step of rewiring Vue composables from `window.angularService` to TypeScript services. The new plan corrects this.

---

**ORIGINAL WEEK 4 PLAN (ARCHIVED - DO NOT FOLLOW):**

#### Phase 4A: Configure Vue to be Standalone (3 tasks)
- [ ] Update `app/vue/vite.config.ts` to serve static assets from project root
  - Remove proxy configuration
  - Set `publicDir` to serve data/, vendor/, styles/, images/ from project root
  - Update `root` to `app/vue/` so Vue files resolve correctly
- [ ] Update `app/vue/index.html` to include required scripts and styles
  - Add Bootstrap CSS/JS, jQuery, Lodash
  - Add link to existing styles/style.css
- [ ] Update `app/vue/App.vue` to initialize all services on mount
  - Load monsters, library, players, partyInfo, homebrew services
  - Show loading state while initializing

**Implementation Details for Phase 4A:**

```typescript
// app/vue/vite.config.ts
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@lib': path.resolve(__dirname, '../lib'),
    }
  },
  root: __dirname,  // Points to app/vue/ - Vue files resolve correctly
  publicDir: path.resolve(__dirname, '../../'),  // Project root - serves static files
  server: {
    port: 5173,
    fs: {
      allow: ['../..']  // Allow Vite to access files outside app/vue/
    }
    // NO PROXY - we serve static assets directly!
  },
  // ... rest of config
});
```

**Testing Phase 4A:** After completing these tasks, run `npm run dev:vue`. The Vue app should work WITHOUT the AngularJS server running. If you see 404 errors for `/data/monsters.db` or `/vendor/sql.js`, Phase 4A is not complete.

#### Phase 4B: Remove AngularJS (5 tasks)
- [ ] Remove all AngularJS files (`app/services/*.js`, `app/encounter-builder/`, etc.)
- [ ] Remove AngularJS dependencies from `package.json`
- [ ] Update npm scripts to use Vue as default
  - `npm start` → runs Vue dev server
  - `npm build` → builds Vue production bundle
- [ ] Remove old AngularJS files (index.html, gulpfile.js, karma.conf.js)
- [ ] Run `npm run type-check` - ensure no errors

#### Phase 4C: Testing & Documentation (3 tasks)
- [ ] Run full test suite (`npm run test`)
- [ ] Manual testing of all features
- [ ] Update documentation (CLAUDE.md, README.md)

---

## Package.json Scripts

```json
{
  "scripts": {
    "dev": "cd app/vue && vite --port 5173",
    "build:vue": "cd app/vue && tsc && vite build",
    "type-check": "cd app/vue && tsc --noEmit",
    "test:vue": "cd app/vue && vitest",
    "test:vue:watch": "cd app/vue && vitest --watch",
    "preview": "cd app/vue && vite preview"
  }
}
```

---

## Success Criteria

### Must Have (Blocking)
- [ ] All TypeScript compiles without errors
- [ ] All 3,370 monsters load correctly
- [ ] All features work (filters, encounter building, battle tracker, etc.)
- [ ] Type safety in composables and components
- [ ] No AngularJS dependencies
- [ ] All tests pass
- [ ] Production build succeeds

### Nice to Have
- [ ] 100% type coverage (no `any` types)
- [x] Strict TypeScript mode enabled (already in tsconfig.json)
- [ ] Auto-complete works in IDE
- [ ] Type errors caught at compile time

---

## Benefits of TypeScript

1. **Type Safety** - Catch bugs at compile time
2. **Better IDE Support** - Auto-complete, refactoring, go-to-definition
3. **Self-Documenting** - Types serve as inline documentation
4. **Refactoring Confidence** - Compiler catches breaking changes
5. **Better Maintenance** - Easier for future developers to understand

---

## Conclusion

Converting to **TypeScript** instead of plain JavaScript adds:
- ~1-2 days to write type definitions
- Significant long-term maintainability benefits
- Compile-time error catching
- Better developer experience

---

## ⚠️ IMPORTANT: Week 4 Plan Updated

**The original Week 4 plan below has been superseded.**

**New Plan Location:** `PHASE-4-STANDALONE-PLAN.md`

**Why the change:** Review on 2026-08-29 revealed that Vue composables still use `window.angularService` instead of TypeScript services. The new plan addresses this gap with a detailed, task-by-task approach to make Vue truly standalone.

**Do not follow the Week 4 sections below.** They are kept for reference only.

---

## Current Status & Next Steps

**✅ Week 3 Status:** COMPLETE (8/8 tasks, 100%)

**Completed This Session:**
- ✅ combat.service.js → combat.ts with 32 comprehensive tests
- ✅ randomEncounter.service.js → randomEncounter.ts with 22 tests
- ✅ shuffle utility → shuffle.ts with 9 tests
- ✅ homebrew.service.js → homebrew.ts with 41 tests
- ✅ csv.service.js → csv.ts with 20 tests
- ✅ actionQueue.service.js → actionQueue.ts with 23 tests
- ✅ integration.service.js → integration.ts with 11 tests
- ✅ Total: 158 new tests added for week 3 services
- ✅ TypeScript compilation passing with no errors
- ✅ 340 total tests passing (up from 182 at week 2 completion)

**All Services Extracted (18 total):**
- Week 1: store, db, misc, monsterFactory
- Week 2: sources, metaInfo, library, players, partyInfo, playerLevels
- Week 3: monsters, encounter, combat, randomEncounter, homebrew, csv, shuffle, actionQueue, integration

**Next Up:** Week 4 - Cleanup & Testing
- Update composables to use TypeScript services directly (remove window object bridge)
- Remove AngularJS files and dependencies
- Comprehensive testing and verification
- Production build
