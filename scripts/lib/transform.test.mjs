/**
 * Phase 5 — unit tests for the build-time transforms.
 *
 *   node --test scripts/
 *
 * Uses node:test, so there is nothing to install.
 */

import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	SIZES, sizeSort, alignmentFlags, intOrNull, textIfNotNumeric,
	crLabel, kebab, norm, parseSources, splitList,
} from "./transform.mjs";
import { loadAngularService } from "./angular-meta.mjs";
import { parseCsv, toObjects } from "./csv.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const alignments = loadAngularService(path.join(root, "app/meta/alignments.js"), "alignments");
const crInfo = loadAngularService(path.join(root, "app/meta/crInfo.js"), "crInfo");

test("sizeSort orders sizes smallest to largest", () => {
	assert.deepEqual(SIZES.map(sizeSort), [1, 2, 3, 4, 5, 6]);
});

test("sizeSort returns -1 for an unknown size", () => {
	assert.equal(sizeSort("Enormous"), -1);
	assert.equal(sizeSort(""), -1);
	assert.equal(sizeSort(undefined), -1);
});

test("alignmentFlags matches each single alignment to its own bitmask", () => {
	for (const key of ["lg", "ng", "cg", "ln", "n", "cn", "le", "ne", "ce", "unaligned"]) {
		const { text, flags } = alignments[key];
		assert.equal(alignmentFlags(text, alignments), flags, `${key} ("${text}")`);
	}
});

test("alignmentFlags prefers specific alignments over the 'neutral'/'any' substrings", () => {
	// "neutral evil" contains "neutral"; "any chaotic" contains "any". Getting the test
	// order wrong silently mislabels hundreds of monsters, so pin it.
	assert.equal(alignmentFlags("neutral evil", alignments), alignments.ne.flags);
	assert.equal(alignmentFlags("neutral good", alignments), alignments.ng.flags);
	assert.equal(alignmentFlags("lawful neutral", alignments), alignments.ln.flags);
	assert.equal(alignmentFlags("any chaotic", alignments), alignments.any_chaotic.flags);
	assert.equal(alignmentFlags("any neutral", alignments), alignments.any_neutral.flags);
});

test("alignmentFlags combines a comma- or 'or'-separated list", () => {
	const both = alignments.lg.flags | alignments.ce.flags;

	assert.equal(alignmentFlags("lawful good, chaotic evil", alignments), both);
	assert.equal(alignmentFlags("lawful good or chaotic evil", alignments), both);
	assert.equal(alignmentFlags("lawful good, or chaotic evil", alignments), both);
});

test("alignmentFlags handles the hyphen/space variants the regex allows", () => {
	assert.equal(alignmentFlags("non-evil", alignments), alignments.non_evil.flags);
	assert.equal(alignmentFlags("non evil", alignments), alignments.non_evil.flags);
});

test("alignmentFlags returns null rather than guessing", () => {
	assert.equal(alignmentFlags("", alignments), null);
	assert.equal(alignmentFlags(null, alignments), null);
	assert.equal(alignmentFlags("gibberish", alignments), null);
});

test("intOrNull accepts integers including negatives, rejects everything else", () => {
	assert.equal(intOrNull("15"), 15);
	assert.equal(intOrNull(" 15 "), 15);
	assert.equal(intOrNull("-2"), -2);
	assert.equal(intOrNull(0), 0);
	assert.equal(intOrNull(""), null);
	assert.equal(intOrNull(null), null);
	assert.equal(intOrNull(undefined), null);
	assert.equal(intOrNull("18 (natural armor)"), null);
	assert.equal(intOrNull("1/4"), null);
});

test("textIfNotNumeric keeps only values that are not clean integers", () => {
	assert.equal(textIfNotNumeric("18 (natural armor)"), "18 (natural armor)");
	assert.equal(textIfNotNumeric("15"), null, "numeric goes in the INTEGER column instead");
	assert.equal(textIfNotNumeric(""), null);
	assert.equal(textIfNotNumeric(null), null);
});

test("crLabel converts fractional CRs to the labels crInfo is keyed by", () => {
	assert.equal(crLabel(0.125), "1/8");
	assert.equal(crLabel(0.25), "1/4");
	assert.equal(crLabel(0.5), "1/2");
	assert.equal(crLabel(0), "0");
	assert.equal(crLabel(23), "23");
});

test("every crLabel output resolves in the app's own crInfo table", () => {
	for (const value of [0, 0.125, 0.25, 0.5, 1, 17, 30]) {
		assert.ok(crInfo[crLabel(value)], `crInfo["${crLabel(value)}"] should exist`);
	}
});

test("kebab follows the README's fid rule", () => {
	assert.equal(kebab("Derro Savant"), "derro-savant");
	assert.equal(kebab("Fraz-Urb'luu"), "fraz-urbluu");
	assert.equal(kebab("Graz'zt"), "grazzt");
	assert.equal(kebab("Lizard King/Queen"), "lizard-king-queen");
	assert.equal(kebab("  Spaced  Out  "), "spaced-out");
});

test("norm strips everything but lowercase alphanumerics", () => {
	assert.equal(norm("Fraz-Urb'luu"), "frazurbluu");
	assert.equal(norm("Grubb, the Unclean"), "grubbtheunclean");
	assert.equal(norm(""), "");
	assert.equal(norm(null), "");
});

test("parseSources splits a multi-source cell with page numbers", () => {
	assert.deepEqual(
		parseSources("Out of the Abyss: 235, Mordenkainen's Tome of Foes: 143"),
		[
			{ name: "Out of the Abyss", page: "235" },
			{ name: "Mordenkainen's Tome of Foes", page: "143" },
		],
	);
});

test("parseSources handles a source with no page, and a URL", () => {
	assert.deepEqual(parseSources("Tome of Beasts"), [{ name: "Tome of Beasts", page: "" }]);
	assert.deepEqual(
		parseSources("Monster-A-Day: https://example.com/a/b"),
		[{ name: "Monster-A-Day", page: "https://example.com/a/b" }],
	);
});

test("parseSources keeps both pages when one book prints a monster twice", () => {
	// tob.ratfolk-rogue is on pages 320 and 424 of Tome of Beasts — the case that
	// disproved the original UNIQUE(monster_id, source_id) constraint.
	assert.deepEqual(
		parseSources("Tome of Beasts: 320, Tome of Beasts: 424"),
		[
			{ name: "Tome of Beasts", page: "320" },
			{ name: "Tome of Beasts", page: "424" },
		],
	);
});

test("parseSources returns nothing for an empty cell", () => {
	assert.deepEqual(parseSources(""), []);
	assert.deepEqual(parseSources(null), []);
});

test("splitList splits tags and environments, dropping blanks", () => {
	assert.deepEqual(splitList("cave, forest"), ["cave", "forest"]);
	assert.deepEqual(splitList("Demon"), ["Demon"]);
	assert.deepEqual(splitList(""), []);
	assert.deepEqual(splitList(null), []);
});

test("parseCsv handles quoted fields, embedded commas and doubled quotes", () => {
	const rows = parseCsv('a,b\n"one, two","say ""hi"""\n');

	assert.deepEqual(rows, [["a", "b"], ["one, two", 'say "hi"']]);
});

test("parseCsv handles newlines inside quoted fields", () => {
	assert.deepEqual(parseCsv('a\n"line1\nline2"\n'), [["a"], ["line1\nline2"]]);
});

test("toObjects uses the header row and drops blank rows", () => {
	const objects = toObjects(parseCsv("name,cr\nGoblin,1/4\n,\nOrc,1/2\n"));

	assert.deepEqual(objects, [
		{ name: "Goblin", cr: "1/4" },
		{ name: "Orc", cr: "1/2" },
	]);
});
