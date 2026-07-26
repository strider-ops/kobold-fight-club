#!/usr/bin/env node
/**
 * Phase 0/1 — Inspect the recovered Google Sheets CSV exports.
 *
 * Validates the three Monsters-tab exports in google-sheets/ against the field rules
 * the app actually enforces (monsterfactory.js, monsters.service.js, README.md),
 * and reports what still needs a decision before a database can be built.
 *
 *   node scripts/inspect-sheets.mjs
 *
 * Read-only. Writes nothing.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(root, "google-sheets");

const FILES = [
	{ file: "data.csv",   sources: "sources.csv",   sheet: "Official",    id: "1I5W-x8QOcP2siGCPIhWWzKGWt4vyBivYLbmkv_G1B24" },
	{ file: "data-2.csv", sources: "sources-2.csv", sheet: "Third-Party", id: "1YR8NBDp8BP4Lz-CWChh6-8dOPN7aYV_dRD6g9ZBvNqM" },
	{ file: "data-3.csv", sources: "sources-3.csv", sheet: "Community",   id: "1x6xC8fHZ6N6M2wOuwPTNdn0ObCPtdqeIBtXaLjHBMYQ" },
];

// Valid values, per README.md and app/services/metaInfo.service.js
const ENVIRONMENTS = new Set(["aquatic", "arctic", "cave", "coast", "desert", "dungeon",
	"forest", "grassland", "mountain", "planar", "ruins", "swamp", "underground", "urban"]);
const SIZES = new Set(["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"]);
// crInfo keys — app/meta/crInfo.js
const CRS = new Set(["0", "1/8", "1/4", "1/2",
	...Array.from({ length: 30 }, (_, i) => String(i + 1))]);

/** Minimal RFC4180 parser — handles quoted fields, embedded commas, doubled quotes. */
function parseCsv(text) {
	const rows = [];
	let row = [], field = "", inQuotes = false;

	for (let i = 0; i < text.length; i++) {
		const c = text[i];
		if (inQuotes) {
			if (c === '"') {
				if (text[i + 1] === '"') { field += '"'; i++; }
				else inQuotes = false;
			} else field += c;
		} else if (c === '"') inQuotes = true;
		else if (c === ",") { row.push(field); field = ""; }
		else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
		else if (c !== "\r") field += c;
	}
	if (field || row.length) { row.push(field); rows.push(row); }
	return rows;
}

function toObjects(rows) {
	const header = rows[0];
	return rows.slice(1)
		.filter((r) => r.some((c) => c !== ""))
		.map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])));
}

const all = [];
const perSheet = [];

console.log("═".repeat(72));
console.log("RECOVERED SHEETS — VALIDATION REPORT");
console.log("═".repeat(72));

for (const spec of FILES) {
	const full = path.join(DIR, spec.file);
	if (!fs.existsSync(full)) { console.error(`MISSING: ${spec.file}`); process.exit(1); }

	const objs = toObjects(parseCsv(fs.readFileSync(full, "utf8")));
	objs.forEach((o) => { o._sheet = spec.sheet; o._sheetId = spec.id; });
	all.push(...objs);
	perSheet.push({ ...spec, rows: objs });

	console.log(`\n${spec.sheet}  (${spec.file})`);
	console.log(`  rows              : ${objs.length}`);
	console.log(`  missing fid       : ${objs.filter((o) => !o.fid).length}`);
	console.log(`  missing guid      : ${objs.filter((o) => !o.guid).length}`);
	console.log(`  missing cr        : ${objs.filter((o) => !o.cr).length}`);
	console.log(`  missing name      : ${objs.filter((o) => !o.name).length}`);
	console.log(`  missing sources   : ${objs.filter((o) => !o.sources).length}`);
	console.log(`  has environment   : ${objs.filter((o) => o.environment).length}`);
}

console.log("\n" + "═".repeat(72));
console.log("CROSS-SHEET INTEGRITY");
console.log("═".repeat(72));
console.log(`  total rows        : ${all.length}`);

// fid uniqueness — the app keys every monster on guid || fid
const byFid = new Map();
all.forEach((o) => { if (o.fid) byFid.set(o.fid, (byFid.get(o.fid) || []).concat(o)); });
const dupFids = [...byFid.entries()].filter(([, v]) => v.length > 1);
console.log(`  distinct fid      : ${byFid.size}`);
console.log(`  DUPLICATE fid     : ${dupFids.length}`);
dupFids.slice(0, 8).forEach(([k, v]) =>
	console.log(`      ${k}  →  ${v.map((x) => x._sheet).join(" + ")}`));

// guid uniqueness
const byGuid = new Map();
all.forEach((o) => { if (o.guid) byGuid.set(o.guid, (byGuid.get(o.guid) || []).concat(o)); });
const dupGuids = [...byGuid.entries()].filter(([, v]) => v.length > 1);
console.log(`  distinct guid     : ${byGuid.size}`);
console.log(`  DUPLICATE guid    : ${dupGuids.length}`);

console.log("\n" + "═".repeat(72));
console.log("FIELD VALIDITY");
console.log("═".repeat(72));

const badCr   = all.filter((o) => o.cr && !CRS.has(o.cr));
const badSize = all.filter((o) => o.size && !SIZES.has(o.size));
const badEnv  = [];
all.forEach((o) => (o.environment || "").split(/\s*,\s*/).filter(Boolean)
	.forEach((e) => { if (!ENVIRONMENTS.has(e)) badEnv.push({ name: o.name, env: e }); }));

console.log(`  invalid cr        : ${badCr.length}`);
[...new Set(badCr.map((o) => o.cr))].slice(0, 10)
	.forEach((v) => console.log(`      ${JSON.stringify(v)}`));
console.log(`  invalid size      : ${badSize.length}`);
[...new Set(badSize.map((o) => o.size))].slice(0, 10)
	.forEach((v) => console.log(`      ${JSON.stringify(v)}`));
console.log(`  invalid environment: ${badEnv.length}`);
[...new Set(badEnv.map((b) => b.env))].slice(0, 10)
	.forEach((v) => console.log(`      ${JSON.stringify(v)}`));

// Source names referenced by monsters — these must exist in each workbook's Sources tab,
// which was NOT included in the export.
const srcNames = new Set();
all.forEach((o) => (o.sources || "").split(/\s*,\s*/).filter(Boolean).forEach((raw) => {
	const m = raw.match(/([^:]*): (.*)/);
	srcNames.add((m ? m[1] : raw).trim());
}));
console.log(`\n  distinct source names referenced : ${srcNames.size}`);
console.log("  (each must resolve against a Sources tab — see WARNING below)");

console.log("\n" + "═".repeat(72));
console.log("OVERLAP WITH EMBEDDED DATASET");
console.log("═".repeat(72));

const EMB = path.join(root, "data/raw/embedded-monsters.json");
if (fs.existsSync(EMB)) {
	const emb = JSON.parse(fs.readFileSync(EMB, "utf8"));
	const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
	const sheetByName = new Map(all.map((o) => [norm(o.name), o]));
	const matched = emb.filter((m) => sheetByName.has(norm(m.name)));
	console.log(`  embedded entries  : ${emb.length}`);
	console.log(`  matched by name   : ${matched.length}`);
	console.log(`  UNMATCHED         : ${emb.length - matched.length}  (need manual review)`);
	const unmatched = emb.filter((m) => !sheetByName.has(norm(m.name)));
	unmatched.slice(0, 10).forEach((m) => console.log(`      ${m.name}  [${m.sourcebook}]`));
	if (unmatched.length > 10) console.log(`      ... and ${unmatched.length - 10} more`);
	console.log(`\n  → ${matched.length} monsters can gain full stat blocks.`);
	console.log(`  → ${all.length - matched.length} sheet monsters will have no stat block.`);
} else {
	console.log("  data/raw/embedded-monsters.json not found — run extract-embedded.mjs");
}

console.log("\n" + "═".repeat(72));
console.log("SOURCE RESOLUTION  (the check the app silently skips)");
console.log("═".repeat(72));

const declared = new Map();   // source name -> { type, shortName, link, sheet }
let missingTabs = 0;

for (const spec of FILES) {
	const full = path.join(DIR, spec.sources);
	if (!fs.existsSync(full)) { missingTabs++; console.log(`  MISSING: ${spec.sources}`); continue; }
	const rows = toObjects(parseCsv(fs.readFileSync(full, "utf8")));
	rows.forEach((r) => {
		if (!r.name) return;
		if (declared.has(r.name)) {
			// monsters.service.js:81 logs a warning here and silently skips the source
			console.log(`  DUPLICATE source name: ${JSON.stringify(r.name)}`);
		}
		declared.set(r.name, {
			type: r.type, shortName: r["short name"], link: r.link, sheet: spec.sheet,
		});
	});
	console.log(`  ${spec.sheet.padEnd(12)} declares ${String(rows.length).padStart(3)} sources`);
}

if (!missingTabs) {
	const unresolved = [...srcNames].filter((n) => !declared.has(n)).sort();
	const unused = [...declared.keys()].filter((n) => !srcNames.has(n)).sort();

	console.log(`\n  declared sources  : ${declared.size}`);
	console.log(`  referenced sources: ${srcNames.size}`);
	console.log(`  UNRESOLVED        : ${unresolved.length}` +
		(unresolved.length ? "  ← these monsters vanish from every view" : "  ✓"));
	unresolved.forEach((n) => {
		const count = all.filter((o) => (o.sources || "").includes(n)).length;
		console.log(`      ${JSON.stringify(n)}  (${count} monsters affected)`);
	});
	console.log(`  declared-but-unused: ${unused.length}`);
	unused.forEach((n) => console.log(`      ${JSON.stringify(n)}`));

	const byType = {};
	[...declared.values()].forEach((d) => { byType[d.type] = (byType[d.type] || 0) + 1; });
	console.log("\n  sources by type (drives the source-filter UI):");
	Object.entries(byType).sort((a, b) => b[1] - a[1])
		.forEach(([t, c]) => console.log(`      ${String(c).padStart(3)}  ${t}`));
}
console.log("");
