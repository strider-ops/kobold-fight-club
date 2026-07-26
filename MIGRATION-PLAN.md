# Kobold Fight Club — Architecture Review & Database Migration Plan

**Repo reviewed:** `strider-ops/kobold-fight-club` (fork of `Asmor/5e-monsters`)
**Last commit:** `110c7ab "wip"` — 2021-08-15, Maximilian Wilson
**Reviewed:** 2026-07-25 · **Revised** after discovering the embedded dataset

> **Revision note (2nd pass).** Two earlier drafts were wrong in opposite directions.
> Draft 1 claimed the Google Sheets were the only copy — wrong; a 904-monster dataset
> with full stat blocks is committed in the repo, inlined into a JavaScript file.
> Draft 2 treated the Sheets as probably-lost — also wrong. **All three sheets are alive**
> and have been exported to `google-sheets/`. Corrections are marked ⚠️ throughout.
>
> **Current status: Phase 0 and Phase 1 data recovery are COMPLETE.** All source data is
> now in the repo. The highest-risk item in the plan — hand-minting `fid`s, which would
> have broken every user's saved encounters — is gone: real `fid`s were recovered for all
> 3,330 sheet monsters.
>
> **Revision note (3rd pass, 2026-07-25).** Open decisions resolved with the repo owner —
> see "Decisions confirmed" at the top of Part 4 — and **Phase 1 is now implemented**
> (`scripts/reconcile.mjs`). Building it corrected four things earlier drafts had wrong:
>
> 1. The duplicate-name problem is **121 groups / 133 rows**, not 24 — the old figure
>    counted only the embedded dataset, not the full Sheets.
> 2. The embedded↔Sheets join needs **name + source book**, not name alone. Two official
>    Eberron monsters were being silently folded into unrelated Community homebrew that
>    merely shares their name, so the union is **3,370**, not 3,368.
> 3. The embedded stat block is stored **per name, not per printing** — all 24 reprint
>    pairs share one block, so half of them would have received their sibling's stats.
> 4. The Google Sheet itself contains data errors this surfaced: `Guardian Naga` and
>    `Spirit Naga` have `ac`, `hp` **and `init`** transposed with each other, and
>    `Smoke Mephit` has hp 2 for 22. ✅ Now corrected via `data/corrections.json`.
>
> **Phase 1.5 (tests) is also done** — the suite runs again on headless Chrome, 47/47
> green. See that section for the three pre-existing spec failures resolved and a latent
> `#/test` route crash fixed. `npm run build` remains broken and is not on the critical path.
>
> **Phases 3 and 4 are done — the app works again, homebrew included.** 3,369 monsters
> load from SQLite in the browser; search, filters and encounter maths all verified, and
> CSV/JSON homebrew import round-trips through a page reload. Suite is 75 green. One
> deliberate deviation and three real bugs are recorded in those sections.
>
> **Phase 2 is done** — `npm run data` builds `data/monsters.db` (1.86 MB) with all gates
> passing. It needs **no dependencies at all**: Node 24's built-in `node:sqlite` replaces
> `better-sqlite3`, which turned out to be unbuildable here. Two more plan errors corrected:
> `monster_printing`'s unique constraint was too strict (a monster can appear on two pages
> of one book), and one CR-less monster is necessarily excluded.

---

## Part 1 — Verification: Is Google Docs the database?

**Yes for the shipping app — but the repo also contains a second, richer, abandoned dataset.**

There are in fact *three* persistence layers here, only one of which is live.

### 1a. Monster catalog → Google Sheets (confirmed, and this is what actually runs)

`app/services/sheet-manager.service.js:7-9` hardcodes three Google Spreadsheet IDs:

```js
var sheetMetaData = {
    "1I5W-x8QOcP2siGCPIhWWzKGWt4vyBivYLbmkv_G1B24": { name: "Official",    timestamp: 0 },
    "1YR8NBDp8BP4Lz-CWChh6-8dOPN7aYV_dRD6g9ZBvNqM": { name: "Third-Party", timestamp: 0 },
    "1x6xC8fHZ6N6M2wOuwPTNdn0ObCPtdqeIBtXaLjHBMYQ": { name: "Community",   timestamp: 0 },
};
```

Each workbook has two tabs, `Monsters` and `Sources`, consumed by name in
`app/services/monsters.service.js:54,76`.

**The sheets themselves are not in the repo — only their IDs.** They are external documents
on Google's servers. The IDs appear in exactly three places: the file above,
`README.md:10-11` (master sheet + template links), and a stale copy inside the committed
`build/js/app-a04a87739c.js` bundle. Users add homebrew by publishing their own sheet and
pasting the URL; `sheetManager.addContent()` pulls the 44-character ID out with a regex.

### 1b. ⚠️ A 904-monster dataset committed inside a `.js` file

**File: `app/encounter-builder/search.controller.js`, line 9** — a `var data = [...]`
array on a single 630 KB line.

My first pass missed this because I searched for `.json`/`.csv` data files. The data is
real; it's just stored as a JavaScript literal, so a filename-based search never saw it.

The `wip` commit that introduced it is dated **15 August 2021 — two weeks after Google
decommissioned the Sheets v3 API**. Someone hit the outage and began escaping. They
inlined the dataset, copy-pasted `checkMonster` / `isFiltered` / `isNameMatched` out of
`scripts/monsterfactory.js` into the same file, and wrote a function literally named
`hackSources()` (line 147) that fakes the monsters-service shape.

**It was never wired up.** `hackSources()`'s result is assigned to `window.sources`
(line 184) and *nothing reads it* — it is not registered in Angular DI, so the running app
still calls the dead Sheets API. Two defects in that abandoned code:

- **`byCr` is broken.** Line 160 does `byCr[d.cr.string] = d` — assignment, not `.push()`.
  Only the last monster at each CR survives. Compare `monsters.service.js:72`, which
  correctly pushes into an array. Random-encounter generation reads `byCr`.
- **The environment filter would crash.** Line 69 calls
  `monster.environments.indexOf(...)`, but **zero** of the 904 entries have an
  `environments` field — a `TypeError` on undefined the moment anyone touches that filter.

### 1c. What the embedded data actually contains

904 entries, 880 distinct names. Verified field coverage:

| Field | Coverage | Notes |
|---|---|---|
| `name`, `cr`, `size`, `creatureType`, `tags`, `alignment`, `ac`, `hp`, `legendary`, `unique`, `source`, `sourcebook` | 904 / 904 | complete |
| `stats` (full block) | 901 / 904 | 3 Tortle Package entries lack it |
| `stats.str/dex/con/int/wis/cha` | 901 | `[score, saveBonus]` pairs |
| `stats.speed`, `.skills`, `.ac`, `.hp`, `.magicResistance`, `.conditionImmunities` | 901 | |
| `stats.damageImmunities` | 355 | |
| `stats.damageResistances` | 296 | |
| `stats.dcCon / dcWis / dcDex / dcStr / dcCha / dcInt` | 238 / 155 / 123 / 107 / 25 / 17 | save DCs |
| `stats.legendaryResistance` | 89 | |
| `stats.advantage` | 42 | |
| `stats.damageVuln` | 29 | |
| **`fid`** | **0** | ⚠️ missing — see 1e |
| **`environments`** | **0** | ⚠️ missing — see 1e |

Coverage by sourcebook — 15 books, all first-party:

```
253  Monster Manual                  25  Tales from the Yawning Portal
169  Basic Rules v1                  24  Out of the Abyss
141  Mordenkainen's Tome of Foes     15  Curse of Strahd
128  Volo's Guide to Monsters          9  Storm King's Thunder
 38  Eberron - Rising from the Last War  8  Rise of Tiamat
 33  Princes of the Apocalypse         5  Hoard of the Dragon Queen
 27  HotDQ supplement                  3  The Tortle Package
 26  Tomb of Annihilation
```

### 1d. ⚠️ Correction: the embedded data *does* have page numbers

I previously said it had none. Wrong — I checked for a `page` key. Page numbers live
**inside the `source` string**, in the identical format the Sheets use:

```
"Baphomet"    -> "Out of the Abyss: 235"
"Dragonclaw"  -> "Hoard of the Dragon Queen: 89, Rise of Tiamat: 89"
"Acolyte"     -> "Basic Rules v1: 53, HotDQ supplement: 4, Monster Manual: 342"
```

All 904 match `Name: page`. 306 are multi-source, comma-separated. This is the same
grammar `monsterfactory.js:49-72` already parses, so the existing parser works unmodified.

Ignore `stats.src` entirely — it is corrupt. 47 distinct values that mix short codes
(`volos`, `tomb`), empty strings, and full `"Eberron - Rising from the Last War: 286"`
strings. `source` and `sourcebook` are clean; `stats.src` is not.

### 1e. What the embedded data lacks — ✅ now recovered from the Sheets

The embedded dataset has no `fid`, no `environments`, no `section`/`init`, and no
Sources-tab metadata. All of it has since been recovered (see 1j).

- **`fid`** — the stable public identifier (`"mm.goblin"`). `monsterfactory.js:21` keys
  every monster on `guid || fid`; saved encounters in `localStorage` reference it.
  Recovered for all 3,330 sheet monsters, plus `guid` for 1,543 of them.
- **`environments`** — powers a shipped filter (`search.html:37`). Recovered for 2,436.

### 1j. ⚠️ The Google Sheets are alive — full data recovered

All three workbooks still respond. The modern no-API-key read endpoint is:

```
https://docs.google.com/spreadsheets/d/<SHEET_ID>/gviz/tq?tqx=out:csv&sheet=<TabName>
```

Exports now committed under `google-sheets/`:

| Sheet | Monsters tab | rows | Sources tab | sources |
|---|---|---|---|---|
| Official | `data.csv` | 911 | `sources.csv` | 16 |
| Third-Party | `data-2.csv` | 1,250 | `sources-2.csv` | 9 |
| Community | `data-3.csv` | 1,169 | `sources-3.csv` | 6 |
| **Total** | | **3,330** | | **31** |

Monsters-tab columns — note `fid`, `guid`, and `environment` are all present:

```
guid, fid, name, cr, size, type, tags, section, alignment,
environment, ac, hp, init, lair?, legendary?, unique?, sources
```

**Validation results** (`node scripts/inspect-sheets.mjs`) — the data is clean:

- **0** duplicate `fid` across all 3,330 rows · **0** duplicate `guid`
- **0** invalid CR · **0** invalid size · **0** invalid environment
- **31 source names referenced, 31 declared, 0 unresolved, 0 unused** — perfect
  referential integrity. This is the check the app never performs; the data passes it.
- Gaps: 1,787 rows lack `guid` (harmless — `monsterfactory.js:21` falls back to `fid`);
  1 Community row lacks `cr`; 894 lack `environment`.

⚠️ **Use gviz to recover, not to rebuild on.** Depending on it long-term would recreate
exactly the vendor dependency that broke this app.

### 1k. How the two datasets combine

They overlap heavily but neither contains the other:

| | Count |
|---|---|
| Sheet monsters | 3,330 |
| Embedded monsters | 904 |
| **Matched** (name + shared source book) | **864** |
| Embedded-only (not in any sheet) | **40** |
| **Union** | **3,370** |

The 40 embedded-only monsters are **38 from Eberron – Rising from the Last War**, plus one
each from Out of the Abyss and Princes of the Apocalypse. Eberron is **not declared in any
Sources tab** — the sheets predate that book, so the embedded dataset is genuinely *newer*
for it. ⚠️ Importing those 38 requires adding a new `source` row for Eberron.

*(Earlier drafts said 866 / 38 / 3,368, matching on name alone. Two of those "matches" were
different monsters sharing a name — see Phase 1.)*

Stat-block coverage after the merge is very uneven:

| Sheet | with stat block | total |
|---|---|---|
| Official | 864 | 911 (95%) |
| Third-Party | 26 | 1,250 (2%) |
| Community | 33 | 1,169 (3%) |

So ~2,466 monsters will have no stat block. `monster_stats` must stay fully nullable and
the UI must degrade gracefully — which it already does, since the Sheets never had stats.

### 1f. ⚠️ Duplicate names — corrected scope, and they are already separate rows

Two earlier drafts said "24 names appear twice." That count was measured against the
*embedded* dataset only. Measured against the full recovered Sheets, the real figure is:

| | Count |
|---|---|
| Duplicate-name groups across all 3 sheets | **119** |
| — of size 2 / 3 / 4 | 109 / 8 / 2 |
| Extra rows beyond the first in each group | **131** |
| Groups confined to one sheet | 41 (Official 22, Community 10, Third-Party 9) |
| Groups spanning two or more sheets | **78** |
| Groups where `cr` *and* `hp` agree across printings | 21 of 119 |

The archetypal case is a genuine reprint with different stats:

```
Baphomet | abyss.baphomet | Out of the Abyss: 235            | hp 333
Baphomet | mtof.baphomet  | Mordenkainen's Tome of Foes: 143 | hp 275
```

**Crucially, the Sheets already keep these apart** — every one has its own `fid`, and
there are 0 duplicate `fid`s in 3,330 rows. `monsterfactory.js:21` keys on `guid || fid`,
so nothing merges them today either. `Monster.prototype.merge()` is therefore *not* the
culprit for these; the only real defect is a **display ambiguity** — two entries labelled
`Baphomet` in the picker with nothing distinguishing them.

⚠️ Note the composition: **78 of the 119 sheet groups span different sheets**, meaning they are
usually not one book reprinting another but Official / Third-Party / Community each
publishing something of the same name. "Most recent printing" has no meaning for those.
See Phase 1 for how the suffix rule handles both cases.

There are also 10 `(in lair)` variants, which are correctly modelled as separate monsters
(different CR), consistent with the README's guidance.

### 1g. User data → browser localStorage (unchanged, not Google)

| Key | Written by | Contents |
|---|---|---|
| `5em-library` | `library.service.js:34` | Saved encounters & monster pools |
| `5em-encounter` | `encounter.service.js:209` | Current working encounter |
| `5em-players` | `players.service.js:120` | Parties and player characters |
| `5em-party-info` | `party-info.service.js:72` | Party level/size config |
| `5em-filters` | `encounter-builder.controller.js:33` | UI filter state |
| `5em-sheet-meta` | `sheet-manager.service.js:134` | Registered sheet IDs + timestamps |
| `5em-sheet-cache:<id>` | `sheet-manager.service.js:55` | **Full cached copy of each sheet** |

`firebaserules.json` sits in the repo root but **nothing references Firebase** — no SDK,
no config, no code path. Dead weight from an abandoned experiment.

### 1h. 🔴 The live data pipeline is dead

`app/services/sheet-loader.service.js:88` fetches the **Google Sheets GData v3 API**:

```js
var url = "https://spreadsheets.google.com/feeds/worksheets/" + id + "/public/full";
script.src = url + "?alt=json-in-script&callback=" + callbackName;
```

Google retired v3 on 3 March 2020 and fully decommissioned it on 2 August 2021. The
replacement (Sheets API v4) **requires an API key**, which a static site cannot hold —
so this cannot be fixed in place.

The failure mode is worse than an error. `getSheetsJsonp` resolves its `$q.defer()` only
from inside the JSONP callback (line 45). If the script tag 404s, that callback never
fires and **the promise never settles** — neither resolved nor rejected. The `.catch()` in
`loadLive()` meant to fall back to cache never runs. A first-time visitor gets a
permanently empty monster list and no error.

Existing users may still appear to work only because `5em-sheet-cache:<id>` holds a
pre-shutdown snapshot — one browser-data clear from gone.

**This is the repair, not an optimization.**

### 1i. Other problems found

- **AngularJS 1.5.9** — EOL since December 2022, unpatched CVEs.
- **The build is broken.** `gulp@3.9.1` cannot run on Node 12+; `node-sass@6` is
  deprecated. `npm run build` will not complete on any current machine.
- **`build/` is committed** — a stale bundle already diverging from source.
- **No referential integrity.** Monster→source linking is string matching on display name.
  A mismatch makes `isInSource()` (`monsterfactory.js:300`) return false and the monster
  vanishes from every view, silently. The README's own caveat — "If the names don't match
  exactly, monsters won't be linked correctly" — is a foreign key implemented as a typo risk.
- **Every filter is a full linear scan.** `monsterfactory.js:269` carries a comment
  admitting this runs "tens of thousands of times per keystroke."

---

## Part 2 — Database recommendation

### Recommendation: **SQLite**, committed to the repo, queried in-browser via `sql.js`

SQLite is public domain, zero-config, serverless, and its entire database is one ordinary
file — which is exactly your stated requirement, "something I could add to a repo in
GitHub," met literally. `data/monsters.db` is versioned with the code that reads it and
deployed by the same `git push`.

It **preserves the static-site architecture**. Compiling SQLite to WebAssembly (`sql.js`)
lets the browser run real SQL against a file served over HTTP — no server, no API keys, no
CORS, no rate limits, works offline, free on GitHub Pages forever.

The dataset makes it easy: ~2,000 monsters *with* full stat blocks is roughly 5–10 MB of
SQLite, comparable to the 630 KB of JSON already being shipped inside a controller file
plus the AngularJS bundle.

| Option | Free? | Verdict |
|---|---|---|
| **SQLite + sql.js** | Yes, unconditionally | ✅ **Chosen.** File-in-repo, static hosting, offline, no vendor. |
| **PostgreSQL** (self-host) | Yes (OSS) | Better engine, but needs a server. Destroys static deployment for a read-mostly 2k-row catalog. |
| **Supabase** (hosted PG) | 500 MB tier | Worth it *only* if you want cross-device sync + auth. Adds a vendor that pauses idle projects. |
| **Neon** (hosted PG) | 0.5 GB tier | Same tradeoff; cold starts. |
| **DuckDB-WASM** | Yes (MIT) | Analytics-oriented; this is a point-lookup workload. Bigger payload. |
| **MySQL/MariaDB** | Yes (OSS) | Server-required, no advantage over Postgres. |

**The decisive argument:** this app broke because it depended on a free external service
that changed its terms. Swapping Google Sheets for a hosted-Postgres free tier repeats
that mistake in a new outfit. A SQLite file in the repo has no external dependency at all.

**Escape hatch:** the schema below is portable. If you later want accounts and sync, the
same DDL runs on Postgres with only the noted type changes.

---

## Part 3 — Schema design

⚠️ **Revised.** The original schema modelled only the thin Sheets columns. It had nowhere
to put ability scores, speed, skills, or damage resistances, and it modelled reprints as
a lossy merge. Both are fixed below.

The core moves: (1) fields currently stored as delimited strings and re-parsed on every
page load become real tables; (2) a monster's *identity* is separated from its
*per-book printing*, so Baphomet-in-Out-of-the-Abyss and Baphomet-in-Mordenkainen's can
both exist with their own stats.

```sql
PRAGMA foreign_keys = ON;

-- Challenge Rating lookup. Replaces app/meta/crInfo.js (CR 0..30 -> XP).
CREATE TABLE cr (
    numeric   REAL PRIMARY KEY,      -- 0, 0.125, 0.25, 0.5, 1..30
    label     TEXT NOT NULL UNIQUE,  -- "0", "1/8", "1/4", "1/2", "1"...
    xp        INTEGER NOT NULL       -- 10, 25, 50, 100, 200...
);

CREATE TABLE source (
    id                INTEGER PRIMARY KEY,
    name              TEXT NOT NULL UNIQUE,  -- "Monster Manual"
    short_name        TEXT,                  -- "MM"  (from Sheets Sources tab)
    type              TEXT,                  -- Official | Official Adventure |
                                             -- Third-Party | Community | Homebrew
    link              TEXT,
    default_selected  INTEGER NOT NULL DEFAULT 0 CHECK (default_selected IN (0,1))
);

-- ── Monster identity ────────────────────────────────────────────────
CREATE TABLE monster (
    id              INTEGER PRIMARY KEY,
    fid             TEXT NOT NULL UNIQUE,  -- "mm.goblin" — stable public ID
    name            TEXT NOT NULL,
    section         TEXT,
    size            TEXT CHECK (size IN
                      ('Tiny','Small','Medium','Large','Huge','Gargantuan')),
    size_sort       INTEGER NOT NULL,      -- 1..6, precomputed (replaces parseSize)
    type            TEXT NOT NULL,         -- "Dragon", "Humanoid", ... (14 values)
    cr_numeric      REAL NOT NULL REFERENCES cr(numeric),
    ac              INTEGER,
    hp              INTEGER,
    init            INTEGER,
    ac_text         TEXT,                  -- non-numeric fallback, e.g. "18 (natural armor)"
    hp_text         TEXT,
    alignment_text  TEXT,                  -- verbatim, e.g. "chaotic evil"
    alignment_flags INTEGER NOT NULL,      -- precomputed bitmask (replaces parseAlignment)
    legendary       INTEGER NOT NULL DEFAULT 0 CHECK (legendary  IN (0,1)),
    lair            INTEGER NOT NULL DEFAULT 0 CHECK (lair       IN (0,1)),
    unique_npc      INTEGER NOT NULL DEFAULT 0 CHECK (unique_npc IN (0,1)),
    special         INTEGER NOT NULL DEFAULT 0 CHECK (special    IN (0,1)),
    searchable      TEXT NOT NULL          -- precomputed lowercase search blob
);

-- ── ⚠️ NEW: stat block, 1:1 optional with monster ───────────────────
-- Holds the data found only in the embedded dataset. Nullable throughout:
-- 3 of 904 entries have no stat block, and Sheets-only monsters will have none.
CREATE TABLE monster_stats (
    monster_id            INTEGER PRIMARY KEY REFERENCES monster(id) ON DELETE CASCADE,
    str INTEGER, str_save INTEGER,
    dex INTEGER, dex_save INTEGER,
    con INTEGER, con_save INTEGER,
    int INTEGER, int_save INTEGER,
    wis INTEGER, wis_save INTEGER,
    cha INTEGER, cha_save INTEGER,
    speed                 TEXT,     -- "40 ft." — free text, kept verbatim
    magic_resistance      INTEGER CHECK (magic_resistance IN (0,1)),
    legendary_resistance  INTEGER,  -- uses/day
    dc_str INTEGER, dc_dex INTEGER, dc_con INTEGER,
    dc_int INTEGER, dc_wis INTEGER, dc_cha INTEGER,
    damage_resistances    TEXT,
    damage_immunities     TEXT,
    damage_vulnerabilities TEXT,
    advantage             TEXT
);
-- Note: the source encodes abilities as [score, saveBonus] pairs where the second
-- element is null when the creature has no save proficiency. Split into two columns.

CREATE TABLE skill (
    id   INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE        -- "Perception", "Intimidation", ...
);

CREATE TABLE monster_skill (
    monster_id INTEGER NOT NULL REFERENCES monster(id) ON DELETE CASCADE,
    skill_id   INTEGER NOT NULL REFERENCES skill(id)   ON DELETE CASCADE,
    bonus      INTEGER NOT NULL,
    PRIMARY KEY (monster_id, skill_id)
);

CREATE TABLE condition (
    id   INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE        -- "charmed", "frightened", ...
);

CREATE TABLE monster_condition_immunity (
    monster_id   INTEGER NOT NULL REFERENCES monster(id)   ON DELETE CASCADE,
    condition_id INTEGER NOT NULL REFERENCES condition(id) ON DELETE CASCADE,
    PRIMARY KEY (monster_id, condition_id)
);

-- ── Classification ──────────────────────────────────────────────────
CREATE TABLE environment (
    id   INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE  -- aquatic, arctic, cave, coast, desert, dungeon, forest,
);                             -- grassland, mountain, planar, ruins, swamp,
                               -- underground, urban  (14 values)

CREATE TABLE monster_environment (
    monster_id     INTEGER NOT NULL REFERENCES monster(id)     ON DELETE CASCADE,
    environment_id INTEGER NOT NULL REFERENCES environment(id) ON DELETE CASCADE,
    PRIMARY KEY (monster_id, environment_id)
);

CREATE TABLE tag (
    id   INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE  -- "Demon", "Shapechanger", "Dwarf", ... (51 values)
);

CREATE TABLE monster_tag (
    monster_id INTEGER NOT NULL REFERENCES monster(id) ON DELETE CASCADE,
    tag_id     INTEGER NOT NULL REFERENCES tag(id)     ON DELETE CASCADE,
    PRIMARY KEY (monster_id, tag_id)
);

-- ── ⚠️ NEW: per-book printings, replacing the lossy merge() ─────────
-- Parses "Out of the Abyss: 235, Mordenkainen's Tome of Foes: 143" into rows.
-- Duplicate names (121 groups, see 1f) are NOT resolved here — they already arrive as
-- separate rows with distinct fids, and the reconciliation step suffixes the display
-- name (-1, -2, ...). Every row in this table therefore describes exactly one printing
-- of exactly one monster identity, with nothing left to arbitrate.
CREATE TABLE monster_printing (
    id           INTEGER PRIMARY KEY,
    monster_id   INTEGER NOT NULL REFERENCES monster(id) ON DELETE CASCADE,
    source_id    INTEGER NOT NULL REFERENCES source(id)  ON DELETE CASCADE,
    page         INTEGER,
    url          TEXT,
    ac           INTEGER,   -- nullable: only set when this printing differs
    hp           INTEGER,
    cr_numeric   REAL REFERENCES cr(numeric),
    UNIQUE (monster_id, source_id)
);

-- ── Indexes matching the real filter predicates (monsterfactory.js:184-255) ──
CREATE INDEX idx_monster_cr    ON monster(cr_numeric);
CREATE INDEX idx_monster_type  ON monster(type);
CREATE INDEX idx_monster_size  ON monster(size);
CREATE INDEX idx_monster_name  ON monster(name);
CREATE INDEX idx_print_source  ON monster_printing(source_id);
CREATE INDEX idx_menv_env      ON monster_environment(environment_id);
CREATE INDEX idx_mtag_tag      ON monster_tag(tag_id);

CREATE VIRTUAL TABLE monster_fts USING fts5(
    name, section, type, tags,
    content = 'monster', content_rowid = 'id'
);
```

**Design notes**

- `ac`/`hp` keep both INTEGER and `_text` columns, because `monsterfactory.js:25-36`
  parses an int and *falls back to the raw string* for values like `"18 (natural armor)"`.
  Splitting preserves the data and makes numeric sort correct.
- `alignment_flags` precomputes the bitmask that `parseAlignment()` builds today, deleting
  ~60 lines of per-load regex (`monsterfactory.js:100-156`) from every visitor's browser.
- `unique_npc`, not `unique` — reserved word. Likewise `int`/`str` in `monster_stats` are
  quoted-safe in SQLite but rename if you ever port to a stricter engine.
- Reprint conflicts are resolved before the data reaches this schema (see Phase 1) —
  each conflicting printing becomes its own `monster` row with a suffixed name, so
  `monster_printing` never needs to arbitrate between two stat blocks for one identity.
- **Postgres portability:** `INTEGER PRIMARY KEY` → `GENERATED ALWAYS AS IDENTITY`,
  `INTEGER CHECK (x IN (0,1))` → `BOOLEAN`, FTS5 → `tsvector`. Nothing else changes.

---

## Part 4 — Migration plan

Scope confirmed: **data layer only.** AngularJS, controllers, filters, and templates stay.

Strategy: make the swap invisible. `monsters.service.js` already exposes a stable
interface — `{ all, byCr, byId, check, loadSheet, removeSheet }` — that every consumer
reads through. If the new DB layer populates those same structures, no controller, filter,
or template needs to change.

**Decisions confirmed with the repo owner (2026-07-25):**

1. Reprint conflicts are resolved by renaming, not merging — see Phase 1.
2. Sheets values win over the embedded stat block for headline `ac`/`hp`/`cr`.
3. The 38 embedded-only monsters get auto-minted `fid`s and an auto-added Eberron
   source row — no hand review required.
4. Custom-content (homebrew) support is kept, via local file import — in scope now,
   not deferred to a later phase.
5. `sql.js` is vendored in the repo, not loaded from a CDN.
6. The broken build pipeline (gulp 3 / node-sass) is fixed now, moved up to Phase 1.5,
   because Phase 5 verification depends on a working test runner.
7. A ~5–10 MB `data/monsters.db` is an acceptable repo/hosting size.
8. Ship a one-time cleanup of stale `5em-sheet-cache:*` / `5em-sheet-meta` keys.

---

### ⚠️ Phase 0 — Extract the embedded data (revised)

**Previously:** "recover the Google Sheets, they're the only copy." That was wrong and it
inverted the priority. The safe copy is already in git; it's the *Sheets* that are at risk.

1. ✅ **Done.** `scripts/extract-embedded.mjs` pulls the `var data = [...]` literal out of
   `app/encounter-builder/search.controller.js` into `data/raw/embedded-monsters.json`
   (904 entries, 808 KB, verified byte-for-byte lossless on round-trip). Commit both.
   *This turns a 630 KB unreviewable JS line into a diffable data file.*
   The script is read-only w.r.t. the source and safe to re-run.
2. ✅ **Done.** All three Sheets recovered to `google-sheets/` — 3,330 monsters
   (`data*.csv`) and 31 sources (`sources*.csv`). See 1j.
3. ✅ **Done.** `scripts/inspect-sheets.mjs` validates the exports and reports
   integrity, field validity, source resolution, and overlap with the embedded data.

*Exit criteria met: all source data is in the repo and validates clean.
Nothing downstream depends on Google any more.*

---

### ⚠️ Phase 1 — Reconcile the two datasets (risk substantially reduced)

The two sources are **complementary, not redundant**:

| | Embedded (904) | Sheets (3,330) |
|---|---|---|
| Full stat blocks | ✅ | ❌ |
| Page numbers | ✅ (inside `source`) | ✅ |
| `fid` / `guid` | ❌ | ✅ |
| `environment` | ❌ | ✅ (2,436) |
| Third-party / community | ❌ | ✅ |
| Source metadata (short name, type, link) | ❌ | ✅ |
| Eberron content | ✅ (36) | ❌ |

**Join key: normalised name + source book, with a required overlap check.** Name alone is
not sufficient, for two separate reasons found during implementation:

1. 99 embedded rows have a name matching more than one sheet row (see 1f). The embedded
   `source` field is byte-identical to the sheet's `sources` column, so it disambiguates.
2. ⚠️ A *unique* name is not sufficient either. Two official Eberron monsters — `Dolgrim`
   and `Iron Defender` — share a name with unrelated Community homebrew (`Monster-A-Day`,
   `Critter Compendium`). Matching on name alone silently folded an official monster into
   a Reddit homebrew entry. **The join therefore requires at least one shared source book**
   before merging two records.

| Embedded row outcome | Count |
|---|---|
| Name unique in the sheets **and** source book agrees → matched | 765 |
| Name ambiguous → resolved by exact `source` string | 99 |
| **Still ambiguous after both keys** | **0** |
| No sheet match (Eberron ×38, plus 2 others) | 40 |

**864 matched, 40 unmatched, 0 ambiguous** — the join is fully deterministic.

- **In both (864)** → Sheets supply `fid`/`guid`/`environment`/`section`; embedded supplies
  the stat block.
- **Sheets only (2,466)** → carry over with `monster_stats` empty. The app already renders
  fine without stats — that is today's behaviour.
- **Embedded only (40)** → ✅ **mint `fid`s automatically** via the README rule
  (`source-code.kebab-name`); no hand review. 38 are Eberron, so the build also adds a
  new `source` row automatically: `Eberron - Rising from the Last War`, type `Official`,
  short name `ERLW`, fid prefix `erlw`. The other 2 (`Hook Horror Spore Servant`,
  `Ogremoch`) belong to books the sheets already declare, and their fid prefix is derived
  from existing data rather than hardcoded. The build *fails loudly* if a minted `fid`
  collides with an existing one.

⚠️ **The embedded stat block is shared, not per-printing.** The dataset stores one block
per *name*: all 24 duplicate-name pairs carry a byte-identical block, so a reprint with
different hp is carrying its sibling's stats. Where a **shared** block's hp contradicts the
row it landed on, it is **withheld** (9 rows) — those monsters get no stat block rather
than a wrong one. Where the block is **unique** to its monster, it genuinely is that
monster's, so it is attached and any disagreement is **flagged for review** (8 rows).
That flagged list is worth reading: it surfaced two pre-existing errors in the Google
Sheet — `Guardian Naga` and `Spirit Naga` have their `ac` *and* `hp` transposed, and
`Smoke Mephit` has hp 2 instead of 22.

**The `fid` risk is largely retired.** Every pre-existing monster keeps its real `fid`, so
users' saved encounters survive. Only the 38 newly-minted IDs are novel, and those
reference monsters no saved encounter can already contain.

**Resolve duplicate names by renaming, not merging.** Every row keeps its own real Sheets
`fid` and becomes its own `monster` row — which is already how the data arrives, so this
is purely a **display-name** change to make the two distinguishable in the picker:

- Within each of the **121 duplicate-name groups** (119 in the sheets, plus `Dolgrim` and
  `Iron Defender` once their Eberron versions stop being wrongly merged), one row keeps the
  plain name (`Baphomet`) and the rest take a numeric suffix — `Baphomet-1`, `-2`, `-3`.
- **Ordering rule:** the **most recently published** printing takes the suffix; the earlier
  printing keeps the plain name. So `abyss.baphomet` (2015) stays `Baphomet` and
  `mtof.baphomet` (2018) becomes `Baphomet-1`.
- ⚠️ **78 of the groups span different sheets**, where publication chronology doesn't
  apply (Official vs Community are not editions of each other). For those, fall back to a
  deterministic tiebreak: **Official keeps the plain name, then Third-Party, then
  Community**; ties within a sheet break on `fid` ascending. This needs no per-row
  judgement and is stable across rebuilds.
- ⚠️ Publication dates exist **nowhere in the source data**, so `reconcile.mjs` carries a
  small hand-maintained `PUBLISHED` table for the 15 official books. Anything absent from
  it sorts last and falls through to the sheet-priority tiebreak above — so the table is
  an improvement, never a correctness dependency.
- No `is_canonical` flag and no merge step. `monster_printing` records each row's own
  source/page and never has to arbitrate between two stat blocks.

⚠️ **`fid` is unaffected by the rename** — suffixes apply to the display `name` column only.
Saved encounters in `localStorage` reference `fid`, so renaming cannot break them.

✅ **Resolved:** `ac`/`hp`/`cr` on each row come from the Sheets, not the embedded stat
block (they're what the app has always shown, so encounter XP stays stable). The embedded
stat block attaches to whichever row the name+source join selects.

*Exit criteria: one reconciled intermediate JSON + a written report of the minted `fid`s
and applied name suffixes.*

✅ **Sheet data errors are corrected.** `data/corrections.json` holds an auditable overlay
applied by `reconcile.mjs`; the CSVs under `google-sheets/` stay a verbatim record of what
Google returned and are never edited. Each change asserts the value it replaces, so if a
future re-export fixes one upstream the build **fails** rather than silently reverting it.

| fid | field | was | now |
|---|---|---|---|
| `mm.guardian-naga` | ac / hp / init | 15 / 75 / 3 | **18 / 127 / 4** |
| `mm.spirit-naga` | ac / hp / init | 18 / 127 / 4 | **15 / 75 / 3** |
| `mm.smoke-mephit` | hp | 2 | **22** |

The two nagas had **three** columns transposed with each other, not two as first reported —
`init` as well as `ac` and `hp`. Each monster's stat block is internally consistent with
its own CR and dex (Guardian Naga CR 10, dex 18 → ac 18, hp 127, init +4; Spirit Naga
CR 8, dex 17 → ac 15, hp 75, init +3), while the sheet gave the CR 8 monster more hp than
the CR 10 one. Smoke Mephit was a dropped digit; its ac and init were already right.
Applying these dropped the flagged hp discrepancies from 8 to 5.

✅ **Done.** `scripts/reconcile.mjs` produces, with all validation gates passing:

```
data/reconciled/monsters.json   3,370 monsters (3,370 distinct fid, 3,370 distinct name)
data/reconciled/sources.json       32 sources (31 declared + Eberron)
data/reconciled/REPORT.md          40 minted fids · 133 renames · 9 withheld · 5 flagged
```

Gates enforced by the script, all currently clean: no duplicate `fid`, no duplicate display
name surviving, no monster citing an undeclared source, no minted `fid` colliding, no
ambiguous join. It exits non-zero on any failure, so it is safe to wire into CI.

---

### ⚠️ Phase 1.5 — Fix the build and test tooling (moved up from Phase 6)

**Why this moved.** Phase 5 verification leans on the existing Karma specs passing —
that is the strongest evidence the swap was transparent. The test runner did not run at
all, so without this, Phase 5 proves nothing.

#### ✅ Test tooling — done

`npm test` now runs. The suite is **47 passing, 0 failing** on pre-migration `master`.

| Change | Why |
|---|---|
| `karma` 1.3 → 6.4 | 1.x does not run on current Node |
| **PhantomJS → `ChromeHeadless`** | PhantomJS was abandoned in 2018; its launcher no longer installs. Removed `karma-phantomjs-launcher`; `karma.conf.js` now uses `ChromeHeadless` |
| `karma-chrome-launcher` 2 → 3, `karma-firefox-launcher` 1 → 2 | compatibility with karma 6 |
| `node-sass` 6 → `sass` (dart-sass) | `node-sass` cannot build natively on Node 24. Pure-JS, no native step |

Three pre-existing spec failures were found and resolved:

1. **`combat.service.tests.js` — stale test, correct code.** `rollInitiative` uses
   `_.random(1, 20)` (a correct d20), but the spec stubbed the roll and expected `12`,
   encoding an older `_.random(0, 19) + 1` form. Expectation corrected to `11`.
   *No application code changed.*
2. **`monsters.service.tests.js` — deferred, not fixed.** It asserts `all`/`byCr`/`byId`
   are populated; they are empty because the Sheets pipeline is dead (1h). ⚠️ Marked
   `xit` with a comment pointing here — **Phase 3 must change it back to `it`.** It
   passing is the proof the data-layer swap was transparent.
3. **`scripts/data.tests.js` — deleted as obsolete.** It injected a `monsterData` service
   that has never existed in this repo, and asserted `sources.length === 18`, a number
   matching no sheet (Official declares 16; all three declare 31).

🔴 **Latent crash fixed while here.** `app/test.controller.js` injected two services that
do not exist — `monsterData` and `filters` — and `app.routes.js:94` routes `/test` to it,
so visiting `#/test` threw `$injector:unpr`. Both removed; the route now renders,
verified in a browser.

#### ⬜ Build tooling — still outstanding

`npm run build` **does not yet work.** The blocker is larger than it first appeared:
`gulpfile.js` is written against gulp 3's `gulp.task(name, [deps], fn)` signature, which
gulp 4 removed, and it drives 18 gulp plugins, several long abandoned (`gulp-util`,
`gulp-minify-css`). This is a rewrite, not an upgrade.

It is **not on the critical path**: the app is a static site, `npm start` serves it
directly with `http-server`, and the build only produces the optimised `build/` bundle.
Phases 2–3 and the test suite all work without it.

*Exit criteria: ✅ full spec suite passes on unmodified `master` (47/47) — this is the
baseline every later phase is diffed against. ⬜ `npm run build` succeeds.*

---

### Phase 2 — Build the database

`scripts/build-db.mjs` reads the reconciled JSON and emits `data/monsters.db`, performing
once what `monsterfactory.js` currently does on every page load:

- split `environments` / `tags` on `/\s*,\s*/` → join tables
- parse `"Source: 54"` / `"Source: https://..."` → `monster_printing`
  *(the existing parser at `monsterfactory.js:49-72` works unchanged on the embedded
  `source` field — same grammar)*
- run the alignment regex ladder → `alignment_flags`
- split `[score, save]` ability pairs → `monster_stats` columns
- map size → `size_sort`; build `searchable`; populate `monster_fts`

✅ **Zero dev dependencies.** The plan originally called for `better-sqlite3`; it is not
needed and not used. Node 24 ships **`node:sqlite`** (SQLite 3.50.1) built in, with FTS5,
partial indexes and foreign keys all available. `better-sqlite3` was in fact *unbuildable*
here — it needs a native compile and picks up an ancient hoisted `node-gyp@7` that fails on
Node 24. The built-in module sidesteps the native-build problem entirely. The CSV parser is
the local `scripts/lib/csv.mjs`. Nothing ships to the browser.

⚠️ **`crInfo` and `alignments` are read from the app, not re-typed.** `scripts/lib/angular-meta.mjs`
runs `app/meta/crInfo.js` and `app/meta/alignments.js` in a sandbox with a stub `angular`
and calls the registered factory. Both are dependency-free IIFEs, so this works — and it
means the CR→XP table and the alignment bitmasks in the database cannot drift from the
definitions the app itself uses. The loader throws if either gains a dependency.

**Validation gates the build.** Fail loudly on:
- duplicate `fid`
- a monster referencing a source name absent from the Sources tab *(today the monster
  loads but `isInSource()` — `monsterfactory.js:300` — returns false, so it is silently
  filtered out of every view)*
- duplicate source name across sheets *(today `monsters.service.js:81` logs a warning and
  skips registering it)*
- a `cr` value not in the `cr` table
- unparseable alignment *(today: `console.warn` and a fallthrough to `unaligned`)*
- a minted `fid` colliding with a real one
- a duplicate display `name` surviving into the final table — the suffix rule must have
  covered every one of the 121 groups
- a monster citing a source no Sources tab declares
- an alignment string the regex ladder cannot parse

Converting the README's "if the names don't match exactly" footgun into a build error is
most of the value of this migration.

✅ **`.gitattributes` fixed.** `*.db binary` and `*.wasm binary` added — the file contained
only `* text=auto`, which *would* have corrupted the committed SQLite file through
line-ending conversion. Verified with `git check-attr` (`text: unset`, `binary: set`) and
`git diff --numstat`, which now reports the file as binary.

### ✅ Phase 2 — done

```
npm run data          # reconcile + build, from source data to database
```

| Table | Rows |  | Table | Rows |
|---|---|---|---|---|
| `monster` | 3,369 | | `monster_printing` | 3,752 |
| `monster_stats` | 892 | | `monster_environment` | 7,257 |
| `source` | 32 | | `monster_tag` | 1,392 |
| `cr` | 34 | | `monster_skill` | 1,328 |
| `tag` | 153 | | `monster_condition_immunity` | 1,277 |
| `environment` | 14 | | `skill` / `condition` | 20 / 18 |

**`data/monsters.db` is 1.86 MB** — well under the 5–10 MB the plan estimated, and about
3× the 630 KB blob already being shipped inside a controller file today.

Verified after build: alignment bitmasks match `alignments.js` exactly for every form
tested, **0** monsters with unparseable alignment, **0** printings with a dangling source,
**0** monsters with no printing, **0** orphan stat blocks, and FTS5 / environment /
CR→XP joins all return correct results.

Two things the build surfaced that the plan had wrong:

1. ⚠️ **`UNIQUE (monster_id, source_id)` on `monster_printing` is wrong** and had to be
   replaced. A monster *can* appear twice in one book: `tob.ratfolk-rogue` is on both
   page 320 and page 424 of Tome of Beasts. The identity of a printing is book **and**
   page, so the constraint is now a unique index over
   `(monster_id, source_id, COALESCE(page,-1), COALESCE(url,''))`.
2. ⚠️ **One monster is excluded: `cc.abyssal-eviscerator`** (Abyssal Eviscerator, Critter
   Compendium p.44) has no `cr`. CR is required for encounter maths and CR filtering, and
   inventing one would be fabricating data, so the build skips it and says so loudly. It
   was already effectively broken pre-migration — the app looks up `crInfo[""]`, gets
   `undefined`, and the monster falls out of `byCr`. Giving it a `cr` in
   `data/corrections.json` is all that is needed to include it.

The gate distinguishes **corrupt** from **absent**: a CR that is present but unrecognised
fails the build; a CR that is missing skips the row with a warning.

---

### ✅ Phase 3 — Swap the client data layer — DONE

**The application works again.** Verified in a browser: 3,369 monsters load, 34 CR
buckets, 32 sources. Search, the source filter, and the environment filter (§1b's
guaranteed `TypeError`) all work. Adding 3 Goblins gives Total XP 150 → Adjusted XP 300 →
"Hard" for a level-1 party of four, which is the correct 5e result.

⚠️ **Deliberate deviation from the plan below.** The plan called for `parseAlignment`,
`parseSize` and the source regex to become no-ops, reading the precomputed
`alignment_flags` / `size_sort` / `searchable` columns instead. **That was not done.**
`monsters.service.js` shapes its SQL output to look exactly like the old sheet rows —
delimited strings, CR labels — and feeds it through an **unmodified**
`monsterFactory.Monster`. Changing where the data comes from *and* how monster objects are
built in one step would make any regression impossible to attribute to one or the other,
and the plan's own instruction two paragraphs down is "one change at a time". The
precomputed columns are built and sitting in the database, unused, until Phase 6 — which
is also where the plan already defers the rest of the filtering work.

Two things found while doing it:

1. 🔴 **`unique_npc` had to be aliased back to `unique` in the SQL.** The column is named
   `unique_npc` only because `unique` is a reserved word, but `monsterfactory.js:47` reads
   `args.unique`. Without the alias every monster silently becomes non-unique, which would
   have quietly broken the "unique" filter and random-encounter generation.
2. ⚠️ **`all` / `byId` / `byCr` were module-level globals** in the old service, outside the
   factory. That works in a browser (one injector per page load) but leaks state between
   tests. They are now scoped to the injector, which is both correct Angular and what
   makes the restored spec reliable.

**Test suite: 47 → 55 passing.** The deferred spec is restored, but it could not simply be
un-`xit`-ed: it asserted a *synchronous* side effect that no longer exists now that loading
is async. It is rewritten to mock `db` and assert the real load path — byId keying, byCr
grouping, name sort, delimited-column parsing, multi-source page numbers, boolean flags,
and source registration with default filter states.

⚠️ **Deployment note.** The `.wasm` must be served as `application/wasm`. `http-server`
does not, and sql.js falls back to slower `ArrayBuffer` instantiation with a console
warning. GitHub Pages sets it correctly, so this only affects local dev.

`search.controller.js` went from **647 KB to 2.9 KB** — the inline `var data = [...]` blob,
`hackSources()`, and the five duplicated filter functions are all gone.

The Custom Content modal is now a read-only list of the content packs built into the
database. Phase 4 replaces it with the file import.

---

#### Original Phase 3 plan

**New — `app/services/db.service.js`**
Loads `sql.js` (WASM), fetches `data/monsters.db` as an ArrayBuffer, opens it, exposes a
query interface. Returns a promise resolving when ready.

✅ **`sql.js` is vendored into the repo** (`vendor/sql.js/` — `sql-wasm.js` +
`sql-wasm.wasm`), not loaded from a CDN. Pin the version and note it in the commit. The
whole point of this migration is that the app stops depending on an external service
staying up; a CDN would reintroduce exactly that failure mode in a new outfit. It also
keeps the app working offline. Same `.gitattributes` caveat as the `.db` file — the
`.wasm` must be treated as binary.

**Rewrite — `app/services/monsters.service.js`**
Replace `loadSheet(sheets)` with `load()`: one query, hydrating the existing `all` /
`byId` / `byCr` structures **in exactly the shape `monsterFactory.Monster` produces
today**. Keep the `Monster` prototype; `merge()` becomes dead code (every printing is
already its own row) but removing it is a separate cleanup.

**Simplify — `scripts/monsterfactory.js`**
`parseAlignment`, `parseSingleAlignmentFlags`, `parseSize`, and the source-string regex
become no-ops — values arrive precomputed. **Leave `checkMonster` / `isFiltered` /
`isNameMatched` unchanged in this phase.** Do not optimise into SQL yet; one change at a time.

**Delete**
- `app/services/sheet-loader.service.js` (dead JSONP loader)
- `app/services/sheet-manager.service.js`
- `sheet-check.html`
- `firebaserules.json` (unreferenced)
- ⚠️ the `var data = [...]` literal and `hackSources()` from `search.controller.js`,
  *after* Phase 0 has extracted them — this also removes the duplicated filter functions
  and the two latent bugs in 1b
- the corresponding `<script>` tags in `index.html:35-64`

**Leave alone:** `store.service.js` and everything writing `5em-library`, `5em-encounter`,
`5em-players`, `5em-party-info`. User data stays in localStorage — per-device, small,
works. Migrating it needs a server and is out of scope.

✅ **Ship a one-time cleanup** deleting stale `5em-sheet-cache:*` and `5em-sheet-meta`
keys — confirmed in scope. Returning users otherwise carry dead weight against a ~5 MB
quota forever, which the Phase 4 homebrew overlay now competes for.

---

### ✅ Phase 4 — Custom content replaced — DONE

Homebrew import works, verified end to end in a browser by driving the real
`<input type="file">` with a real `File` object — not by calling the service directly:

- Importing `data/homebrew-example.csv` took the catalog from 3,369 → **3,374** monsters
- The pack registers as an enabled `Homebrew` source and appears in the source filter
- **Survives a genuine page reload** (restored from `localStorage`, confirmed with a
  window-marker check to prove the document really was re-created)
- An imported monster renders identically to a built-in one:
  `Hollow Sovereign / Hollow Court | 12 | Large | Undead | lawful evil | My Brews p.21`
- Removing via the real trash button takes it back to 3,369, clears the source filter
  entry, and empties the stored value

New files: `app/services/homebrew.service.js`, `app/services/csv.service.js`,
`app/common/file-select.directive.js`, plus `data/homebrew-example.csv` as a template —
the old flow pointed users at a Google Sheets template, so they need something to copy.

**Design points**

- Imported rows are mapped to the *same shape* `monsters.service`'s SQL produces and go
  through the identical `monsterFactory.Monster` path. An imported monster is not a
  second-class citizen on a separate code path.
- `fid`s are namespaced `homebrew.<pack>.<monster>`, so an import can never collide with a
  built-in, and the import is rejected if a `fid` already exists.
- Validation mirrors the build-db gates: unknown CR, unknown size, missing name/type are
  each reported **with the user's line number**, and valid rows still import. The Sheets
  path failed silently; this does not.
- The pack is the source, so its filter checkbox governs its monsters. A page number in the
  file is kept; a source *name* in the file is ignored.
- Column names accept the community template's spelling with or without `?`
  (`legendary?` / `legendary`), and both `.csv` and a JSON array are accepted.
- Quota guard: 1 MB per import, 2 MB total, refused with a message rather than letting
  `QuotaExceededError` surface somewhere less obvious.

🔴 **`#contentModal` had no trigger anywhere in the app** — the content list was
unreachable dead UI before this. It now hosts the importer, so a "Manage Content" button
was added next to "Set Sources".

⚠️ **`removeSheet()` had a latent bug worth recording**: it deleted
`miscLib.sourceFilters[name]` using the global `name` instead of its own argument, so it
never actually removed a source filter. `removeCustom()` does it correctly.

**Test suite: 55 → 75 passing** (20 new specs covering CSV parsing with quoted
commas, validation failures and their line numbers, fid namespacing, duplicate handling,
JSON import, persistence and restore, and corrupt-storage recovery).

---

#### Original Phase 4 plan

Today `sheetManager.addContent(name, url)` attaches any published Google Sheet of homebrew
at runtime. A static SQLite file can't accept a runtime URL, so without a replacement users
would **lose a capability**.

✅ **Decided: keep the feature, via local file import.** This ships as part of the
migration — not deferred, and not dropped.

- User uploads a CSV/JSON file; it is parsed **in-browser** (no upload leaves the machine).
- Parsed monsters are stored in a `localStorage` overlay and merged into `all` after the DB
  loads, under a `source.type = 'Homebrew'` entry — the schema already supports this with
  no changes.
- Accept the **same CSV column layout as the Sheets `Monsters` tab**, so the existing
  community template and any sheet a user already maintains still work — they export to CSV
  instead of publishing a URL. Reuse the Phase 2 parsing and validation code paths.
- Overlay monsters must not be able to collide with built-in `fid`s; namespace them
  (e.g. `homebrew.<file>.<slug>`) and surface parse errors to the user rather than
  failing silently, which is what the Sheets path did.

⚠️ Watch the `localStorage` budget — the overlay competes with saved encounters against a
~5 MB quota. Reject oversized imports with a clear message.

---

### Phase 5 — Verify

- Unit tests for `build-db.mjs` parsing (alignment, sources, environments, CR, ability pairs).
- ⚠️ **Re-enable the deferred spec.** Change `xit` back to `it` in
  `app/services/monsters.service.tests.js` — it asserts `all`/`byCr`/`byId` are populated,
  which is exactly what Phase 3 restores. Target: **48/48**.
- The other 47 specs cover encounter math and filtering — they must keep passing
  **unchanged** against the Phase 1.5 baseline. That is the strongest signal the swap
  was transparent.
- **Row-count reconciliation:** monsters in the DB == distinct `fid` after reconciliation.
  Any delta is a silently dropped row.
- **`fid` continuity check:** ✅ run. 3,330 pre-migration sheet `fid`s, 3,369 in the
  database, 40 minted, **1 missing** — `cc.abyssal-eviscerator`, the no-CR row above.
  The 133 name suffixes do not touch `fid`, as intended.
- **Uniqueness check:** 0 duplicate display names across the final monster table.
- **Golden-output diff:** capture the monster list from the current (cached) app and diff
  field-by-field against the new one. Expect exactly 133 name deltas and 40 additions;
  anything else is a bug.
- Manual: search, every filter (**especially environment**), encounter build, save/load,
  random encounter, party setup, **and homebrew file import (Phase 4)**.

---

### Phase 6 — Optional follow-ups (not now)

- Push filtering into SQL (`WHERE cr_numeric BETWEEN ? AND ?`) and FTS5 for search,
  replacing the per-keystroke full scan. **Only after Phase 5 is green** — it changes
  behaviour, not just plumbing.
- Remove committed `build/` from git.
- Migrate off AngularJS (EOL, unpatched CVEs).

*(The build fix moved out of this phase — it is now Phase 1.5, because Phase 5 depends on
a working test runner.)*

---

## Sequencing summary

| Phase | Deliverable | Risk | Status |
|---|---|---|---|
| 0 | Embedded JSON + all 3 Sheets recovered & validated | Low | ✅ **Done** |
| 1 | Reconciled dataset (3,370) + 40 minted `fid`s + 133 name suffixes | Low–Med | ✅ **Done** |
| 1.5 | Green spec suite on unmodified `master` (47/47) | Low | ✅ **Tests done**; build outstanding |
| 2 | `data/monsters.db` (1.86 MB) + validating build script | Low | ✅ **Done** |
| 3 | `db.service.js` + vendored `sql.js`; sheet loaders and inline blob deleted | Medium | ✅ **Done** |
| 4 | Homebrew local-file import | Medium | ✅ **Done** |
| 5 | Verification | — | Required |
| 6 | SQL-side filtering, `build/` removal, AngularJS | Low | Deferred |

Phases 1–3 restore a **currently non-functional application**. Phase 1 was the highest
risk in earlier drafts; recovering real `fid`s for all 3,330 sheet monsters, plus a
name+source join that resolves every ambiguity, reduces it to mechanical work with no
hand review. Phase 1.5 can run in parallel with Phase 1 — they touch disjoint files.
Phase 6 can wait indefinitely.

### Data inventory (all now in-repo)

```
google-sheets/data.csv        911 monsters   Official
google-sheets/data-2.csv    1,250 monsters   Third-Party
google-sheets/data-3.csv    1,169 monsters   Community
google-sheets/sources.csv      16 sources    Official
google-sheets/sources-2.csv     9 sources    Third-Party
google-sheets/sources-3.csv     6 sources    Community
data/raw/embedded-monsters.json 904 monsters with full stat blocks

scripts/extract-embedded.mjs  extracts the inline blob (lossless, re-runnable)
scripts/inspect-sheets.mjs    validates the exports and reports reconciliation
```

---

## Sources

- [Google Sheets API v3 shutdown notice — University of Michigan ITS](https://its.umich.edu/node/150329)
- [Google Sheets API release notes](https://developers.google.com/workspace/sheets/release-notes)
- [GData API Directory (deprecated protocols)](https://developers.google.com/gdata/docs/directory)
- [Asmor/5e-monsters — upstream project](https://github.com/Asmor/5e-monsters/)
