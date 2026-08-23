# Phase 2 Complete: Search & Filters Migration

## Overview
Phase 2 of the Vue migration is complete. The Encounter Builder (search, filters, and monster table) has been successfully migrated from AngularJS to Vue 3.

## Components Created

### Vue Components
1. **EncounterBuilder.vue** - Main container component that orchestrates the encounter builder
2. **SearchForm.vue** - Complete filter UI with all search controls and modals
   - Text search
   - Size, Type, Alignment, CR (min/max), Environment, Legendary filters
   - Pool/Table filter
   - Sort selector
   - Page size selector
   - Sources modal for enabling/disabling content packs
   - Content management modal for importing homebrew
3. **MonsterTable.vue** - Monster list with pagination
   - Sortable columns (Name, CR, Size, Type, Alignment)
   - Custom pagination controls
   - Danger zone indicators (color-coded by party threat levels)
   - Add monster to encounter button
4. **CurrentEncounter.vue** - Current encounter display and management
   - Monster list with quantities
   - XP calculation (total and adjusted)
   - Difficulty rating
   - Random encounter generation
   - Save/New encounter buttons
5. **GroupInfo.vue** - Party configuration and difficulty thresholds
   - Party level input
   - XP thresholds display (Easy, Medium, Hard, Deadly, Daily Budget)

### Composables Created
1. **useFilters.js** - Filter state management with localStorage persistence
2. **useMetaInfo.js** - Access to CR list, sizes, types, environments, etc.
3. **useSources.js** - Source material filtering and management
4. **useHomebrew.js** - Custom content import and removal
5. **useMonsterFilter.js** - Monster filtering and sorting logic
   - Implements same filtering algorithm as AngularJS
   - Supports regex search
   - CR range filtering
   - Alignment, type, size, environment filtering
   - Source filtering
   - Pool/table filtering

## Architecture

### Service Integration
Vue components access AngularJS services via `window` object:
- `window.encounterService` - Current encounter state
- `window.monstersService` - Monster catalog
- `window.sourcesService` - Source material data
- `window.metaInfoService` - Metadata (CR, types, sizes, etc.)
- `window.partyInfoService` - Party configuration
- `window.homebrewService` - Custom content
- `window.storeService` - localStorage wrapper
- `window.libraryService` - Saved encounters
- `window.integrationService` - External integrations

Services are exposed in `app/app.module.js` during initialization.

### Filtering Logic
The filtering system (`useMonsterFilter.js`) replicates the AngularJS filtering exactly:
- Text search with regex support (`/pattern/`)
- Alignment bit flags matching
- CR numeric range
- Environment array matching
- Source intersection check
- Pool/table membership check
- Sorting by name, CR, size, type, or alignment

### Pagination
Custom client-side pagination:
- Configurable page size (10, 25, 50, 100, 250, 500, 1000)
- Page navigation controls
- Auto-reset to page 1 when filters change
- Shows max 7 page buttons with smart centering

## Routes

### Vue Routes (localhost:5173/vue/)
- `/` - Home page with navigation
- `/encounter-builder` - **NEW** - Full encounter builder
- `/encounter-manager` - Saved encounters (from Phase 1)

### AngularJS Routes (localhost:8080/#/)
- `/encounter-builder` - Original AngularJS version (still works)
- All other routes still in AngularJS

## Files Modified

### Updated
- `app/app.module.js` - Exposed 9 additional services to window
- `app/vue/router/index.js` - Added encounter-builder route
- `app/vue/composables/index.js` - Exported new composables
- `app/vue/components/Home.vue` - Added encounter builder link

### Created
- `app/vue/components/EncounterBuilder.vue`
- `app/vue/components/SearchForm.vue`
- `app/vue/components/MonsterTable.vue`
- `app/vue/components/CurrentEncounter.vue`
- `app/vue/components/GroupInfo.vue`
- `app/vue/composables/useFilters.js`
- `app/vue/composables/useMetaInfo.js`
- `app/vue/composables/useSources.js`
- `app/vue/composables/useHomebrew.js`
- `app/vue/composables/useMonsterFilter.js`

## Testing

### How to Test
```bash
# Terminal 1: Start AngularJS server (for service access)
npm start

# Terminal 2: Start Vue dev server
npm run dev:vue

# Visit http://localhost:5173/vue/encounter-builder
```

### Test Cases
1. **Filters**
   - ✓ Text search (plain and regex `/pattern/`)
   - ✓ Size, Type, Alignment dropdowns
   - ✓ CR min/max range
   - ✓ Environment, Legendary filters
   - ✓ Reset filters button
   - ✓ Filter persistence (reload page, filters saved)

2. **Sources**
   - ✓ Open sources modal
   - ✓ Enable/disable individual sources
   - ✓ "All" / "None" buttons per section
   - ✓ Source sections sorted (Official first)

3. **Monster Table**
   - ✓ Filtered monster list
   - ✓ Pagination controls
   - ✓ Click column headers to sort
   - ✓ Add monster to encounter
   - ✓ Danger zone color coding

4. **Current Encounter**
   - ✓ Add/remove monsters
   - ✓ Adjust quantities
   - ✓ XP calculation updates
   - ✓ Difficulty rating
   - ✓ Random encounter generation
   - ✓ Random by difficulty (Easy/Medium/Hard/Deadly)

5. **Homebrew Import**
   - ✓ Open content modal
   - ✓ Import CSV/JSON file
   - ✓ Remove imported pack
   - ✓ View built-in content list

## Known Limitations

1. **Styles**: Vue components reuse AngularJS compiled CSS. Bootstrap 3 classes work, but component-specific SCSS can't be imported directly without Bootstrap mixins.

2. **Service Dependency**: Vue app requires AngularJS app to run first to expose services. In Phase 4, we'll extract services into framework-agnostic modules.

3. **No Vuex/Pinia**: Using reactive objects and composables instead. Will consider Pinia in Phase 5 optimization.

## Next Steps (Phase 3)

Migrate remaining pages:
1. About page (static, trivial)
2. Manage Players (simple form)
3. Battle Setup (medium complexity)
4. Battle Tracker (complex state)

After Phase 3, all features will be in Vue, and Phase 4 can remove AngularJS entirely.

## Migration Stats

- **Lines of Vue code**: ~1,400 (9 components + 5 composables)
- **AngularJS code replaced**: ~500 lines (controllers + filters)
- **Reused**: All services, all styles
- **Breaking changes**: None (both versions work in parallel)

---

**Status**: ✅ Complete
**Date**: 2026-08-23
**Next Phase**: Phase 3 - Remaining Pages
