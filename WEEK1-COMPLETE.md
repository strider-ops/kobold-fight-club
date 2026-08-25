# Week 1 Complete: TypeScript Setup + Simple Services ✅

## Summary

Week 1 of the AngularJS removal project is **complete**! We've successfully set up TypeScript and extracted the first 4 services from AngularJS to framework-agnostic TypeScript modules.

**Date Completed:** August 24, 2026
**Status:** ✅ All TypeScript compiles without errors
**Next:** Week 2 - Extract medium complexity services

---

## What Was Accomplished

### 1. TypeScript Configuration ✅

**Files Created:**
- `tsconfig.json` - TypeScript compiler configuration
- `app/vue/types/index.ts` - Comprehensive type definitions (400+ lines)

**Dependencies Installed:**
```bash
npm install -D typescript @types/node
```

**New Scripts:**
```json
{
  "type-check": "tsc --noEmit"
}
```

### 2. Type Definitions Created ✅

Created comprehensive TypeScript interfaces in `app/vue/types/index.ts`:

**Core Types:**
- `ChallengeRating` - CR with text, value, exp
- `Monster` - Complete monster definition
- `Alignment` - Alignment with text and tags
- `MonsterSource` - Source with name/page
- `MonsterRow` - Raw database row format

**Encounter Types:**
- `MonsterGroup` - Monster + quantity
- `EncounterGroups` - Dictionary of groups
- `SavedEncounter` - Serialized encounter

**Party Types:**
- `PartyLevels` - Level distribution
- `ExpThresholds` - Easy/Medium/Hard/Deadly
- `Player` - Player character data

**Combat Types:**
- `Combatant` - Battle tracker combatant
- `CombatState` - Combat round tracking

**Metadata Types:**
- `Source` - Content pack info
- `SourceFilters` - Source filter state
- `FilterOptions` - All filter dropdown options
- `SearchFilters` - Complete search state

**Utility Types:**
- `SQLJsDatabase`, `SQLJsStatic` - sql.js types
- `StorageKey` - localStorage key enum

### 3. Vite Config Converted to TypeScript ✅

**File:** `app/vue/vite.config.ts` (was `.js`)

- Added proper ES module path resolution
- Fixed `__dirname` for TypeScript ES modules
- Maintained all existing Vite configuration

### 4. Services Extracted to TypeScript ✅

#### **`app/vue/services/store.ts`** (60 lines)
**Purpose:** localStorage wrapper with Promise-based API

**Interface:**
```typescript
interface StoreService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, data: T): void;
  remove(key: string): void;
  hasKey(key: string): boolean;
}
```

**Features:**
- Type-safe getters/setters
- JSON serialization/deserialization
- Error handling for malformed data
- Promise-based async API

**Changes from AngularJS:**
- ❌ Removed: `$q` (Angular promises)
- ❌ Removed: `localStorageService` dependency
- ✅ Added: Native `Promise` API
- ✅ Added: Direct `localStorage` access
- ✅ Added: TypeScript generics for type safety

---

#### **`app/vue/services/db.ts`** (95 lines)
**Purpose:** SQLite database loader using sql.js (WASM)

**Features:**
- Lazy database loading (opens once, caches promise)
- Converts sql.js results to plain objects
- Query parameter support for prepared statements
- Automatic retry on transient failures

**Changes from AngularJS:**
- ❌ Removed: `$q` (Angular promises)
- ✅ Added: Native `Promise` API
- ✅ Added: TypeScript types for sql.js
- ✅ Added: Return type generics (`query<T>`)

---

#### **`app/vue/services/misc.ts`** (75 lines)
**Purpose:** D&D 5e XP multiplier calculations and static data

**Features:**
- `getMultiplier(playerCount, monsterCount)` - DMG encounter multipliers
- Source filter state management
- Tag/metadata storage

**Key Method:**
```typescript
getMultiplier(playerCount: number, monsterCount: number): number
```

**Multiplier Rules (DMG p. 82-83):**
- 1 monster → 1x
- 2 monsters → 1.5x
- 3-6 monsters → 2x
- 7-10 monsters → 2.5x
- 11-14 monsters → 3x
- 15+ monsters → 4x
- **Adjusted for party size:** +1 category for 1-2 players, -1 for 6+ players

**Changes from AngularJS:**
- ❌ Removed: Angular module wrapper
- ✅ Added: Full TypeScript types
- ✅ Added: Documentation of DMG rules

---

#### **`app/vue/services/monsterFactory.ts`** (540 lines) 🎉
**Purpose:** Monster object creation, CR data, alignment parsing, filtering logic

**This is a BIG file - combines 3 AngularJS files:**
1. `scripts/monsterFactory.js` (Monster constructor + filtering)
2. `app/meta/crInfo.js` (CR → XP mappings)
3. `app/meta/alignments.js` (Alignment bit flags)

**Key Features:**

**1. CR Data (CRs 0 through 30)**
```typescript
export const CR_INFO: Record<string, ChallengeRating> = {
  '0':    { string: '0',    text: '0',    value: 0,     exp: 10 },
  '1/8':  { string: '1/8',  text: '1/8',  value: 0.125, exp: 25 },
  // ... up to CR 30 (155,000 XP)
};
```

**2. Alignment System (Bit Flags)**
- Uses bitwise flags for efficient alignment filtering
- 9 specific alignments (LG, NG, CG, LN, N, CN, LE, NE, CE)
- 1 unaligned
- 10 meta-alignments ("any chaotic", "non-evil", etc.)

**3. Monster Creation**
```typescript
createMonster(args: Partial<MonsterRow | Monster>): Monster
```
- Parses AC/HP/Init (tries number, falls back to string)
- Splits comma-separated tags/environments
- Parses sources (handles "Monster Manual: 123" format)
- Generates searchable text for filtering
- Fully typed output

**4. Monster Filtering**
```typescript
checkMonster(monster: Monster, filters: SearchFilters): boolean
```

Supports filtering by:
- Name/regex search
- CR range (min/max)
- Size, Type, Alignment
- Tags, Environment
- Legendary/Lair/Unique flags
- Source (content pack) selection

**Changes from AngularJS:**
- ❌ Removed: `alignments` service dependency (inlined)
- ❌ Removed: `crInfo` service dependency (inlined)
- ❌ Removed: `library` service dependency (not needed)
- ❌ Removed: Angular module/factory wrapper
- ✅ Added: Complete TypeScript types
- ✅ Added: Comprehensive JSDoc comments
- ✅ Added: Exported `CR_INFO` for reuse
- ✅ Added: Type-safe filter interface

---

## File Structure

```
kobold-fight-club/
├── tsconfig.json                     # NEW - TypeScript configuration
├── package.json                      # UPDATED - added type-check script
├── WEEK1-COMPLETE.md                 # NEW - This file
├── ANGULARJS-REMOVAL-PLAN.md         # Reference plan
└── app/vue/
    ├── types/
    │   └── index.ts                  # NEW - All TypeScript types (400+ lines)
    ├── services/
    │   ├── store.ts                  # NEW - localStorage service
    │   ├── db.ts                     # NEW - SQLite database service
    │   ├── misc.ts                   # NEW - XP multiplier + static data
    │   └── monsterFactory.ts         # NEW - Monster creation + filtering (540 lines!)
    └── vite.config.ts                # UPDATED - Converted from .js
```

---

## Testing & Verification

### TypeScript Compilation ✅

```bash
$ npm run type-check
> tsc --noEmit

# ✅ No errors!
```

All TypeScript compiles cleanly with:
- ✅ Strict mode enabled
- ✅ No `any` types (except intentional `CR_INFO` text alias)
- ✅ All imports resolve correctly
- ✅ All types match usage

---

## Key Decisions & Patterns

### 1. Service Pattern: Singleton Classes

**Pattern:**
```typescript
class ServiceName {
  // private state

  // public methods
  method() { }
}

export const serviceName = new ServiceName();
```

**Why:**
- Encapsulates private state
- Type-safe methods
- Easy to test (can create new instances in tests)
- Familiar to AngularJS developers (similar to factory pattern)

### 2. Type Organization

All types in single `types/index.ts` file because:
- Easy to import: `import type { Monster } from '@/types'`
- Prevents circular dependencies
- Single source of truth
- Better IDE autocomplete

### 3. Backwards Compatibility

**CR_INFO** has both `text` and `string` properties:
```typescript
{ string: '1/2', text: '1/2', value: 0.5, exp: 100 }
```

Why: Existing code uses both names. Having both avoids breaking changes.

### 4. Flexible Input Types

`createMonster()` accepts `Partial<MonsterRow | Monster>`:
- **MonsterRow**: Raw database output (strings)
- **Monster**: Already-parsed monster objects
- **Partial**: Not all fields required (for homebrew)

This handles:
- Database loading
- Homebrew imports
- Monster copying/merging

---

## Lines of Code

| Service | Lines | Complexity |
|---------|-------|------------|
| `store.ts` | 60 | Very Low |
| `db.ts` | 95 | Low |
| `misc.ts` | 75 | Low |
| `monsterFactory.ts` | 540 | **High** |
| `types/index.ts` | 400 | Medium |
| **Total** | **1,170** | - |

---

## What's Next: Week 2

**Goal:** Extract 5 medium-complexity services

**Services to Extract:**
1. `sources.service.js` → `services/sources.ts`
2. `metaInfo.service.js` → `services/metaInfo.ts`
3. `library.service.js` → `services/library.ts`
4. `players.service.js` → `services/players.ts`
5. `partyInfo.service.js` → `services/partyInfo.ts`

**Estimated Effort:** 1-2 days
**Key Challenge:** These services use `$rootScope.$broadcast` for event notifications

**Solution Strategy:** Replace with Vue `reactive()` for automatic reactivity

---

## Success Metrics

✅ **All Week 1 Goals Met:**
- [x] TypeScript installed and configured
- [x] Comprehensive type definitions created
- [x] 4 services extracted to TypeScript
- [x] All code compiles with no errors
- [x] Vite config converted to TypeScript
- [x] `npm run type-check` script added

---

## Notes

### MonsterFactory Complexity

The `monsterFactory.ts` file is 540 lines because it combines:
- Monster constructor logic (150 lines)
- CR data for 31 challenge ratings (30 lines)
- Alignment system with 19 definitions (80 lines)
- Filtering logic for 10+ filter types (200 lines)
- Source parsing, alignment parsing, size parsing (80 lines)

This could be split into multiple files in the future, but for Week 1 we kept it as one file to match the AngularJS structure.

### Type Safety Benefits Already Visible

TypeScript caught several bugs during extraction:
1. Missing `text` property in `ChallengeRating`
2. Mismatched types for `sources` (could be string OR array)
3. Missing fields in `HomebrewMonster` interface
4. Invalid vite config properties

These would have been runtime errors in JavaScript!

---

## Team Notes

**For Next Developer:**

When working on Week 2, you can import these services like:

```typescript
import { store } from '@/services/store';
import { db } from '@/services/db';
import { misc } from '@/services/misc';
import { monsterFactory, CR_INFO } from '@/services/monsterFactory';
import type { Monster, Encounter, Player } from '@/types';

// Use them:
const monster = monsterFactory.createMonster(row);
const multiplier = misc.getMultiplier(4, 6);  // 4 players, 6 monsters
await store.set('key', { foo: 'bar' });
const results = await db.query<MonsterRow>('SELECT * FROM monster');
```

All services are:
- ✅ Fully typed
- ✅ Framework-agnostic (no Angular dependency)
- ✅ Ready to use in Vue composables
- ✅ Documented with JSDoc comments

---

**Week 1 Status: COMPLETE** ✅
**Ready for Week 2!** 🚀
