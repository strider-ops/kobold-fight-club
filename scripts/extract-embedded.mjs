#!/usr/bin/env node
/**
 * Phase 0 — Extract the embedded monster dataset out of search.controller.js.
 *
 * The `wip` commit (110c7ab, 2021-08-15) inlined 904 monsters with full stat blocks
 * as a `var data = [...]` literal on a single ~630KB line. That makes the data
 * effectively unreviewable: it can't be diffed, validated, or edited safely.
 *
 * This script pulls it out into a real JSON file so it becomes a first-class,
 * diffable artifact before any migration work depends on it.
 *
 *   node scripts/extract-embedded.mjs
 *
 * Writes: data/raw/embedded-monsters.json
 *
 * Read-only with respect to the source file. Safe to re-run.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(root, "app/encounter-builder/search.controller.js");
const OUT = path.join(root, "data/raw/embedded-monsters.json");

const MARKER = "var data = ";

/** Scan forward from an opening bracket to its match, respecting strings/escapes. */
function sliceBalancedArray(text, startIndex) {
	let depth = 0;
	let inString = false;
	let quote = "";

	for (let i = startIndex; i < text.length; i++) {
		const ch = text[i];

		if (inString) {
			if (ch === "\\") { i++; continue; }   // skip escaped char
			if (ch === quote) inString = false;
			continue;
		}

		if (ch === '"' || ch === "'") { inString = true; quote = ch; continue; }
		if (ch === "[") depth++;
		else if (ch === "]") {
			depth--;
			if (depth === 0) return text.slice(startIndex, i + 1);
		}
	}
	throw new Error("Unbalanced array literal — could not find closing bracket.");
}

function main() {
	if (!fs.existsSync(SRC)) {
		console.error(`Source not found: ${SRC}`);
		process.exit(1);
	}

	const text = fs.readFileSync(SRC, "utf8");
	const markerAt = text.indexOf(MARKER);
	if (markerAt === -1) {
		console.error(`Could not find "${MARKER}" in ${path.relative(root, SRC)}.`);
		console.error("The literal may already have been removed (Phase 3 deletes it).");
		process.exit(1);
	}

	const arrayStart = text.indexOf("[", markerAt);
	const literal = sliceBalancedArray(text, arrayStart);

	let data;
	try {
		data = JSON.parse(literal);
	} catch (err) {
		console.error("Extracted literal is not valid JSON:", err.message);
		process.exit(1);
	}

	if (!Array.isArray(data) || data.length === 0) {
		console.error("Extracted value is not a non-empty array.");
		process.exit(1);
	}

	fs.mkdirSync(path.dirname(OUT), { recursive: true });
	fs.writeFileSync(OUT, JSON.stringify(data, null, 1) + "\n", "utf8");

	// ---- Report ----
	const names = data.map((m) => m.name);
	const distinct = new Set(names);
	const dupes = [...distinct].filter(
		(n) => names.filter((x) => x === n).length > 1
	);
	const books = new Set(data.map((m) => m.sourcebook).filter(Boolean));

	console.log(`Wrote ${path.relative(root, OUT)}`);
	console.log(`  entries          : ${data.length}`);
	console.log(`  distinct names   : ${distinct.size}`);
	console.log(`  duplicate names  : ${dupes.length}  (reprints — see monster_printing)`);
	console.log(`  sourcebooks      : ${books.size}`);
	console.log(`  with stat block  : ${data.filter((m) => m.stats).length}`);
	console.log("");
	console.log("  MISSING vs Google Sheets (must come from reconciliation, Phase 1):");
	console.log(`    fid          : ${data.filter((m) => m.fid).length} / ${data.length}`);
	console.log(`    environments : ${data.filter((m) => m.environments).length} / ${data.length}`);

	if (dupes.length) {
		console.log("");
		console.log(`  Reprint conflicts needing is_canonical (${dupes.length}):`);
		dupes.slice(0, 10).forEach((n) => console.log(`    - ${n}`));
		if (dupes.length > 10) console.log(`    ... and ${dupes.length - 10} more`);
	}
}

main();
