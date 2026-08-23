# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kobold Fight Club is a D&D 5e encounter builder and battle tracker. The project is actively migrating from AngularJS 1.5.9 to Vue 3 while maintaining full functionality throughout the transition.

## Common Commands

### Development
```bash
npm start                 # Start AngularJS dev server (localhost:8080)
npm run dev:vue          # Start Vue dev server (localhost:5173)
npm run watch-css        # Watch and compile SASS changes
npm run watch-html       # Watch and recompile Angular template cache
```

### Testing
```bash
npm test                 # Run full Karma test suite (AngularJS)
npm run test-single      # Run Karma tests once (for CI)
npm run test:vue         # Run Vitest tests (Vue components)
npm run test:vue:watch   # Run Vitest in watch mode
npm run test-scripts     # Run Node.js script tests
npm run check            # Run all tests + verification suite
```

### Build & Data
```bash
npm run build            # Build production bundle with Gulp (currently broken)
npm run reconcile        # Reconcile monster data from Google Sheets + embedded dataset
npm run build-db         # Build SQLite database from reconciled data
npm run verify           # Verify database integrity against source data
npm run data             # Full data pipeline: reconcile + build-db + verify
```

### Gulp Tasks
```bash
gulp compile-sass        # Compile SASS to CSS
gulp template-cache      # Build AngularJS template cache
gulp inject              # Inject dependencies into index.html
gulp optimize            # Build production bundle (JS minification disabled)
```

## Architecture

### Dual-Framework Migration (Phase 1 Complete)

The app runs **both AngularJS and Vue simultaneously**:

- **AngularJS app** (`app/`) serves the main application at `localhost:8080`
- **Vue app** (`app/vue/`) runs separately at `localhost:5173`
- **Shared services** live in `app/services/` and `app/lib/`
- **Vue composables** (`app/vue/composables/`) wrap AngularJS services via `window.encounterService`, etc.

**Completed migrations:**
- Encounter Manager (`/vue/encounter-manager`) - saves/loads encounters using Vue + AngularJS service integration

**Next to migrate:** Search & filters, battle tracker

### Data Pipeline

The app uses a **SQLite database** built at development time from reconciled Google Sheets data:

1. **Source data:**
   - 3 Google Sheets (Official, Third-Party, Community monsters) - IDs in `app/services/sheet-manager.service.js`
   - Embedded dataset in `app/encounter-builder/search.controller.js` (904 monsters with full stat blocks)
   - Google Sheets exports cached in `google-sheets/`

2. **Reconciliation** (`npm run reconcile`):
   - Merges Google Sheets + embedded dataset
   - Resolves duplicates using `name + source` as key
   - Outputs `data/reconciled/monsters.json` (3,370 monsters) and `sources.json`

3. **Database build** (`npm run build-db`):
   - Transforms reconciled JSON into SQLite (`data/monsters.db`, 1.86 MB)
   - Tables: `monster`, `monster_alignment`, `monster_environment`, `monster_printing`, `source`
   - Uses Node's built-in `node:sqlite` (no external dependencies)

4. **Verification** (`npm run verify`):
   - Field-by-field diff against original Google Sheets
   - Ensures no data corruption during pipeline

**Critical files:**
- `scripts/reconcile.mjs` - Phase 1 reconciliation logic
- `scripts/build-db.mjs` - Phase 2 database builder
- `scripts/verify.mjs` - Phase 3 verification suite
- `data/corrections.json` - Manual fixes for Google Sheets data errors
- `app/services/db.service.js` - Loads `monsters.db` in browser using sql.js
- `app/services/monsters.service.js` - Queries SQLite, populates `monsters.all`, `monsters.byCr`, `monsters.byId`

### AngularJS Structure

**Module:** `app.module.js` defines the Angular app with dependencies:
- `ui.router` - routing
- `ngTouch` - touch events
- `angularUtils.directives.dirPagination` - pagination
- `LocalStorageModule` - localStorage wrapper

**Initialization flow** (`app.module.js:27-51`):
1. Discard stale Google Sheets cache (pre-SQLite cleanup)
2. Initialize party, encounter, players services
3. Load monsters from SQLite (`monsters.load()`)
4. Restore imported homebrew on top (`homebrew.restore()`)

**Key services:**
- `monsters.service.js` - Monster catalog (loads from SQLite)
- `encounter.service.js` - Current encounter state
- `library.service.js` - Saved encounters (localStorage)
- `homebrew.service.js` - User-imported custom monsters
- `db.service.js` - SQLite database access
- `party-info.service.js` - Party configuration
- `randomencounter.service.js` - Random encounter generation

**Controllers:**
- `encounter-builder/` - Main encounter builder UI (search, filters, monster list)
- `battle-tracker/` - Combat tracker with initiative
- `encounter-manager/` - Saved encounter library
- `players/` - Party configuration

### Vue 3 Structure

**Entry point:** `app/vue/main.js`

**Components:**
- `App.vue` - Root component with navigation
- `components/Home.vue` - Landing page
- `components/EncounterManager.vue` - Migrated encounter manager (Phase 1)
- `components/ManagerRow.vue` - Individual saved encounter row

**Composables** (Composition API):
- `useLibrary.js` - Manages saved encounters in localStorage
- `useEncounter.js` - Wraps AngularJS `encounter.service`
- `useMonsters.js` - Wraps AngularJS `monsters.service`

**Configuration:**
- `app/vue/vite.config.js` - Vite config with Vue plugin, proxy to AngularJS server
- `vite.config.js` (root) - Global Vite config with Vitest settings
- `@` alias points to `app/vue/`

### Testing

**AngularJS tests** (Karma + Jasmine + Sinon):
- Config: `karma.conf.js` (basePath: `./app`, excludes `lib/` and `vue/`)
- 78 passing specs across services and controllers
- Uses `bardjs` for test helpers
- Runs in ChromeHeadless

**Vue tests** (Vitest + @vue/test-utils):
- Config: `vite.config.js:23-30` (globals, jsdom environment)
- Tests in `app/vue/components/__tests__/`
- Coverage with v8 provider

**Script tests** (Node.js test runner):
- `npm run test-scripts` - Tests for `scripts/lib/*.test.mjs`

### Build System

**Gulp** (used for AngularJS build):
- Compiles SASS → CSS (`styles/style.css`)
- Minifies HTML templates → Angular `$templateCache` (`temp/templates.js`)
- Injects scripts/styles into `index.html`
- **Production build** (`gulp optimize`): JS minification disabled due to dependency injection issues

**Vite** (used for Vue build):
- Dev server on port 5173
- Proxies `/data` and `/vendor` to AngularJS server (port 8084)
- Builds to `dist-vue/`

## Important Notes

### Monster IDs (`fid` vs `guid`)

The app uses two ID systems:
- **`fid`** (format: `source.name-with-hyphens`) - Official monsters from Google Sheets
- **`guid`** (UUID) - User-imported homebrew monsters

Saved encounters store monsters by ID, so **never change the ID format** - it breaks all saved encounters.

### Data Corrections

Manual fixes for Google Sheets errors live in `data/corrections.json`. Examples:
- Guardian Naga / Spirit Naga had AC, HP, initiative transposed
- Smoke Mephit had HP 2 instead of 22

### Template Cache

AngularJS templates are embedded in `temp/templates.js` for production. In dev mode (`gulp --dev`), templates load directly from HTML files.

### Google Sheets Integration

Custom content: Users can add their own monsters by publishing a Google Sheet and pasting the URL into "Manage Custom Content". Sheet format documented in `README.md:7-78`.

## Migration Context

See `MODERNIZATION-PLAN.md` for full migration strategy. Key points:

- **Goal:** Replace AngularJS with Vue 3 while keeping app functional
- **Strategy:** Gradual migration, both frameworks coexist
- **Phase 1:** ✅ Encounter Manager (complete)
- **Phase 2:** Search & filters (next)
- **Risk:** Medium - comprehensive tests provide regression detection

The migration uses Vue composables to wrap AngularJS services, allowing Vue components to reuse existing business logic without duplication.
