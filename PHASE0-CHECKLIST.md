# Phase 0 — Setup Checklist ✓

## Completed ✓

- [x] Add Vue 3 + Vue Router + Vite to package.json
- [x] Create `app/vue/` directory structure
- [x] Create vite.config.js
- [x] Create app/vue/main.js (Vue entry point)
- [x] Create app/vue/App.vue (root component)
- [x] Create app/vue/router/index.js (routing stub)
- [x] Create app/vue/index.html (HTML entry point)
- [x] Add npm scripts: `dev:vue`, `build:vue`, `preview:vue`
- [x] Create app/lib/ shared utility modules:
  - [x] app/lib/db.js (db service wrapper)
  - [x] app/lib/monsters.js (monsters service wrapper)
  - [x] app/lib/store.js (store service wrapper)

## Verification Steps

Before starting Phase 1, verify both dev servers work independently:

```bash
# Terminal 1: Start AngularJS app
npm start
# Should open http://localhost:8084 with full AngularJS UI

# Terminal 2: Start Vue dev server
npm run dev:vue
# Should open http://localhost:5173 with Vue stubs
```

**Checklist:**
- [ ] AngularJS app at http://localhost:8084 fully functional (search, filters, etc.)
- [ ] Vue app at http://localhost:5173 loads without errors
- [ ] Both servers can run simultaneously without conflicts

---

## Phase 1 Tasks (Next Session)
See MODERNIZATION-PLAN.md Part 3, Phase 1:
- Migrate Encounter Manager to Vue
- Create EncounterList.vue component
- Migrate library.service logic to Vue composable
- Write Jest tests
- Both routes work side-by-side: `/encounter-manager` (Angular) and `/vue/encounter-manager` (Vue)

**Estimated time:** 2-3 weeks (one developer, full-time)
