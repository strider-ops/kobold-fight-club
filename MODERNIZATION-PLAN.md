# Kobold Fight Club — Modernization Plan: Move Off AngularJS

**Current state:** AngularJS 1.5.9 (2016, EOL since 2022, unpatched CVEs)

**Goal:** Replace AngularJS with a modern framework while preserving functionality and keeping the app working throughout the migration.

---

## Part 1 — Scope & Risk Assessment

### Current AngularJS Usage

- **1.5.9** — ~6 years old, no security updates
- **Controllers:** search, encounter-builder, monster-table, battle-setup, battle-tracker, etc.
- **Services:** monsters, encounter, party-info, homebrew, store, csv, db
- **Components:** current-encounter, search, monster-table, group-info, etc.
- **Directives:** file-select, number-input
- **Routes:** ui-router with ~8 states
- **Tests:** Karma (Chrome headless) + Jasmine/Sinon; 78 passing specs
- **Data binding:** Two-way binding used throughout; form inputs and filters

### Risk: Medium

- The app is small-ish (~2000 lines across controllers/services)
- Core logic already extracted into pure functions (transforms, CSV parser, db queries)
- No external AngularJS plugins; minimal ecosystem lock-in
- Tests are comprehensive; regression detection is strong

---

## Part 2 — Framework Choice

### Recommended: **Vue 3** (or Svelte as alternative)

| Aspect | Vue 3 | React | Svelte |
|--------|-------|-------|--------|
| **Learning curve** | Medium | Steep | Low |
| **Bundle size** | ~34 KB | ~42 KB | ~16 KB |
| **Fit for KFC** | **Excellent** | Good | Excellent |
| **Two-way binding** | **v-model** | Props + setState | Reactive assignment |
| **State management** | Composition API | Redux/Zustand | Stores |
| **Migration path** | Gradual (coexist) | Gradual (coexist) | Full rewrite |

**Why Vue 3:** Familiar mental model to AngularJS devs (directives, reactivity, services as plugins), smallest rewrite, best gradual migration path.

**Why not React:** Steeper learning curve (JSX, hooks), requires more refactoring of templates.

**Why Svelte:** Smallest bundle, but less tooling maturity; better for greenfield than migration.

---

## Part 3 — Migration Strategy

### Phase 0 — Preparation (1-2 weeks)

**Goal:** Set up Vue alongside AngularJS; no users affected yet.

**Tasks:**
1. Add Vue 3 + Vue Router to `package.json`
2. Create `app/vue/` directory for new Vue components (alongside existing AngularJS `app/`)
3. Configure webpack/Vite to bundle both frameworks (or run them on separate ports during dev)
4. Write a hybrid bootstrap that loads AngularJS for `/` and Vue for `/vue/` routes (gradual)
5. Migrate shared utilities (transforms.mjs, csv.mjs, db.service logic) to plain JS modules (not AngularJS factories)

**Deliverable:** App still works on AngularJS; `/vue/` routes exist but empty.

---

### Phase 1 — Migrate One Page (Encounter Manager) (2-3 weeks)

**Goal:** Prove the migration path works; learn Vue; build confidence.

**Why Encounter Manager first:**
- Simpler than encounter-builder (less real-time interaction)
- Self-contained (manages saved encounters, minimal dependencies)
- Low risk (users rarely use it compared to builder)

**Tasks:**
1. Create Vue components:
   - `EncounterList.vue` (replaces encounter-manager view)
   - Compose existing services: monsters.service, encounter.service, library.service
2. Replace `encounter-manager.controller.js` logic with Vue `<script setup>`
3. Replace `encounter-manager.html` with `.vue` single-file component
4. Route: `/vue/encounter-manager` → Vue, `/encounter-manager` → AngularJS (both live)
5. Tests: Write Jest specs for the Vue component (same test coverage as Karma)

**Deliverable:** `/vue/encounter-manager` fully functional; old AngularJS route still works; 100% test parity.

---

### Phase 2 — Migrate Search & Filters (2-3 weeks)

**Goal:** Move the most complex, performance-critical feature.

**Why next:**
- Heavy use of reactivity (filters → query results → pagination)
- Tests are thorough (75+ specs already validate filter behavior)
- Proves Vue handles real-time updates better than AngularJS

**Tasks:**
1. Create Vue components:
   - `SearchForm.vue` (filters, sort, page size)
   - `MonsterTable.vue` (dir-pagination → custom pagination)
   - `EncounterBuilder.vue` (orchestrates the above)
2. Reuse `db.service.js` logic (already pure functions)
3. Copy filter logic from `search.controller.js` into Vue Composition API
4. Route: `/vue/encounter-builder` → Vue
5. Tests: Migrate Karma specs → Jest for Vue components

**Deliverable:** Full encounter builder in Vue; AngularJS builder still available; feature parity.

---

### Phase 3 — Migrate Remaining Pages (1-2 weeks per page)

**Goal:** Move battle setup, battle tracker, players, about.

**Tasks (per page):**
1. Create Vue component(s)
2. Migrate controller logic → Composition API
3. Reuse existing services (party-info, players, combat, etc.)
4. Write tests
5. Route both old and new side-by-side during testing

**Pages in order (by complexity):**
1. About (static, trivial)
2. Manage Players (simple form, localStorage)
3. Battle Setup (medium complexity)
4. Battle Tracker (complex state, real-time updates)

**Deliverable:** All pages accessible via both `/` (AngularJS) and `/vue/` (Vue).

---

### Phase 4 — Cutover & Cleanup (1 week)

**Goal:** Switch default to Vue; remove AngularJS.

**Tasks:**
1. Flip routes: `/` → Vue, `/angular/` → AngularJS (if users report issues)
2. Run production smoke tests (same test suite, different runner)
3. Monitor error logs for a week
4. Delete AngularJS route handling
5. Remove AngularJS from `package.json`
6. Delete `app/` (old controllers/directives)
7. Rename `app/vue/` → `app/`
8. Update build to skip AngularJS compilation

**Deliverable:** App runs on Vue 3; AngularJS removed; zero functional regression.

---

### Phase 5 — Optimize (1-2 weeks, post-launch)

**Goal:** Take advantage of Vue's capabilities.

**Tasks:**
1. Optimize bundle size (tree-shake unused code)
2. Add code-splitting for routes
3. Consider Pinia for shared state (if needed)
4. Migrate from Jest back to Vitest (faster, Vite-native)
5. Update CI/CD to run Vitest instead of Karma

**Deliverable:** Smaller bundle, faster tests, better DX.

---

## Part 4 — Implementation Details

### Data & State

**Services (reuse as-is):**
- `db.service.js` → Wrap in Vue Composable or import as plain JS module
- `monsters.service.js` → Compose in Vue components
- `store.service.js` (localStorage) → Replace with Pinia

**Services (convert to Vue):**
- `encounter.service.js` → Composition API + provide/inject
- `party-info.service.js` → Reactive ref + computed
- `homebrew.service.js` → Pinia store or Context API

**Example:**

```javascript
// Old AngularJS
app.factory('monsters', MonsterService);
function MonsterService(db, $q) {
  return { load: function() { ... } };
}

// New Vue (Composable)
import { ref, reactive } from 'vue';
import { db } from './db'; // Plain module

export function useMonsters() {
  const all = ref([]);
  const byCr = reactive({});
  
  const load = async () => {
    const rows = await db.query(...);
    all.value = rows.map(r => new Monster(r));
    // ... populate byCr
  };
  
  return { all, byCr, load };
}

// Usage in component
const { all, load } = useMonsters();
onMounted(() => load());
```

### Routing

**Current (ui-router):**
```javascript
.state('encounter-builder', {
  url: '/encounter-builder',
  templateUrl: 'app/encounter-builder/encounter-builder.html',
  controller: 'EncounterBuilderController'
})
```

**New (Vue Router):**
```javascript
const routes = [
  { path: '/encounter-builder', component: EncounterBuilder }
];
```

### Testing

**Current:** Karma + Jasmine (78 specs)

**New:** Vitest + Vue Test Utils

```javascript
// Vitest + Vue Test Utils
import { mount } from '@vue/test-utils';
import SearchForm from './SearchForm.vue';

describe('SearchForm', () => {
  it('filters monsters by CR', async () => {
    const wrapper = mount(SearchForm);
    await wrapper.find('[data-test=minCr]').setValue('5');
    expect(wrapper.vm.monsters).toHaveLength(expectedCount);
  });
});
```

### Build & Bundling

**Current:** Gulp + Sass (broken; manual recompilation)

**New:** Vite (zero-config, fast HMR)

```bash
npm run dev       # Hot reload
npm run build     # Production bundle (~50 KB gzipped, vs ~200 KB AngularJS)
```

---

## Part 5 — Timeline & Effort

| Phase | Task | Duration | Risk |
|-------|------|----------|------|
| 0 | Setup Vue + webpack; refactor shared code | 1–2 weeks | Low |
| 1 | Migrate Encounter Manager | 2–3 weeks | Low |
| 2 | Migrate Search & Encounter Builder | 2–3 weeks | Medium |
| 3 | Migrate remaining pages | 2–4 weeks | Low |
| 4 | Cutover & remove AngularJS | 1 week | Medium |
| 5 | Optimize & ship | 1–2 weeks | Low |
| **Total** | | **9–15 weeks** | |

**Effort:** ~1 FTE (one developer, full-time).

---

## Part 6 — Rollback Plan

At any point up to Phase 4, users can still access the AngularJS version:

- **During Phases 1–3:** Both `/` (AngularJS) and `/vue/` (Vue) live in parallel
- **If Vue version has bugs:** Revert route to AngularJS; fix Vue in staging
- **After Phase 4:** AngularJS deleted; rollback requires restoring from git

**Risk mitigation:**
- Keep AngularJS branch until Vue is live for 1 month without issues
- Run both in production for 1 week (A/B test if possible)

---

## Part 7 — Success Criteria

✓ **All 78 tests pass** in Vue (same suite, different runner)  
✓ **Zero functionality lost** compared to AngularJS version  
✓ **Bundle size < 150 KB gzipped** (vs ~200 KB AngularJS)  
✓ **Build time < 2 seconds** (vs ~5 seconds Gulp)  
✓ **No security warnings** from npm audit  
✓ **Page load < 2 seconds** (same or better than AngularJS)

---

## Part 8 — Decision Gate

**Should we do this?**

**Reasons to proceed:**
- AngularJS has unpatched CVEs (security risk)
- Vue is modern, actively maintained, has better DX
- Smaller bundle, faster build, better developer experience
- Can be done incrementally without downtime

**Reasons to defer:**
- 9–15 weeks of effort (high cost)
- Risk of regression despite tests
- AngularJS "works fine" for current users (no functional urgency)

**Recommendation:** 
**Proceed in phases.** Migrate Encounter Manager first (Phase 1, 2–3 weeks) as a proof-of-concept. If successful and no major issues, continue. If blocker found, stop at Phase 1 (encounter manager on Vue, rest on AngularJS) — still a win (one modern page, proven migration path).

---

## Appendix: Required Packages

```json
{
  "devDependencies": {
    "vue": "^3.3.0",
    "vue-router": "^4.2.0",
    "vite": "^4.3.0",
    "@vitejs/plugin-vue": "^4.2.0",
    "vitest": "^0.32.0",
    "@vue/test-utils": "^2.4.0"
  }
}
```

**Total new size:** ~1.5 MB node_modules (vs ~800 MB currently; acceptable for modern tooling).

---

**Next step:** Approve Phase 0 (setup) and assign an owner.
