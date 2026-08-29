#!/usr/bin/env node
/**
 * Phase 2 — Build data/monsters.db from the Phase 1 reconciled dataset.
 *
 * Inputs   data/reconciled/monsters.json   3,370 monsters
 *          data/reconciled/sources.json       32 sources
 *          scripts/meta/crInfo.js             CR -> XP table (read, not duplicated)
 *          scripts/meta/alignments.js         alignment flag bitmasks (ditto)
 *
 * Output   data/monsters.db
 *
 *   node scripts/build-db.mjs
 *
 * Does once, at build time, what monsterfactory.js currently redoes in every visitor's
 * browser on every page load: splitting delimited strings into rows, running the
 * alignment regex ladder, and mapping sizes to a sort order.
 *
 * Validation gates the build — it exits non-zero rather than emitting a bad database.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import {
	alignmentFlags, sizeSort, intOrNull, textIfNotNumeric, crLabel, kebab, splitList,
} from "./lib/transform.mjs";
import { crInfo } from "./meta/crInfo.js";
import { alignments } from "./meta/alignments.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "data/monsters.db");

const fail = [];
const log = (s = "") => console.log(s);

const monsters = JSON.parse(
	fs.readFileSync(path.join(root, "data/reconciled/monsters.json"), "utf8"));
const sources = JSON.parse(
	fs.readFileSync(path.join(root, "data/reconciled/sources.json"), "utf8"));

log("═".repeat(72));
log("PHASE 2 — DATABASE BUILD");
log("═".repeat(72));
log(`  monsters in      : ${monsters.length}`);
log(`  sources in       : ${sources.length}`);
log(`  CR rows          : ${Object.keys(crInfo).length}  (from scripts/meta/crInfo.js)`);
log(`  alignments       : ${Object.keys(alignments).length}  (from scripts/meta/alignments.js)`);

// ── Ported from monsterfactory.js (see scripts/lib/transform.mjs) ───────────

function parseAlignmentFlags(text, fid) {
	const flags = alignmentFlags(text, alignments);

	if (flags === null) {
		// monsterfactory.js:109 console.warns and falls through to unaligned. A silent
		// fallback in a build script is how bad data reaches production, so fail instead.
		fail.push(`unparseable alignment on ${fid}: ${JSON.stringify(text)}`);
		return alignments.unaligned.flags;
	}

	return flags;
}

// ── Schema ──────────────────────────────────────────────────────────────────

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.rmSync(OUT, { force: true });

const db = new DatabaseSync(OUT);
db.exec("PRAGMA foreign_keys = ON");
db.exec(`
CREATE TABLE cr (
    numeric   REAL PRIMARY KEY,
    label     TEXT NOT NULL UNIQUE,
    xp        INTEGER NOT NULL
);

CREATE TABLE source (
    id                INTEGER PRIMARY KEY,
    name              TEXT NOT NULL UNIQUE,
    short_name        TEXT,
    type              TEXT,
    link              TEXT,
    default_selected  INTEGER NOT NULL DEFAULT 0 CHECK (default_selected IN (0,1))
);

CREATE TABLE monster (
    id              INTEGER PRIMARY KEY,
    fid             TEXT NOT NULL UNIQUE,
    guid            TEXT UNIQUE,
    name            TEXT NOT NULL UNIQUE,
    section         TEXT,
    size            TEXT CHECK (size IN
                      ('Tiny','Small','Medium','Large','Huge','Gargantuan')),
    size_sort       INTEGER NOT NULL,
    type            TEXT NOT NULL,
    cr_numeric      REAL NOT NULL REFERENCES cr(numeric),
    ac              INTEGER,
    hp              INTEGER,
    init            INTEGER,
    ac_text         TEXT,
    hp_text         TEXT,
    alignment_text  TEXT,
    alignment_flags INTEGER NOT NULL,
    legendary       INTEGER NOT NULL DEFAULT 0 CHECK (legendary  IN (0,1)),
    lair            INTEGER NOT NULL DEFAULT 0 CHECK (lair       IN (0,1)),
    unique_npc      INTEGER NOT NULL DEFAULT 0 CHECK (unique_npc IN (0,1)),
    special         INTEGER NOT NULL DEFAULT 0 CHECK (special    IN (0,1)),
    searchable      TEXT NOT NULL
);

CREATE TABLE monster_stats (
    monster_id            INTEGER PRIMARY KEY REFERENCES monster(id) ON DELETE CASCADE,
    str INTEGER, str_save INTEGER,
    dex INTEGER, dex_save INTEGER,
    con INTEGER, con_save INTEGER,
    "int" INTEGER, int_save INTEGER,
    wis INTEGER, wis_save INTEGER,
    cha INTEGER, cha_save INTEGER,
    speed                  TEXT,
    magic_resistance       INTEGER CHECK (magic_resistance IN (0,1)),
    legendary_resistance   INTEGER,
    dc_str INTEGER, dc_dex INTEGER, dc_con INTEGER,
    dc_int INTEGER, dc_wis INTEGER, dc_cha INTEGER,
    damage_resistances     TEXT,
    damage_immunities      TEXT,
    damage_vulnerabilities TEXT,
    advantage              TEXT
);

CREATE TABLE skill (
    id   INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);
CREATE TABLE monster_skill (
    monster_id INTEGER NOT NULL REFERENCES monster(id) ON DELETE CASCADE,
    skill_id   INTEGER NOT NULL REFERENCES skill(id)   ON DELETE CASCADE,
    bonus      INTEGER NOT NULL,
    PRIMARY KEY (monster_id, skill_id)
);

CREATE TABLE condition (
    id   INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);
CREATE TABLE monster_condition_immunity (
    monster_id   INTEGER NOT NULL REFERENCES monster(id)   ON DELETE CASCADE,
    condition_id INTEGER NOT NULL REFERENCES condition(id) ON DELETE CASCADE,
    PRIMARY KEY (monster_id, condition_id)
);

CREATE TABLE environment (
    id   INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);
CREATE TABLE monster_environment (
    monster_id     INTEGER NOT NULL REFERENCES monster(id)     ON DELETE CASCADE,
    environment_id INTEGER NOT NULL REFERENCES environment(id) ON DELETE CASCADE,
    PRIMARY KEY (monster_id, environment_id)
);

CREATE TABLE tag (
    id   INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);
CREATE TABLE monster_tag (
    monster_id INTEGER NOT NULL REFERENCES monster(id) ON DELETE CASCADE,
    tag_id     INTEGER NOT NULL REFERENCES tag(id)     ON DELETE CASCADE,
    PRIMARY KEY (monster_id, tag_id)
);

CREATE TABLE monster_printing (
    id           INTEGER PRIMARY KEY,
    monster_id   INTEGER NOT NULL REFERENCES monster(id) ON DELETE CASCADE,
    source_id    INTEGER NOT NULL REFERENCES source(id)  ON DELETE CASCADE,
    page         INTEGER,
    url          TEXT
);

-- A monster CAN legitimately appear twice in one book: tob.ratfolk-rogue is on both
-- page 320 and page 424 of Tome of Beasts. So the identity of a printing is book AND
-- page, not book alone. COALESCE keeps the index meaningful for url-only sources,
-- where page is NULL and SQLite would otherwise treat every NULL as distinct.
CREATE UNIQUE INDEX idx_printing_unique ON monster_printing(
    monster_id, source_id, COALESCE(page, -1), COALESCE(url, '')
);

CREATE INDEX idx_monster_cr   ON monster(cr_numeric);
CREATE INDEX idx_monster_type ON monster(type);
CREATE INDEX idx_monster_size ON monster(size);
CREATE INDEX idx_monster_name ON monster(name);
CREATE INDEX idx_print_source ON monster_printing(source_id);
CREATE INDEX idx_menv_env     ON monster_environment(environment_id);
CREATE INDEX idx_mtag_tag     ON monster_tag(tag_id);

CREATE VIRTUAL TABLE monster_fts USING fts5(
    name, section, type, tags,
    content = 'monster', content_rowid = 'id'
);
`);

// ── Load ────────────────────────────────────────────────────────────────────

db.exec("BEGIN");

const insCr = db.prepare("INSERT INTO cr (numeric, label, xp) VALUES (?, ?, ?)");
for (const info of Object.values(crInfo)) insCr.run(info.numeric, info.string, info.exp);
const crByLabel = new Map(Object.values(crInfo).map((c) => [c.string, c.numeric]));

const insSource = db.prepare(
	"INSERT INTO source (name, short_name, type, link, default_selected) VALUES (?, ?, ?, ?, ?)");
const sourceId = new Map();
for (const s of sources) {
	const info = insSource.run(s.name, s["short name"] || null, s.type || null,
		s.link || null, s["default selected?"] ? 1 : 0);
	sourceId.set(s.name, Number(info.lastInsertRowid));
}

// Lookup tables are grown on demand — the valid sets are whatever the data contains.
function lookup(table, cache) {
	const ins = db.prepare(`INSERT INTO ${table} (name) VALUES (?)`);
	return (name) => {
		if (!cache.has(name)) cache.set(name, Number(ins.run(name).lastInsertRowid));
		return cache.get(name);
	};
}
const tagId = lookup("tag", new Map());
const envId = lookup("environment", new Map());
const skillId = lookup("skill", new Map());
const conditionId = lookup("condition", new Map());

const insMonster = db.prepare(`
	INSERT INTO monster (fid, guid, name, section, size, size_sort, type, cr_numeric,
		ac, hp, init, ac_text, hp_text, alignment_text, alignment_flags,
		legendary, lair, unique_npc, special, searchable)
	VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
const insStats = db.prepare(`
	INSERT INTO monster_stats (monster_id, str, str_save, dex, dex_save, con, con_save,
		"int", int_save, wis, wis_save, cha, cha_save, speed, magic_resistance,
		legendary_resistance, dc_str, dc_dex, dc_con, dc_int, dc_wis, dc_cha,
		damage_resistances, damage_immunities, damage_vulnerabilities, advantage)
	VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
const insPrinting = db.prepare(
	"INSERT INTO monster_printing (monster_id, source_id, page, url) VALUES (?, ?, ?, ?)");
const insTag = db.prepare("INSERT OR IGNORE INTO monster_tag VALUES (?, ?)");
const insEnv = db.prepare("INSERT OR IGNORE INTO monster_environment VALUES (?, ?)");
const insSkill = db.prepare("INSERT OR IGNORE INTO monster_skill VALUES (?, ?, ?)");
const insCond = db.prepare("INSERT OR IGNORE INTO monster_condition_immunity VALUES (?, ?)");

const pair = (v) => (Array.isArray(v) ? v : [null, null]);
const bool = (v) => (v ? 1 : 0);

const skipped = [];
let statsCount = 0, printingCount = 0;

for (const m of monsters) {
	// A CR that is present but unrecognised means corrupt data — fail. A CR that is
	// simply absent is a known gap in the Community sheet: the monster cannot take part
	// in encounter maths or CR filtering, so it is skipped rather than given an invented
	// value. Adding a cr for it in data/corrections.json is all it takes to include it.
	if (!String(m.cr || "").trim()) {
		skipped.push(m);
		continue;
	}
	const crNumeric = crByLabel.get(String(m.cr));
	if (crNumeric === undefined) {
		fail.push(`unknown cr on ${m.fid}: ${JSON.stringify(m.cr)}`);
		continue;
	}
	const sort = sizeSort(m.size);
	if (sort === -1) fail.push(`unknown size on ${m.fid}: ${JSON.stringify(m.size)}`);

	const searchable = [m.name, m.section, m.type, ...(m.tags || [])]
		.filter(Boolean).join(" ").toLowerCase();

	const id = Number(insMonster.run(
		m.fid, m.guid || null, m.name, m.section || null, m.size || null, sort,
		m.type, crNumeric,
		intOrNull(m.ac), intOrNull(m.hp), intOrNull(m.init),
		textIfNotNumeric(m.ac), textIfNotNumeric(m.hp),
		m.alignment || null, parseAlignmentFlags(m.alignment, m.fid),
		bool(m.legendary), bool(m.lair), bool(m.unique), 0, searchable,
	).lastInsertRowid);

	for (const t of m.tags || []) insTag.run(id, tagId(t));
	for (const e of m.environments || []) insEnv.run(id, envId(e));

	for (const p of m.printings || []) {
		const sid = sourceId.get(p.name);
		if (!sid) {
			// isInSource() (monsterfactory.js:300) returns false here and the monster
			// silently vanishes from every view. Make it a build failure instead.
			fail.push(`${m.fid} cites undeclared source ${JSON.stringify(p.name)}`);
			continue;
		}
		const isUrl = /^https?:\/\//i.test(p.page);
		insPrinting.run(id, sid, isUrl ? null : intOrNull(p.page), isUrl ? p.page : null);
		printingCount++;
	}

	const s = m.stats;
	if (!s) continue;
	statsCount++;

	const [str, strSave] = pair(s.str), [dex, dexSave] = pair(s.dex);
	const [con, conSave] = pair(s.con), [int_, intSave] = pair(s.int);
	const [wis, wisSave] = pair(s.wis), [cha, chaSave] = pair(s.cha);

	insStats.run(id, str, strSave, dex, dexSave, con, conSave,
		int_, intSave, wis, wisSave, cha, chaSave,
		s.speed ?? null,
		s.magicResistance === undefined ? null : bool(s.magicResistance),
		s.legendaryResistance ?? null,
		s.dcStr ?? null, s.dcDex ?? null, s.dcCon ?? null,
		s.dcInt ?? null, s.dcWis ?? null, s.dcCha ?? null,
		s.damageResistances ?? null, s.damageImmunities ?? null,
		s.damageVulnerabilities ?? s.damageVuln ?? null, s.advantage ?? null);

	for (const [name, bonus] of s.skills || []) insSkill.run(id, skillId(name), bonus);
	for (const c of s.conditionImmunities || []) insCond.run(id, conditionId(c));
}

// External-content FTS index, populated from the table it mirrors.
db.exec(`
	INSERT INTO monster_fts (rowid, name, section, type, tags)
	SELECT m.id, m.name, m.section, m.type,
	       (SELECT group_concat(t.name, ' ') FROM monster_tag mt
	          JOIN tag t ON t.id = mt.tag_id WHERE mt.monster_id = m.id)
	FROM monster m`);

if (fail.length) {
	db.exec("ROLLBACK");
	db.close();
	fs.rmSync(OUT, { force: true });
	log("");
	log(`  ✗ BUILD FAILED — ${fail.length} validation error(s), no database written`);
	fail.slice(0, 25).forEach((f) => log(`      ${f}`));
	if (fail.length > 25) log(`      ... and ${fail.length - 25} more`);
	process.exit(1);
}

db.exec("COMMIT");

// ── Report ──────────────────────────────────────────────────────────────────

if (skipped.length) {
	log("");
	log(`  ⚠️  SKIPPED ${skipped.length} monster(s) with no CR — they cannot be used in`);
	log("      encounter maths or CR filtering. Add a cr in data/corrections.json to include:");
	skipped.forEach((m) => log(`      ${m.fid}  ${m.name}  [${m.sheet}]`));
}

const count = (t) => db.prepare(`SELECT count(*) n FROM ${t}`).get().n;

log("");
log("  TABLES");
for (const t of ["cr", "source", "monster", "monster_stats", "monster_printing",
	"tag", "monster_tag", "environment", "monster_environment",
	"skill", "monster_skill", "condition", "monster_condition_immunity"]) {
	log(`    ${t.padEnd(28)}${String(count(t)).padStart(6)}`);
}

db.exec("VACUUM");
db.close();

const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
log("");
log(`  wrote data/monsters.db  (${kb} KB, ${statsCount} stat blocks, ${printingCount} printings)`);
log("");
