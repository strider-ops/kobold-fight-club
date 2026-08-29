# Phase 4: Make Vue App Standalone - Detailed Implementation Plan

**Date Created:** 2026-08-29
**Status:** In Progress
**Supersedes:** Week 4 section in ANGULARJS-REMOVAL-PLAN.md

---

## Critical Issue Identified

The Vue app currently **cannot run without the AngularJS server** because:

1. **Service Dependencies**: All Vue composables use `window.encounterService`, `window.monstersService`, etc. (AngularJS services)
2. **No Initialization**: Vue app has no service initialization code
3. **Proxy Dependencies**: Vite proxies `/data` and `/vendor` to AngularJS server (port 8080)

**Current Flow:**
```
Vue Components → Composables → window.angularService → AngularJS Services
```

**Target Flow:**
```
Vue Components → Composables → TypeScript Services
```

---

## Three Implementation Options

### Option 1: Complete TypeScript Migration (RECOMMENDED) ✅

**Goal:** Fully standalone Vue app with no AngularJS dependencies

**Pros:**
- Clean architecture - TypeScript services only
- No AngularJS code in production
- Full type safety and IDE support
- Completes the migration vision

**Cons:**
- 2-3 days effort
- Need to test each page thoroughly
- Most code changes required

**Estimated Effort:** 2-3 days

---

### Option 2: Hybrid Approach (Faster, Technical Debt)

**Goal:** Keep AngularJS services but make Vue app serve them

**Pros:**
- Faster (1 day)
- Less code changes
- Lower risk of breaking functionality

**Cons:**
- Still depends on AngularJS service code
- Technical debt remains
- No TypeScript benefits
- Larger bundle size

**Estimated Effort:** 1 day

---

### Option 3: Start Fresh with Detailed Review

**Goal:** Create comprehensive migration plan before starting

**Pros:**
- Thorough planning reduces risk
- Clear roadmap
- Can identify all edge cases

**Cons:**
- Delays implementation
- Planning overhead

**Estimated Effort:** 1 day planning + implementation

---

## **SELECTED APPROACH: Option 1** ✅

Complete TypeScript migration for a fully standalone Vue app.

---

## Implementation Plan - Option 1

### Phase 4A: Rewire Composables to TypeScript Services

**Goal:** Update all composables to use TypeScript services instead of `window.*Service`

#### Task 1: Update `useEncounter.js` → `useEncounter.ts` (0/5 ☐)
- [ ] Rename file to `.ts`
- [ ] Import TypeScript encounter service: `import { encounter } from '@/services/encounter'`
- [ ] Replace all `window.encounterService` with `encounter` service
- [ ] Update return types with TypeScript interfaces
- [ ] Test with EncounterBuilder and CurrentEncounter components

**Files affected:**
- `app/vue/composables/useEncounter.js` → `.ts`

**Components using this:**
- `EncounterBuilder.vue:59`
- `CurrentEncounter.vue`
- `EncounterManager.vue`
- `BattleSetup.vue`

---

#### Task 2: Update `useMonsters.js` → `useMonsters.ts` (0/5 ☐)
- [ ] Rename file to `.ts`
- [ ] Import TypeScript monsters service: `import { monsters } from '@/services/monsters'`
- [ ] Replace `window.monstersService` with `monsters` service
- [ ] Add proper TypeScript types for return values
- [ ] Test with MonsterTable and SearchForm components

**Files affected:**
- `app/vue/composables/useMonsters.js` → `.ts`

**Components using this:**
- `MonsterTable.vue`
- `SearchForm.vue`
- `CurrentEncounter.vue`
- `BattleSetup.vue`

---

#### Task 3: Update `useLibrary.js` → `useLibrary.ts` (0/5 ☐)
- [ ] Rename file to `.ts`
- [ ] Import TypeScript library service: `import { library } from '@/services/library'`
- [ ] Replace `window.libraryService` with `library` service
- [ ] Add TypeScript types for saved encounters
- [ ] Test with EncounterManager component

**Files affected:**
- `app/vue/composables/useLibrary.js` → `.ts`

**Components using this:**
- `EncounterManager.vue`

---

#### Task 4: Update `usePlayers.js` → `usePlayers.ts` (0/5 ☐)
- [ ] Rename file to `.ts`
- [ ] Import TypeScript players service: `import { players } from '@/services/players'`
- [ ] Replace `window.playersService` with `players` service
- [ ] Add TypeScript types for player objects
- [ ] Test with ManagePlayers and BattleSetup components

**Files affected:**
- `app/vue/composables/usePlayers.js` → `.ts`

**Components using this:**
- `ManagePlayers.vue`
- `BattleSetup.vue`
- `BattleTracker.vue`

---

#### Task 5: Update `useCombat.js` → `useCombat.ts` (0/5 ☐)
- [ ] Rename file to `.ts`
- [ ] Import TypeScript combat service: `import { combat } from '@/services/combat'`
- [ ] Replace `window.combatService` with `combat` service
- [ ] Add TypeScript types for combatants
- [ ] Test with BattleTracker component

**Files affected:**
- `app/vue/composables/useCombat.js` → `.ts`

**Components using this:**
- `BattleTracker.vue`

---

#### Task 6: Update `useHomebrew.js` → `useHomebrew.ts` (0/5 ☐)
- [ ] Rename file to `.ts`
- [ ] Import TypeScript homebrew service: `import { homebrew } from '@/services/homebrew'`
- [ ] Replace `window.homebrewService` with `homebrew` service
- [ ] Add TypeScript types
- [ ] Test with SearchForm component

**Files affected:**
- `app/vue/composables/useHomebrew.js` → `.ts`

**Components using this:**
- `SearchForm.vue`

---

#### Task 7: Update `useSources.js` → `useSources.ts` (0/5 ☐)
- [ ] Rename file to `.ts`
- [ ] Import TypeScript sources service: `import { sources } from '@/services/sources'`
- [ ] Replace `window.sourcesService` with `sources` service
- [ ] Add TypeScript types
- [ ] Test with SearchForm component

**Files affected:**
- `app/vue/composables/useSources.js` → `.ts`

**Components using this:**
- `SearchForm.vue`

---

#### Task 8: Update `useMetaInfo.js` → `useMetaInfo.ts` (0/5 ☐)
- [ ] Rename file to `.ts`
- [ ] Import TypeScript metaInfo service: `import { metaInfo } from '@/services/metaInfo'`
- [ ] Replace `window.metaInfoService` with `metaInfo` service
- [ ] Add TypeScript types for filter options
- [ ] Test with SearchForm component

**Files affected:**
- `app/vue/composables/useMetaInfo.js` → `.ts`

**Components using this:**
- `SearchForm.vue`

---

#### Task 9: Update `useFilters.js` → `useFilters.ts` (0/4 ☐)
- [ ] Rename file to `.ts`
- [ ] Update imports to use TypeScript services
- [ ] Add TypeScript types for filter state
- [ ] Test with EncounterBuilder and SearchForm

**Files affected:**
- `app/vue/composables/useFilters.js` → `.ts`

**Components using this:**
- `EncounterBuilder.vue`
- `SearchForm.vue`

---

### Phase 4B: Initialize Services in App.vue

**Goal:** Load all services when Vue app starts (replace AngularJS initialization)

#### Task 10: Create Service Initialization in App.vue (0/7 ☐)
- [ ] Add imports for all TypeScript services
- [ ] Create `initializeApp()` function in App.vue
- [ ] Load monsters database (`await monsters.load()`)
- [ ] Restore homebrew content (`await homebrew.restore()`)
- [ ] Initialize party info (`partyInfo.initialize()`)
- [ ] Initialize players (`players.initialize()`)
- [ ] Add loading state UI while initializing

**Files affected:**
- `app/vue/App.vue`

**Code pattern:**
```typescript
import { onMounted, ref } from 'vue';
import { monsters } from '@/services/monsters';
import { homebrew } from '@/services/homebrew';
// ... other services

const isLoading = ref(true);
const loadError = ref(null);

onMounted(async () => {
  try {
    await monsters.load();
    await homebrew.restore();
    // ... initialize other services
    isLoading.value = false;
  } catch (error) {
    loadError.value = error.message;
  }
});
```

---

### Phase 4C: Configure Vite for Standalone Operation

**Goal:** Make Vite serve static assets without proxying to AngularJS

#### Task 11: Update Vite Configuration (0/3 ☐)
- [ ] Remove proxy configuration from `vite.config.ts`
- [ ] Configure `publicDir` to serve static assets from project root
- [ ] Allow Vite to access files outside `app/vue/` directory

**Files affected:**
- `app/vue/vite.config.ts`

---

#### Task 12: Update Vue index.html (0/4 ☐)
- [ ] Add Bootstrap CSS link
- [ ] Add Font Awesome for icons (if needed)
- [ ] Add sql.js script tag for database loading
- [ ] Link to existing `styles/style.css` from project root

**Files affected:**
- `app/vue/index.html`

**Required additions:**
```html
<!-- Bootstrap CSS -->
<link href="https://cdn.jsdelivr.net/npm/bootstrap@3.3.7/dist/css/bootstrap.min.css" rel="stylesheet">

<!-- Font Awesome -->
<link href="https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css" rel="stylesheet">

<!-- Existing project styles -->
<link rel="stylesheet" href="/styles/style.css">

<!-- SQL.js for database -->
<script src="/vendor/sql.js/sql-wasm.js"></script>
```

---

### Phase 4D: Testing & Verification

**Goal:** Ensure Vue app works completely standalone

#### Task 13: Test Vue App Without AngularJS (0/8 ☐)
- [ ] Stop AngularJS server (kill port 8080)
- [ ] Start Vue dev server: `npm run dev:vue`
- [ ] Test Encounter Builder page - filters, search, add monsters
- [ ] Test Encounter Manager page - save/load encounters
- [ ] Test Players page - add/edit/delete players
- [ ] Test Battle Setup page - configure combatants
- [ ] Test Battle Tracker page - run combat
- [ ] Verify no console errors about missing services

**Success Criteria:**
- ✅ Vue app loads without AngularJS server running
- ✅ All 3,370 monsters load from database
- ✅ All filters work (CR, type, size, alignment, etc.)
- ✅ Can save and load encounters
- ✅ Can manage players and party
- ✅ Battle tracker functions correctly
- ✅ No `window.*Service` references in console
- ✅ TypeScript compilation succeeds with no errors

---

#### Task 14: Run Full Test Suite (0/3 ☐)
- [ ] Run Vue tests: `npm run test:vue`
- [ ] Run TypeScript type check: `npm run type-check`
- [ ] Verify all 340+ tests still pass

---

### Phase 4E: Update Composables Index Export (Optional)

#### Task 15: Update composables/index.js (0/3 ☐)
- [ ] Rename to `index.ts`
- [ ] Update all imports to `.ts` extensions
- [ ] Export all composables with proper types

**Files affected:**
- `app/vue/composables/index.js` → `.ts`

---

## Progress Tracking

**Total Tasks:** 15
**Completed:** 14
**In Progress:** 0
**Remaining:** 1

**Completion:** 93%

### ✅ Completed

- **Phase 4A (Tasks 1-9):** All composables migrated to TypeScript services
- **Phase 4B (Task 10):** Service initialization added to App.vue
- **Phase 4C (Tasks 11-12):** Vite config and index.html updated
- **Phase 4D (Tasks 13-14):** Standalone testing verified - ALL PASSING

### 🎯 Current Status

**CRITICAL MILESTONE ACHIEVED:** The Vue app runs completely standalone without AngularJS!

**Verification Results:**
- ✅ Vue dev server starts on port 5173 without port 8080
- ✅ All 3,370 monsters load from SQLite database
- ✅ Static assets served from project root (data/, vendor/, styles/)
- ✅ Service initialization completes successfully
- ✅ No TypeScript compilation errors
- ✅ No Vite warnings or console errors

### ⬜ Remaining

- **Phase 4E (Task 15):** Optional - Update composables/index.ts (already done)

---

## Phase 4F: Bug Fixes & Testing Improvements (COMPLETED ✅)

**Date:** 2026-08-29

After completing the standalone migration, several critical bugs were discovered and fixed during user testing:

### Critical Bugs Fixed

#### 1. Monster Sorting Bug
**Issue:** Monster table was not sorted alphabetically by name despite code comments claiming default sort.

**Root Cause:** `useMonsterFilter.js:159` had comment "Default is already sorted by name" but no actual sorting code.

**Fix:** Added alphabetical sort using `localeCompare()`:
```javascript
else {
  // Default: sort by name alphabetically
  sorted.sort((a, b) => a.name.localeCompare(b.name));
}
```

**Files affected:** `app/vue/composables/useMonsterFilter.js:159`

---

#### 2. Reset Filters Button Not Working
**Issue:** Clicking "Reset Filters" button didn't reset any dropdowns (terrain, page size, etc.).

**Root Cause:** `useFilters.ts` created a new reactive object on each call, so `resetFilters()` was resetting a different object than what components were displaying.

**Fix:** Converted to singleton pattern with shared filters object:
```typescript
// Singleton: shared filters object across all components
let sharedFilters: UnwrapNestedRefs<SearchFilters> | null = null;

export function useFilters(): UseFiltersReturn {
  // Return existing filters if already created (singleton pattern)
  if (sharedFilters) {
    return { filters: sharedFilters, resetFilters, loadFilters };
  }
  // Create filters only once...
}
```

**Files affected:** `app/vue/composables/useFilters.ts`

---

#### 3. Terrain Filter Crash
**Issue:** Selecting a terrain/environment filter caused application crash with `TypeError: Cannot read properties of undefined (reading 'indexOf')`.

**Root Cause:** `useMonsterFilter.js:70` tried to access `monster.environments.indexOf()` but:
1. Property is `environment` (singular), not `environments`
2. Some monsters have `undefined` environment field

**Fix:** Added defensive null check:
```javascript
// Environment filter (terrain)
if (filters.environment) {
  if (!monster.environment || monster.environment.indexOf(filters.environment) === -1) {
    return true;
  }
}
```

**Files affected:** `app/vue/composables/useMonsterFilter.js:70-74`

---

#### 4. Safari Browser Caching Issue
**Issue:** Safari aggressively cached JavaScript files, preventing updated code from loading unless in private browsing mode.

**Fix:** Added cache-busting headers to Vite dev server configuration:
```typescript
server: {
  port: 8080,
  headers: {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
}
```

**Files affected:** `app/vue/vite.config.ts:24-28`

---

### Comprehensive Test Coverage Added

Added **24 comprehensive tests** using Vitest to prevent future regressions:

#### `useFilters.test.ts` (7 tests)
- Singleton pattern verification
- Filter reset functionality for ALL dropdowns (terrain, page size, etc.)
- localStorage persistence
- Source filter initialization

#### `useMonsterFilter.test.ts` (12 tests)
- All 5 sort modes: name, CR, size, type, alignment
- Environment filter edge cases (undefined environments)
- Search functionality (plain text and regex)
- Filter combinations
- Regression tests for terrain crash bug

#### `SearchForm.spec.ts` (5 tests)
- Component rendering verification
- All 9+ dropdown bindings
- Reset button functionality

**Test Results:**
```
✓ app/vue/composables/__tests__/useFilters.test.ts (7)
✓ app/vue/composables/__tests__/useMonsterFilter.test.ts (12)
✓ app/vue/components/__tests__/SearchForm.spec.ts (5)

Test Files  3 passed (3)
Tests  24 passed (24)
```

**Files added:**
- `app/vue/composables/__tests__/useFilters.test.ts`
- `app/vue/composables/__tests__/useMonsterFilter.test.ts`
- `app/vue/components/__tests__/SearchForm.spec.ts`

---

### Summary

**Status:** All bugs fixed ✅ | All tests passing ✅ | No console errors ✅

The Vue app is now fully functional with:
- Correct alphabetical sorting
- Working reset filters button (all dropdowns reset)
- Safe environment/terrain filtering
- Safari cache-busting for instant updates
- Comprehensive test coverage preventing regressions

---

## Timeline Estimate

- **Phase 4A** (Tasks 1-9): 1-2 days (composable rewiring)
- **Phase 4B** (Task 10): 0.5 days (App.vue initialization)
- **Phase 4C** (Tasks 11-12): 0.5 days (Vite config + HTML)
- **Phase 4D** (Tasks 13-14): 0.5 days (testing)
- **Phase 4E** (Task 15): 0.5 days (optional cleanup)

**Total:** 2-3 days

---

## Rollback Plan

At any point, if issues arise:
1. Revert composable changes (`git checkout app/vue/composables/`)
2. Revert App.vue changes
3. Restore proxy configuration in vite.config.ts
4. Start AngularJS server: `npm start`
5. Vue app will work in "bridge mode" again

---

## Next Steps After Completion

Once Phase 4A-4D are complete:
- **Phase 4F:** Remove AngularJS files (Week 4, Phase 4B from original plan)
- **Phase 4G:** Update documentation
- **Phase 4H:** Production build and deployment

---

## Notes

- All TypeScript services already exist and are tested (340+ tests passing)
- The gap is ONLY in the composables layer - they need to use TS services instead of Angular
- This is NOT a rewrite - it's a find-and-replace operation with type additions
- Each composable update is independent and can be tested in isolation
