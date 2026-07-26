/**
 * Pure transforms shared by reconcile.mjs and build-db.mjs.
 *
 * These are the pieces that do once, at build time, what monsterfactory.js currently
 * redoes in every visitor's browser on every page load. They live here — separate from
 * the scripts that orchestrate file IO and SQL — so they can be unit tested.
 */

export const SIZES = ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"];

/** Replaces parseSize (monsterfactory.js:158-168). -1 for anything unrecognised. */
export function sizeSort(size) {
	const index = SIZES.indexOf(size);
	return index === -1 ? -1 : index + 1;
}

/**
 * Order matters: "neutral" and "any" are substrings of more specific alignments, so they
 * must be tested last. Mirrors alignmentTestOrder in monsterfactory.js:134-155.
 */
export const ALIGNMENT_ORDER = [
	"any_chaotic", "any_evil", "any_good", "any_lawful", "any_neutral",
	"non_chaotic", "non_evil", "non_good", "non_lawful", "unaligned",
	"lg", "ng", "cg", "ln", "cn", "le", "ne", "ce", "n", "any",
];

/**
 * Precompute the bitmask parseAlignment() builds at runtime.
 *
 * Returns null when nothing matched, rather than silently falling back to `unaligned`
 * the way monsterfactory.js:109 does — the caller decides whether that is fatal.
 *
 * `alignments` is the table from app/meta/alignments.js.
 */
export function alignmentFlags(text, alignments) {
	const order = ALIGNMENT_ORDER.map((key) => alignments[key]);

	const flags = String(text || "")
		// A list of alignments separated by commas, "or", or both.
		.split(/\s*(,|or|,\s*or)\s*/i)
		.reduce((total, part) => {
			const hit = order.find((a) => part.match(a.regex));
			return total | (hit ? hit.flags : 0);
		}, 0);

	return flags || null;
}

/** An integer, or null if the value is absent or not cleanly numeric. */
export function intOrNull(value) {
	if (value === null || value === undefined || value === "") return null;
	return /^-?\d+$/.test(String(value).trim()) ? parseInt(value, 10) : null;
}

/**
 * Keep the raw string only when it is *not* cleanly numeric. monsterfactory.js:25-36
 * parses an int and falls back to the raw value for things like "18 (natural armor)",
 * so both need somewhere to live.
 */
export function textIfNotNumeric(value) {
	if (value === null || value === undefined || value === "") return null;
	return intOrNull(value) === null ? String(value) : null;
}

/** The embedded dataset stores CR numerically; the sheets and crInfo use labels. */
export function crLabel(value) {
	return ({ 0.125: "1/8", 0.25: "1/4", 0.5: "1/2" })[value] ?? String(value);
}

/** The README's fid rule: lowercase, apostrophes dropped, runs of other chars to dashes. */
export function kebab(value) {
	return String(value).toLowerCase()
		.replace(/['’]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

/** Normalised join key — lowercase alphanumerics only. */
export function norm(value) {
	return (value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/**
 * Split a `sources` cell into { name, page } parts.
 * "Out of the Abyss: 235, Mordenkainen's Tome of Foes: 143" → two entries.
 * Mirrors the grammar monsterfactory.js:49-72 parses at runtime.
 */
export function parseSources(cell) {
	return (cell || "").split(/\s*,\s*/).filter(Boolean).map((raw) => {
		const match = raw.match(/^(.*?):\s*(.*)$/);
		return match
			? { name: match[1].trim(), page: match[2].trim() }
			: { name: raw.trim(), page: "" };
	});
}

/** Split a delimited cell (tags, environments) into a trimmed list. */
export function splitList(cell) {
	return (cell || "").split(/\s*,\s*/).filter(Boolean);
}
