/**
 * Minimal RFC4180 CSV parser — handles quoted fields, embedded commas, doubled quotes.
 * Extracted from inspect-sheets.mjs so the reconcile/build scripts share one parser.
 */

export function parseCsv(text) {
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

/** First row is the header; blank rows are dropped; all values trimmed. */
export function toObjects(rows) {
	const header = rows[0];
	return rows.slice(1)
		.filter((r) => r.some((c) => c !== ""))
		.map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])));
}

/** Normalised join key — the README's fid transform: lowercase alphanumerics only. */
export function norm(s) {
	return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/**
 * Split a `sources` cell into { name, page } parts.
 * "Out of the Abyss: 235, Mordenkainen's Tome of Foes: 143" → two entries.
 * Mirrors the grammar monsterfactory.js:49-72 already parses.
 */
export function parseSources(cell) {
	return (cell || "").split(/\s*,\s*/).filter(Boolean).map((raw) => {
		const m = raw.match(/^(.*?):\s*(.*)$/);
		return m
			? { name: m[1].trim(), page: m[2].trim() }
			: { name: raw.trim(), page: "" };
	});
}
