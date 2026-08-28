/**
 * RFC4180 CSV parsing for homebrew imports
 *
 * This deliberately mirrors scripts/lib/csv.mjs, which the build scripts use to read
 * the recovered Google Sheets exports. The two cannot share a file — that one is a
 * Node ES module, this runs in the browser — but they must agree, because a user's
 * homebrew CSV is expected to use the same column layout as the community sheet template.
 */

/**
 * Parse CSV text into array of arrays
 * Handles quoted fields, embedded commas and newlines, and doubled quotes
 */
export function parse(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') {
      field += c;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/**
 * Convert CSV rows to array of objects
 * First row is the header. Blank rows are dropped, all values trimmed.
 */
export function toObjects(rows: string[][]): Record<string, string>[] {
  if (!rows.length) {
    return [];
  }

  const header = rows[0].map((h) => h.trim());

  return rows
    .slice(1)
    .filter((r) => r.some((c) => c !== ''))
    .map((r) => {
      const out: Record<string, string> = {};
      header.forEach((h, i) => {
        out[h] = r[i] === undefined || r[i] === null ? '' : String(r[i]).trim();
      });
      return out;
    });
}

// Export as object for compatibility
export const csv = {
  parse,
  toObjects,
};
