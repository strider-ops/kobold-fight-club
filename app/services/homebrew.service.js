(function() {
	"use strict";

	angular.module("app").factory("homebrew", Homebrew);

	var STORAGE_KEY = "5em-homebrew";

	// localStorage is a ~5MB budget shared with saved encounters, parties and filters.
	// Refuse an import that would obviously crowd those out, with a message, rather than
	// letting the browser throw QuotaExceededError somewhere less obvious later.
	var MAX_PACK_BYTES = 1024 * 1024;
	var MAX_TOTAL_BYTES = 2 * 1024 * 1024;

	var SIZES = ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"];

	Homebrew.$inject = ["store", "csv", "crInfo", "monsters"];
	function Homebrew(store, csv, crInfo, monsters) {
		var packs = [];

		return {
			packs: packs,
			importText: importText,
			remove: remove,
			restore: restore,
		};

		/**
		 * Parse and add a homebrew file. Everything happens in the browser — the file is
		 * never uploaded anywhere.
		 *
		 * Returns { added, skipped, errors, sourceName }. Valid rows are imported even if
		 * some rows fail; the failures are reported rather than silently dropped, which
		 * is what the Google Sheets path used to do.
		 */
		function importText(filename, text) {
			var sourceName = packName(filename);
			var result = { sourceName: sourceName, added: 0, skipped: 0, errors: [] };

			if ( findPack(sourceName) ) {
				result.errors.push('"' + sourceName + '" is already imported. Remove it first.');
				return result;
			}

			var raw;
			try {
				raw = parseAny(text);
			} catch ( e ) {
				result.errors.push("Could not read the file: " + e.message);
				return result;
			}

			if ( !raw.length ) {
				result.errors.push("No rows found. Expected a CSV with a header row, or a JSON array.");
				return result;
			}

			var rows = [];
			raw.forEach(function (input, index) {
				var problems = [];
				var row = toMonsterRow(input, sourceName, problems);

				if ( problems.length ) {
					result.skipped++;
					// Row 1 is the header in a CSV, so the user's line number is index + 2.
					result.errors.push("Row " + (index + 2) + ": " + problems.join("; "));
					return;
				}

				rows.push(row);
			});

			var seen = {};
			rows = rows.filter(function (row) {
				if ( seen[row.fid] || monsters.hasId(row.fid) ) {
					result.skipped++;
					result.errors.push('Duplicate monster "' + row.name + '" skipped.');
					return false;
				}
				seen[row.fid] = true;
				return true;
			});

			if ( !rows.length ) {
				return result;
			}

			var pack = { name: sourceName, shortName: shortNameFor(sourceName), rows: rows };
			var sizeError = checkBudget(pack);
			if ( sizeError ) {
				result.errors.push(sizeError);
				return result;
			}

			packs.push(pack);
			persist();

			result.added = monsters.addCustom(pack.name, pack.shortName, pack.rows);
			return result;
		}

		function remove(sourceName) {
			var index = packs.indexOf(findPack(sourceName));

			if ( index === -1 ) {
				return false;
			}

			packs.splice(index, 1);
			persist();
			monsters.removeCustom(sourceName);

			return true;
		}

		/** Re-add previously imported packs. Call after monsters.load() resolves. */
		function restore() {
			return store.get(STORAGE_KEY).then(function (stored) {
				(stored || []).forEach(function (pack) {
					if ( !pack || !pack.name || !pack.rows ) {
						return;
					}
					packs.push(pack);
					monsters.addCustom(pack.name, pack.shortName, pack.rows);
				});
				return packs.length;
			}, function () {
				// A corrupt value should not stop the app from starting.
				return 0;
			});
		}

		//////

		function parseAny(text) {
			var trimmed = text.replace(/^﻿/, "").trim();

			if ( trimmed.charAt(0) === "[" || trimmed.charAt(0) === "{" ) {
				var parsed = JSON.parse(trimmed);
				return angular.isArray(parsed) ? parsed : (parsed.monsters || []);
			}

			return csv.toObjects(csv.parse(trimmed));
		}

		/**
		 * Map one input row onto the shape monsters.service's SQL produces, so imported
		 * monsters go through exactly the same Monster construction as built-in ones.
		 * Accepts the Google Sheets template's column names, with or without the "?".
		 */
		function toMonsterRow(input, sourceName, problems) {
			var pick = function () {
				for ( var i = 0; i < arguments.length; i++ ) {
					var value = input[arguments[i]];
					if ( value !== undefined && value !== null && String(value).trim() !== "" ) {
						return String(value).trim();
					}
				}
				return "";
			};

			var name = pick("name", "Name");
			var cr = pick("cr", "CR");
			var size = pick("size", "Size");
			var type = pick("type", "Type");

			if ( !name ) {
				problems.push("missing name");
			}
			if ( !cr ) {
				problems.push("missing cr");
			} else if ( !crInfo[cr] ) {
				problems.push('unknown cr "' + cr + '" (use 0, 1/8, 1/4, 1/2, or 1-30)');
			}
			if ( size && SIZES.indexOf(size) === -1 ) {
				problems.push('unknown size "' + size + '" (use ' + SIZES.join(", ") + ")");
			}
			if ( !type ) {
				problems.push("missing type");
			}

			if ( problems.length ) {
				return null;
			}

			return {
				// Namespaced so an import can never collide with a built-in fid, and so
				// saved encounters referencing it stay distinguishable.
				fid: "homebrew." + slug(sourceName) + "." + slug(name),
				guid: "",
				name: name,
				section: pick("section", "Section"),
				ac: pick("ac", "AC"),
				hp: pick("hp", "HP"),
				init: pick("init", "Init"),
				cr: cr,
				type: type,
				size: size || "Medium",
				alignment: pick("alignment", "Alignment") || "unaligned",
				legendary: truthy(pick("legendary?", "legendary", "Legendary")),
				lair: truthy(pick("lair?", "lair", "Lair")),
				unique: truthy(pick("unique?", "unique", "Unique")),
				special: 0,
				tags: pick("tags", "Tags"),
				environment: pick("environment", "environments", "Environment"),
				// The pack is the source, so its filter checkbox controls its monsters.
				// A page number from the file is kept; any source name in it is not.
				sources: sourceName + pageSuffix(pick("sources", "source", "Sources")),
			};
		}

		function pageSuffix(sources) {
			var match = /:\s*(\d+)\s*$/.exec(sources || "");
			return match ? ": " + match[1] : "";
		}

		function truthy(value) {
			return /^(1|y|yes|true|lair|legendary|unique)$/i.test(value) ? 1 : 0;
		}

		function slug(value) {
			return String(value).toLowerCase()
				.replace(/['’]/g, "")
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/^-|-$/g, "");
		}

		function packName(filename) {
			return String(filename || "Homebrew")
				.replace(/\.[^.]+$/, "")
				.replace(/[_-]+/g, " ")
				.trim() || "Homebrew";
		}

		function shortNameFor(sourceName) {
			var initials = sourceName.split(/\s+/)
				.map(function (word) { return word.charAt(0); })
				.join("")
				.toUpperCase();

			return initials.slice(0, 5);
		}

		function findPack(sourceName) {
			return packs.filter(function (p) { return p.name === sourceName; })[0];
		}

		function checkBudget(pack) {
			var packBytes = angular.toJson(pack).length;
			var totalBytes = angular.toJson(packs).length + packBytes;

			if ( packBytes > MAX_PACK_BYTES ) {
				return "That file is too large to store (" + Math.round(packBytes / 1024) +
					"KB). The limit is " + (MAX_PACK_BYTES / 1024) + "KB per import.";
			}

			if ( totalBytes > MAX_TOTAL_BYTES ) {
				return "Not enough room left for imported content. Remove an existing " +
					"import and try again.";
			}

			return null;
		}

		function persist() {
			try {
				store.set(STORAGE_KEY, packs);
			} catch ( e ) {
				// Saving failed, but the monsters are already loaded for this session.
				console.error("Could not save imported content.", e);
			}
		}
	}
})();
