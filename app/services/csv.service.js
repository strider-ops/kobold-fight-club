(function() {
	"use strict";

	angular.module("app").factory("csv", CsvService);

	/**
	 * RFC4180 CSV parsing for homebrew imports.
	 *
	 * This deliberately mirrors scripts/lib/csv.mjs, which the build scripts use to read
	 * the recovered Google Sheets exports. The two cannot share a file — that one is a
	 * Node ES module, this runs as an ES5 script in the browser — but they must agree,
	 * because a user's homebrew CSV is expected to use the same column layout as the
	 * community sheet template. Keep them in step if either changes.
	 */
	function CsvService() {
		return {
			parse: parse,
			toObjects: toObjects,
		};

		/** Handles quoted fields, embedded commas and newlines, and doubled quotes. */
		function parse(text) {
			var rows = [];
			var row = [];
			var field = "";
			var inQuotes = false;

			for ( var i = 0; i < text.length; i++ ) {
				var c = text[i];

				if ( inQuotes ) {
					if ( c === '"' ) {
						if ( text[i + 1] === '"' ) {
							field += '"';
							i++;
						} else {
							inQuotes = false;
						}
					} else {
						field += c;
					}
				} else if ( c === '"' ) {
					inQuotes = true;
				} else if ( c === "," ) {
					row.push(field);
					field = "";
				} else if ( c === "\n" ) {
					row.push(field);
					rows.push(row);
					row = [];
					field = "";
				} else if ( c !== "\r" ) {
					field += c;
				}
			}

			if ( field || row.length ) {
				row.push(field);
				rows.push(row);
			}

			return rows;
		}

		/** First row is the header. Blank rows are dropped, all values trimmed. */
		function toObjects(rows) {
			if ( !rows.length ) {
				return [];
			}

			var header = rows[0].map(function (h) { return h.trim(); });

			return rows.slice(1)
				.filter(function (r) {
					return r.some(function (c) { return c !== ""; });
				})
				.map(function (r) {
					var out = {};
					header.forEach(function (h, i) {
						out[h] = (r[i] === undefined || r[i] === null) ? "" : String(r[i]).trim();
					});
					return out;
				});
		}
	}
})();
