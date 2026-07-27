# Phase 0 — Setup Checklist ✓

## Completed
- [x] Add Vue 3 + Vue Router + Vite to package.json
- [x] Create `app/vue/` directory structure
- [x] Create vite.config.js
- [x] Create app/vue/main.js (Vue entry point)
- [x] Create app/vue/App.vue (root component)
- [x] Create app/vue/router/index.js (routing stub)
- [x] Add npm scripts: `dev:vue`, `build:vue`, `preview:vue`

## What's Next (Phase 1)

### 1. Refactor Shared Utilities to Plain JS Modules
Currently these are AngularJS factories. Convert to plain JS exports:
- `app/services/db.service.js` → Keep as-is (already mostly pure functions)
- `app/services/monsters.service.js` → Extract logic to `app/lib/monsters.js`
- `scripts/lib/csv.mjs` → Already plain JS ✓
- `scripts/lib/transform.mjs` → Already plain JS ✓

Location: Create `app/lib/` directory for shared modules.

### 2. Set Up Hybrid Routing
The app needs to serve both:
- `/` → AngularJS (existing app)
- `/vue/*` → Vue 3 (new app)

Options:
- **Option A (Recommended):** Keep AngularJS on main port (8084), run Vue dev server on 5173 separately during dev
- **Option B:** Use Vite as main bundler, proxy AngularJS routes

Choose Option A for simplicity during Phase 0.

### 3. Create HTML Entry Point for Vue
Create `app/vue/index.html`:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kobold Fight Club (Vue)</title>
</head>
<body>
  <div id="vue-app"></div>
  <script type="module" src="/main.js"></script>
</body>
</html>
```

### 4. Verify Both Versions Work
- [ ] Start AngularJS: `npm start` → http://localhost:8084
- [ ] Start Vue dev server: `npm run dev:vue` → http://localhost:5173
- [ ] Confirm AngularJS app fully functional
- [ ] Confirm Vue app loads (will show stubs)

---

## Phase 1 Tasks (Next Session)
See MODERNIZATION-PLAN.md Part 3, Phase 1:
- Migrate Encounter Manager to Vue
- Create EncounterList.vue component
- Migrate library.service logic to Vue composable
- Write Jest tests
- Both routes work side-by-side: `/encounter-manager` (Angular) and `/vue/encounter-manager` (Vue)

**Estimated time:** 2-3 weeks (one developer, full-time)
