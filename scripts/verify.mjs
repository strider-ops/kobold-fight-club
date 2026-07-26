#!/usr/bin/env node
/**
 * Phase 5 — Verify the built database against the original recovered sheets.
 *
 *   node --no-warnings scripts/verify.mjs
 *
 * The plan called for a "golden-output diff": capture the monster list from the running
 * pre-migration app and compare field by field. That is not possible — the app's data
 * pipeline has been dead since the Sheets v3 shutdown, so there is no pre-migration
 * output left to capture. This does the equivalent against the real golden source: the
 * recovered CSVs in google-sheets/, which is what the app was serving before it broke.
 *
 * Every deviation must be one the migration deliberately introduced. Anything else is a
 * bug, and exits non-zero.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { parseCsv, toObjects } from "./lib/csv.mjs";
import { parseSources, splitList, intOrNull } from "./lib/transform.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DB_PATH = path.join(root, "data/monsters.db");

const failures = [];
const notes = [];
const log = (s = "") => console.log(s);

function check(label, ok, detail) {
	log(`  ${ok ? "✓" : "✗"} ${label}${detail ? " — " + detail : ""}`);
	if (!ok) failures.push(label + (detail ? ": " + detail : ""));
}

// ── Load the golden source: the recovered sheets, with corrections applied ──

const sheetRows = [];
for (const file of ["data.csv", "data-2.csv", "data-3.csv"]) {
	const full = path.join(root, "google-sheets", file);
	for (const row of toObjects(parseCsv(fs.readFileSync(full, "utf8")))) {
		if (row.name) sheetRows.push(row);
	}
}

const corrections = JSON.parse(
	fs.readFileSync(path.join(root, "data/corrections.json"), "utf8"));
const byFid = new Map(sheetRows.map((r) => [r.fid, r]));
let correctionCount = 0;

for (const group of corrections) {
	for (const change of group.changes) {
		const row = byFid.get(change.fid);
		if (row) {
			row[change.field] = change.to;
			correctionCount++;
		}
	}
}

// ── Load the built database ─────────────────────────────────────────────────

if (!fs.existsSync(DB_PATH)) {
	console.error("data/monsters.db not found — run `npm run data` first.");
	process.exit(1);
}

const db = new DatabaseSync(DB_PATH, { readOnly: true });
const all = (sql) => db.prepare(sql).all();

const dbRows = all(`
	SELECT m.fid, m.guid, m.name, m.section, m.size, m.type, m.ac, m.hp, m.init,
	       m.alignment_text, m.legendary, m.lair, m.unique_npc, c.label AS cr,
	       (SELECT group_concat(t.name, '|') FROM monster_tag mt
	          JOIN tag t ON t.id = mt.tag_id WHERE mt.monster_id = m.id) AS tags,
	       (SELECT group_concat(e.name, '|') FROM monster_environment me
	          JOIN environment e ON e.id = me.environment_id
	         WHERE me.monster_id = m.id) AS environments,
	       (SELECT group_concat(
	                 s.name || '~' || COALESCE(p.page, p.url, ''), '|')
	          FROM monster_printing p JOIN source s ON s.id = p.source_id
	         WHERE p.monster_id = m.id) AS printings
	  FROM monster m JOIN cr c ON c.numeric = m.cr_numeric`);

const dbByFid = new Map(dbRows.map((r) => [r.fid, r]));

log("═".repeat(72));
log("PHASE 5 — VERIFICATION");
log("═".repeat(72));
log(`  sheet rows (golden) : ${sheetRows.length}  (+${correctionCount} corrections applied)`);
log(`  database rows       : ${dbRows.length}`);
log("");

// ── 1. Row-count reconciliation ─────────────────────────────────────────────

log("ROW COUNTS");

const reconciled = JSON.parse(
	fs.readFileSync(path.join(root, "data/reconciled/monsters.json"), "utf8"));
const noCr = reconciled.filter((m) => !String(m.cr || "").trim());

check("database row count equals reconciled minus CR-less rows",
	dbRows.length === reconciled.length - noCr.length,
	`${dbRows.length} = ${reconciled.length} - ${noCr.length}`);

check("distinct fid equals row count",
	new Set(dbRows.map((r) => r.fid)).size === dbRows.length);

// ── 2. fid continuity — the saved-encounter regression test ────────────────

log("");
log("FID CONTINUITY  (saved encounters reference guid || fid)");

const missing = sheetRows.filter((r) => r.fid && !dbByFid.has(r.fid));
const expectedMissing = new Set(noCr.map((m) => m.fid));
const unexpected = missing.filter((r) => !expectedMissing.has(r.fid));

check("every pre-migration fid still exists, except known CR-less rows",
	unexpected.length === 0,
	unexpected.length ? unexpected.map((r) => r.fid).join(", ") : `${missing.length} known`);

missing.forEach((r) => notes.push(`dropped (no cr): ${r.fid} — ${r.name}`));

const guidRows = sheetRows.filter((r) => r.guid);
const guidMissing = guidRows.filter((r) => {
	const row = dbByFid.get(r.fid);
	return row && row.guid !== r.guid;
});
check("every pre-migration guid is preserved", guidMissing.length === 0,
	guidMissing.length ? guidMissing.slice(0, 3).map((r) => r.fid).join(", ") : `${guidRows.length} checked`);

// ── 3. Display-name uniqueness ──────────────────────────────────────────────

log("");
log("DISPLAY NAMES");

const nameCounts = new Map();
dbRows.forEach((r) => nameCounts.set(r.name, (nameCounts.get(r.name) || 0) + 1));
const dupNames = [...nameCounts].filter(([, n]) => n > 1);

check("no duplicate display names", dupNames.length === 0,
	dupNames.length ? dupNames.slice(0, 3).map(([n]) => n).join(", ") : `${nameCounts.size} distinct`);

const suffixed = dbRows.filter((r) => /-\d+$/.test(r.name) &&
	String(byFid.get(r.fid)?.name || "") !== r.name);
check("renames only ever add a numeric suffix to the sheet name",
	suffixed.every((r) => r.name.replace(/-\d+$/, "") === byFid.get(r.fid)?.name),
	`${suffixed.length} renamed`);

// ── 4. Referential integrity — the check the app never performed ────────────

log("");
log("REFERENTIAL INTEGRITY");

const q = (sql) => db.prepare(sql).get().n;

check("no printing references a missing source",
	q(`SELECT count(*) n FROM monster_printing p
	     LEFT JOIN source s ON s.id = p.source_id WHERE s.id IS NULL`) === 0);
check("no monster is without a printing",
	q(`SELECT count(*) n FROM monster m
	     LEFT JOIN monster_printing p ON p.monster_id = m.id WHERE p.id IS NULL`) === 0);
check("no orphaned stat block",
	q(`SELECT count(*) n FROM monster_stats s
	     LEFT JOIN monster m ON m.id = s.monster_id WHERE m.id IS NULL`) === 0);
check("no monster has an unparsed alignment",
	q("SELECT count(*) n FROM monster WHERE alignment_flags = 0") === 0);
check("every CR resolves to the cr table",
	q(`SELECT count(*) n FROM monster m
	     LEFT JOIN cr c ON c.numeric = m.cr_numeric WHERE c.numeric IS NULL`) === 0);
check("every size_sort is in range",
	q("SELECT count(*) n FROM monster WHERE size_sort NOT BETWEEN 1 AND 6") === 0);
// An external-content FTS5 table cannot be counted with count(*), so check it the way
// the app will actually use it: a term that must match.
const ftsHits = db.prepare(
	"SELECT count(*) n FROM monster_fts f JOIN monster m ON m.id = f.rowid" +
	" WHERE monster_fts MATCH ?").get("goblin").n;
check("FTS index returns matches", ftsHits > 0, `${ftsHits} hits for "goblin"`);

// ── 5. Golden field-by-field diff ───────────────────────────────────────────

log("");
log("GOLDEN DIFF  (every sheet row, field by field)");

const mismatches = [];

// Compared as sets: the join tables have composite primary keys, so a value repeated in
// a sheet cell is stored once. Four Monsters of the Guild rows list "grassland" twice.
// The de-duplication is correct and changes nothing the app can observe — indexOf() on
// the runtime array behaves identically either way — so it is not a mismatch.
const asSet = (value) =>
	[...new Set(splitList(String(value || "").replace(/\|/g, ",")))].sort().join(",");

const dedupedRows = sheetRows.filter((r) => {
	const envs = splitList(r.environment);
	const tags = splitList(r.tags);
	return envs.length !== new Set(envs).size || tags.length !== new Set(tags).size;
});

let compared = 0;
for (const sheet of sheetRows) {
	const row = dbByFid.get(sheet.fid);
	if (!row) continue;
	compared++;

	const expect = (field, want, got) => {
		if (String(want ?? "") !== String(got ?? "")) {
			mismatches.push(`${sheet.fid}.${field}: sheet=${JSON.stringify(want)} db=${JSON.stringify(got)}`);
		}
	};

	// name may carry a rename suffix; compare the base
	expect("name", sheet.name, row.name.replace(/-\d+$/, ""));
	expect("cr", sheet.cr, row.cr);
	expect("size", sheet.size, row.size ?? "");
	expect("type", sheet.type, row.type);
	expect("section", sheet.section, row.section ?? "");
	expect("alignment", sheet.alignment, row.alignment_text ?? "");
	expect("ac", intOrNull(sheet.ac), row.ac);
	expect("hp", intOrNull(sheet.hp), row.hp);
	expect("init", intOrNull(sheet.init), row.init);
	expect("legendary", sheet["legendary?"] ? 1 : 0, row.legendary);
	expect("lair", sheet["lair?"] ? 1 : 0, row.lair);
	expect("unique", sheet["unique?"] ? 1 : 0, row.unique_npc);
	expect("tags", asSet(sheet.tags), asSet(row.tags));
	expect("environments", asSet(sheet.environment), asSet(row.environments));

	const wantPrintings = parseSources(sheet.sources)
		.map((p) => p.name + "~" + p.page).sort().join("|");
	const gotPrintings = String(row.printings || "").split("|").sort().join("|");
	expect("printings", wantPrintings, gotPrintings);
}

dedupedRows.forEach((r) => notes.push(
	`de-duplicated repeated tag/environment: ${r.fid} — ${r.name}`));

check(`all ${compared} shared rows match field for field`, mismatches.length === 0,
	mismatches.length ? `${mismatches.length} mismatches` : "");
mismatches.slice(0, 15).forEach((m) => log(`      ${m}`));
if (mismatches.length > 15) log(`      ... and ${mismatches.length - 15} more`);

// ── 6. Additions ────────────────────────────────────────────────────────────

log("");
log("ADDITIONS  (monsters the sheets never had)");

const sheetFids = new Set(sheetRows.map((r) => r.fid));
const added = dbRows.filter((r) => !sheetFids.has(r.fid));
const bySource = {};
added.forEach((r) => {
	const book = String(r.printings || "").split("~")[0];
	bySource[book] = (bySource[book] || 0) + 1;
});

log(`  ${added.length} added`);
Object.entries(bySource).sort((a, b) => b[1] - a[1])
	.forEach(([book, n]) => log(`      ${String(n).padStart(3)}  ${book}`));

// ── Summary ─────────────────────────────────────────────────────────────────

log("");
log("═".repeat(72));
if (notes.length) {
	log("KNOWN, ACCEPTED DEVIATIONS");
	notes.forEach((n) => log(`  · ${n}`));
	log("");
}

if (failures.length) {
	log(`✗ VERIFICATION FAILED — ${failures.length} check(s)`);
	failures.forEach((f) => log(`    ${f}`));
	process.exit(1);
}

log("✓ VERIFICATION PASSED");
log("");
