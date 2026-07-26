#!/usr/bin/env node
/**
 * Phase 1 — Reconcile the two datasets into one intermediate JSON.
 *
 * Inputs   google-sheets/data*.csv      3,330 monsters (fid, guid, environment, ...)
 *          google-sheets/sources*.csv      31 source definitions
 *          data/raw/embedded-monsters.json 904 monsters with full stat blocks
 *
 * Outputs  data/reconciled/monsters.json   the union, one record per printing
 *          data/reconciled/sources.json    declared sources + auto-added Eberron
 *          data/reconciled/REPORT.md       minted fids, renames, withheld stat blocks
 *
 *   node scripts/reconcile.mjs
 *
 * Reads nothing it writes; safe to re-run. Exits non-zero if a validation gate fails.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv, toObjects } from "./lib/csv.mjs";
import { norm, parseSources, crLabel, kebab } from "./lib/transform.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "data/reconciled");

const SHEETS = [
	{ file: "data.csv",   sources: "sources.csv",   sheet: "Official",    priority: 0 },
	{ file: "data-2.csv", sources: "sources-2.csv", sheet: "Third-Party", priority: 1 },
	{ file: "data-3.csv", sources: "sources-3.csv", sheet: "Community",   priority: 2 },
];

/**
 * Publication dates, used only to order duplicate names (the earlier printing keeps the
 * plain name). Hand-maintained: no date exists anywhere in the source data. Only books
 * that actually appear in a duplicate-name group need an entry — everything else falls
 * through to the sheet-priority tiebreak below, which needs no external knowledge.
 */
const PUBLISHED = {
	"Basic Rules v1":                  "2014-07",
	"Hoard of the Dragon Queen":       "2014-08",
	"HotDQ supplement":                "2014-08",
	"Monster Manual":                  "2014-09",
	"Rise of Tiamat":                  "2014-11",
	"Princes of the Apocalypse":       "2015-04",
	"Out of the Abyss":                "2015-09",
	"Curse of Strahd":                 "2016-03",
	"Storm King's Thunder":            "2016-09",
	"Volo's Guide to Monsters":        "2016-11",
	"Tales from the Yawning Portal":   "2017-04",
	"Tomb of Annihilation":            "2017-09",
	"The Tortle Package":              "2017-09",
	"Mordenkainen's Tome of Foes":     "2018-05",
	"Eberron - Rising from the Last War": "2019-11",
};

/** The one source the embedded dataset has that no Sources tab declares. */
const EBERRON = {
	name: "Eberron - Rising from the Last War",
	type: "Official",
	"short name": "ERLW",
	link: "",
	"default selected?": "",
};

/**
 * fid prefixes for books that no sheet row cites, so no prefix can be inferred from
 * existing data. Matches the source's short name, lowercased.
 */
const FID_PREFIX = {
	"Eberron - Rising from the Last War": "erlw",
};

const report = [];
const fail = [];
const log = (s = "") => { console.log(s); report.push(s); };

// ── Load ────────────────────────────────────────────────────────────────────

const declaredSources = [];
const seenSourceName = new Map();

for (const spec of SHEETS) {
	const file = path.join(root, "google-sheets", spec.sources);
	if (!fs.existsSync(file)) { fail.push(`missing ${spec.sources}`); continue; }
	for (const r of toObjects(parseCsv(fs.readFileSync(file, "utf8")))) {
		if (!r.name) continue;
		// monsters.service.js:81 warns and silently skips a duplicate; make it loud
		if (seenSourceName.has(r.name)) fail.push(`duplicate source name: ${r.name}`);
		seenSourceName.set(r.name, spec.sheet);
		declaredSources.push({ ...r, _sheet: spec.sheet });
	}
}

const sheetRows = [];
for (const spec of SHEETS) {
	const file = path.join(root, "google-sheets", spec.file);
	if (!fs.existsSync(file)) { fail.push(`missing ${spec.file}`); continue; }
	for (const r of toObjects(parseCsv(fs.readFileSync(file, "utf8")))) {
		if (!r.name) continue;
		sheetRows.push({ ...r, _sheet: spec.sheet, _priority: spec.priority });
	}
}

const embedded = JSON.parse(
	fs.readFileSync(path.join(root, "data/raw/embedded-monsters.json"), "utf8"));

// ── Apply known corrections to the sheet data ───────────────────────────────
// The CSVs under google-sheets/ are a verbatim record of what Google returned and are
// never edited. Known errors in them are corrected here instead, from an auditable file.
// Each change asserts the value it expects to replace, so if a re-export fixes one of
// these upstream the build fails rather than silently reverting the correction.

const corrections = JSON.parse(
	fs.readFileSync(path.join(root, "data/corrections.json"), "utf8"));

const byFid = new Map(sheetRows.map((r) => [r.fid, r]));
let applied = 0;

for (const c of corrections) {
	for (const ch of c.changes) {
		const row = byFid.get(ch.fid);
		if (!row) { fail.push(`correction targets unknown fid: ${ch.fid}`); continue; }
		if (String(row[ch.field]) !== String(ch.from)) {
			fail.push(`correction stale: ${ch.fid}.${ch.field} is ` +
				`${JSON.stringify(row[ch.field])}, expected ${JSON.stringify(ch.from)} ` +
				`— re-check data/corrections.json against the sheet`);
			continue;
		}
		row[ch.field] = ch.to;
		applied++;
	}
}

log("═".repeat(72));
log("PHASE 1 — RECONCILIATION REPORT");
log("═".repeat(72));
log(`  sheet monsters    : ${sheetRows.length}`);
log(`  embedded monsters : ${embedded.length}`);
log(`  declared sources  : ${declaredSources.length}`);
log(`  corrections applied: ${applied}  (${corrections.length} known sheet errors)`);

// ── Join embedded → sheets on normalised name, disambiguated by source string ──

const byName = new Map();
for (const r of sheetRows) {
	const k = norm(r.name);
	if (!byName.has(k)) byName.set(k, []);
	byName.get(k).push(r);
}

// A stat block shared by more than one embedded entry was de-duplicated by name
// upstream, so it describes only ONE of the printings that carry it. Exactly the 24
// duplicate-name pairs are affected; every other block is unique to its entry.
const blockShared = new Map();
for (const e of embedded) {
	if (!e.stats) continue;
	const k = JSON.stringify(e.stats);
	blockShared.set(k, (blockShared.get(k) || 0) + 1);
}

const statsFor = new Map();      // sheet row -> embedded stat block
const withheld = [];             // shared blocks that belong to a sibling printing
const discrepancies = [];        // block disagrees with the sheet, but is this row's own
const embeddedOnly = [];
let matchedUnique = 0, matchedBySource = 0;

for (const e of embedded) {
	const candidates = byName.get(norm(e.name));
	if (!candidates) { embeddedOnly.push(e); continue; }

	const books = new Set(parseSources(e.source).map((p) => p.name));
	const overlaps = (row) => parseSources(row.sources).some((p) => books.has(p.name));

	let row;
	if (candidates.length === 1) {
		// A unique name is not enough: an official monster can share a name with an
		// unrelated homebrew entry. Require the printing to agree before merging them.
		if (!overlaps(candidates[0])) { embeddedOnly.push(e); continue; }
		row = candidates[0];
		matchedUnique++;
	} else {
		// Name is ambiguous: the source string is what tells the printings apart.
		const src = String(e.source || "").trim();
		const hit = candidates.filter((c) => String(c.sources || "").trim() === src);
		if (hit.length !== 1) {
			fail.push(`ambiguous join for ${JSON.stringify(e.name)} (${hit.length} candidates ` +
				`matched source ${JSON.stringify(src)})`);
			continue;
		}
		row = hit[0];
		matchedBySource++;
	}

	if (!e.stats) continue;
	const blockHp = e.stats.hp;
	const disagrees = blockHp != null && String(blockHp) !== String(row.hp);

	if (disagrees && blockShared.get(JSON.stringify(e.stats)) > 1) {
		// Shared block + contradicting hp ⇒ it describes the sibling printing.
		withheld.push({ name: e.name, source: e.source, rowHp: row.hp, blockHp });
		continue;
	}
	if (disagrees) {
		// Block is unique to this monster, so it IS this monster's — the two sources
		// simply disagree. Attach it (per the "Sheets win for headline hp" rule the
		// headline stays the sheet's) and flag the conflict for review.
		discrepancies.push({ name: e.name, source: e.source, rowHp: row.hp, blockHp,
			rowAc: row.ac, blockAc: e.stats.ac ?? "" });
	}
	statsFor.set(row, e.stats);
}

log("");
log("  JOIN (normalised name + exact source string)");
log(`    matched, name unique in sheets : ${matchedUnique}`);
log(`    matched, disambiguated by source: ${matchedBySource}`);
log(`    no sheet match (embedded-only)  : ${embeddedOnly.length}`);
log(`    stat blocks attached            : ${statsFor.size}`);
log(`    stat blocks WITHHELD            : ${withheld.length}  (belong to a sibling printing)`);
log(`    hp discrepancies flagged        : ${discrepancies.length}  (attached; sheet and block disagree)`);

// ── Mint fids for the embedded-only monsters ────────────────────────────────

// Derive each book's fid prefix from the existing data rather than hardcoding it:
// for rows citing exactly one source, the prefix before "." is that book's code.
const prefixFor = new Map();
for (const r of sheetRows) {
	const srcs = parseSources(r.sources);
	if (srcs.length !== 1 || !r.fid.includes(".")) continue;
	const code = r.fid.slice(0, r.fid.indexOf("."));
	const tally = prefixFor.get(srcs[0].name) || new Map();
	tally.set(code, (tally.get(code) || 0) + 1);
	prefixFor.set(srcs[0].name, tally);
}
const codeFor = (book) => {
	if (FID_PREFIX[book]) return FID_PREFIX[book];
	const tally = prefixFor.get(book);
	if (!tally) return null;
	return [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];
};

const takenFids = new Set(sheetRows.map((r) => r.fid).filter(Boolean));
const minted = [];

for (const e of embeddedOnly) {
	const book = e.sourcebook || parseSources(e.source)[0]?.name || "";
	const code = codeFor(book) || kebab(book).split("-").slice(0, 1)[0];
	const fid = `${code}.${kebab(e.name)}`;
	if (takenFids.has(fid)) { fail.push(`minted fid collides: ${fid}`); continue; }
	takenFids.add(fid);
	minted.push({ fid, book, entry: e });
}

const newSources = [...new Set(minted.map((m) => m.book))].filter((b) => !seenSourceName.has(b));
log("");
log("  MINTED FIDS");
log(`    embedded-only monsters : ${minted.length}`);
log(`    books not declared in any Sources tab : ${newSources.length}`);
newSources.forEach((b) => log(`      + ${b}`));

// ── Build the unified record set ────────────────────────────────────────────

const toBool = (v) => Boolean(String(v || "").trim());

const monsters = sheetRows.map((r) => ({
	fid: r.fid,
	guid: r.guid || null,
	name: r.name,
	cr: r.cr,
	size: r.size,
	type: r.type,
	tags: (r.tags || "").split(/\s*,\s*/).filter(Boolean),
	section: r.section || null,
	alignment: r.alignment || null,
	environments: (r.environment || "").split(/\s*,\s*/).filter(Boolean),
	ac: r.ac || null,
	hp: r.hp || null,
	init: r.init || null,
	lair: toBool(r["lair?"]),
	legendary: toBool(r["legendary?"]),
	unique: toBool(r["unique?"]),
	printings: parseSources(r.sources),
	sheet: r._sheet,
	_priority: r._priority,
	stats: statsFor.get(r) || null,
	origin: "sheet",
}));

for (const m of minted) {
	const e = m.entry;
	monsters.push({
		fid: m.fid,
		guid: null,
		name: e.name,
		cr: typeof e.cr === "number" ? crLabel(e.cr) : String(e.cr),
		size: e.size,
		type: e.creatureType,
		tags: e.tags || [],
		section: null,
		alignment: e.alignment || null,
		environments: [],
		ac: e.ac == null ? null : String(e.ac),
		hp: e.hp == null ? null : String(e.hp),
		init: null,
		lair: false,
		legendary: Boolean(e.legendary),
		unique: Boolean(e.unique),
		printings: parseSources(e.source),
		sheet: "Official",
		_priority: 0,
		stats: e.stats || null,
		origin: "embedded",
	});
}

// ── Resolve duplicate display names ─────────────────────────────────────────

const earliest = (m) => m.printings
	.map((p) => PUBLISHED[p.name])
	.filter(Boolean)
	.sort()[0] || "9999-99";

const groups = new Map();
for (const m of monsters) {
	const k = norm(m.name);
	if (!groups.has(k)) groups.set(k, []);
	groups.get(k).push(m);
}

const renamed = [];
for (const [, group] of groups) {
	if (group.length < 2) continue;
	// Earliest printing keeps the plain name. Where no publication date is known —
	// notably groups spanning sheets, where chronology is meaningless — this falls
	// through to sheet priority (Official, Third-Party, Community), then fid.
	group.sort((a, b) =>
		earliest(a).localeCompare(earliest(b)) ||
		a._priority - b._priority ||
		String(a.fid).localeCompare(String(b.fid)));

	group.slice(1).forEach((m, i) => {
		const from = m.name;
		m.name = `${from}-${i + 1}`;
		renamed.push({ from, to: m.name, fid: m.fid, sheet: m.sheet,
			printings: m.printings.map((p) => p.name).join(", ") });
	});
}

log("");
log("  DUPLICATE NAMES");
log(`    groups            : ${[...groups.values()].filter((g) => g.length > 1).length}`);
log(`    rows suffixed     : ${renamed.length}`);

// ── Validation gates ────────────────────────────────────────────────────────

const fidCount = new Map();
monsters.forEach((m) => fidCount.set(m.fid, (fidCount.get(m.fid) || 0) + 1));
[...fidCount].filter(([, c]) => c > 1).forEach(([f]) => fail.push(`duplicate fid: ${f}`));

const nameCount = new Map();
monsters.forEach((m) => nameCount.set(m.name, (nameCount.get(m.name) || 0) + 1));
[...nameCount].filter(([, c]) => c > 1).forEach(([n]) => fail.push(`duplicate name survived: ${n}`));

const declaredNames = new Set([...seenSourceName.keys(), ...newSources]);
const unresolved = new Set();
monsters.forEach((m) => m.printings.forEach((p) => {
	if (!declaredNames.has(p.name)) unresolved.add(p.name);
}));
// isInSource() (monsterfactory.js:300) silently drops these today
unresolved.forEach((n) => fail.push(`monster cites undeclared source: ${JSON.stringify(n)}`));

log("");
log("  VALIDATION");
log(`    total monsters    : ${monsters.length}`);
log(`    distinct fid      : ${fidCount.size}`);
log(`    distinct name     : ${nameCount.size}`);
log(`    failures          : ${fail.length}`);
fail.slice(0, 20).forEach((f) => log(`      ✗ ${f}`));

// ── Emit ────────────────────────────────────────────────────────────────────

fs.mkdirSync(OUT, { recursive: true });

const clean = monsters
	.map(({ _priority, ...m }) => m)
	.sort((a, b) => a.fid.localeCompare(b.fid));

fs.writeFileSync(path.join(OUT, "monsters.json"), JSON.stringify(clean, null, "\t") + "\n");
fs.writeFileSync(path.join(OUT, "sources.json"), JSON.stringify(
	[...declaredSources, ...(newSources.includes(EBERRON.name) ? [{ ...EBERRON, _sheet: "Official" }] : [])],
	null, "\t") + "\n");

const md = [
	"# Phase 1 — Reconciliation report",
	"",
	`Generated by \`scripts/reconcile.mjs\` from ${sheetRows.length} sheet rows ` +
		`and ${embedded.length} embedded entries.`,
	"",
	`- **${clean.length}** monsters out`,
	`- **${minted.length}** minted fids`,
	`- **${renamed.length}** display names suffixed`,
	`- **${statsFor.size}** stat blocks attached, **${withheld.length}** withheld`,
	"",
	"## Minted fids",
	"",
	"| fid | name | book |",
	"|---|---|---|",
	...minted.map((m) => `| \`${m.fid}\` | ${m.entry.name} | ${m.book} |`),
	"",
	"## Withheld stat blocks",
	"",
	"The embedded dataset stores one stat block per *name*, shared across every printing.",
	"Where the block's own hp contradicts the printing it was attached to, it describes the",
	"sibling printing and is withheld — those monsters get no stat block rather than a wrong one.",
	"",
	"| monster | printing | sheet hp | stat-block hp |",
	"|---|---|---|---|",
	...withheld.map((w) => `| ${w.name} | ${w.source} | ${w.rowHp} | ${w.blockHp} |`),
	"",
	"## Corrections applied to the sheet data",
	"",
	"From `data/corrections.json`. The CSVs under `google-sheets/` are left verbatim.",
	"",
	...corrections.flatMap((c) => [
		`**${c.issue}**`,
		"",
		c.evidence,
		"",
		"| fid | field | was | now |",
		"|---|---|---|---|",
		...c.changes.map((ch) =>
			`| \`${ch.fid}\` | ${ch.field} | ${ch.from} | **${ch.to}** |`),
		"",
	]),
	"## ⚠️ hp discrepancies — needs review",
	"",
	"These blocks are unique to their monster, so they are genuinely its own — the two",
	"sources simply disagree. The block is attached and the sheet's hp is kept as the",
	"headline value, but a disagreement here usually means one side has a data error.",
	"Note `Guardian Naga` / `Spirit Naga`, whose ac and hp appear transposed in the sheet.",
	"",
	"| monster | printing | sheet hp | block hp | sheet ac | block ac |",
	"|---|---|---|---|---|---|",
	...discrepancies.map((d) =>
		`| ${d.name} | ${d.source} | ${d.rowHp} | ${d.blockHp} | ${d.rowAc} | ${d.blockAc} |`),
	"",
	"## Renamed duplicates",
	"",
	"`fid` is untouched — only the display name changes, so saved encounters are unaffected.",
	"",
	"| from | to | fid | sheet | printings |",
	"|---|---|---|---|---|",
	...renamed.map((r) => `| ${r.from} | **${r.to}** | \`${r.fid}\` | ${r.sheet} | ${r.printings} |`),
	"",
].join("\n");

fs.writeFileSync(path.join(OUT, "REPORT.md"), md);

log("");
log(`  wrote data/reconciled/monsters.json  (${clean.length} records)`);
log(`  wrote data/reconciled/sources.json`);
log(`  wrote data/reconciled/REPORT.md`);
log("");

process.exit(fail.length ? 1 : 0);
