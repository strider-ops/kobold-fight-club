(function() {
	"use strict";

	angular.module("app").factory("monsters", Monsters);

	/**
	 * The columns are deliberately shaped to match what the Google Sheets rows used to
	 * look like — delimited strings for tags/environment/sources, a CR label rather than
	 * a number — so that monsterFactory.Monster can consume them completely unchanged.
	 *
	 * That means the parsing monsterFactory already does is still done at load time
	 * rather than read from the precomputed columns (alignment_flags, size_sort,
	 * searchable) that build-db.mjs also writes. That is intentional for this phase:
	 * changing where the data comes from and how monster objects are built in the same
	 * step would make any regression impossible to attribute to one or the other.
	 * Phase 6 switches to the precomputed columns, once Phase 5 is green.
	 *
	 * COALESCE to '' rather than leaving NULLs, because the sheets never produced null —
	 * they produced empty strings, and Monster's parsing depends on that distinction
	 * (e.g. Number.parseInt("") is NaN and falls back to "", which templates render as
	 * blank, whereas null would surface differently).
	 */
	var MONSTER_SQL = [
		"SELECT m.fid, COALESCE(m.guid, '') AS guid, m.name,",
		"       COALESCE(m.section, '') AS section,",
		"       COALESCE(m.ac, m.ac_text, '') AS ac,",
		"       COALESCE(m.hp, m.hp_text, '') AS hp,",
		"       COALESCE(m.init, '') AS init,",
		"       c.label AS cr, m.type, m.size,",
		"       COALESCE(m.alignment_text, '') AS alignment,",
		// aliased back to `unique`: the column is unique_npc only because `unique` is a
		// reserved word in SQL, but monsterfactory.js reads args.unique.
		"       m.legendary, m.lair, m.unique_npc AS \"unique\", m.special,",
		"       (SELECT group_concat(t.name, ', ') FROM monster_tag mt",
		"          JOIN tag t ON t.id = mt.tag_id WHERE mt.monster_id = m.id) AS tags,",
		"       (SELECT group_concat(e.name, ', ') FROM monster_environment me",
		"          JOIN environment e ON e.id = me.environment_id",
		"         WHERE me.monster_id = m.id) AS environment,",
		"       (SELECT group_concat(",
		"                 CASE WHEN p.page IS NOT NULL THEN s.name || ': ' || p.page",
		"                      WHEN p.url  IS NOT NULL THEN s.name || ': ' || p.url",
		"                      ELSE s.name END, ', ')",
		"          FROM monster_printing p JOIN source s ON s.id = p.source_id",
		"         WHERE p.monster_id = m.id) AS sources",
		"  FROM monster m",
		"  JOIN cr c ON c.numeric = m.cr_numeric",
	].join("\n");

	var SOURCE_SQL =
		"SELECT name, COALESCE(short_name, '') AS shortname, COALESCE(type, '') AS type," +
		"       default_selected FROM source ORDER BY name";

	Monsters.$inject = ["$q", "$rootScope", "db", "misc", "monsterFactory"];
	function Monsters($q, $rootScope, db, miscLib, monsterFactory) {
		// Scoped to the injector rather than the module. These were module-level
		// globals, which works in a browser (one injector per page load) but leaks
		// state between tests, where every spec builds a fresh injector.
		var all = [];
		var byId = {};
		var byCr = {};
		var loadPromise = null;

		return {
			all: all,
			byCr: byCr,
			byId: byId,
			check: monsterFactory.checkMonster,
			load: load,
			addCustom: addCustom,
			removeCustom: removeCustom,
			hasId: function (id) { return byId[id] !== undefined; },
		};

		/**
		 * Populate all / byCr / byId from the database. Idempotent — every caller after
		 * the first gets the same promise, so injecting this service from several places
		 * cannot load the catalog twice.
		 */
		function load() {
			if ( loadPromise ) {
				return loadPromise;
			}

			loadPromise = $q.all([db.query(SOURCE_SQL), db.query(MONSTER_SQL)])
				.then(function (results) {
					registerSources(results[0]);
					addMonsters(results[1]);

					return { monsters: all.length, sources: results[0].length };
				});

			loadPromise.catch(function () { loadPromise = null; });

			return loadPromise;
		}

		/**
		 * Add an imported homebrew pack. Rows must be in the same shape the database
		 * query produces, so they go through the identical Monster construction path —
		 * an imported monster is not a second-class citizen with a different code path.
		 */
		function addCustom(sourceName, shortName, rows) {
			registerSources([{
				name: sourceName,
				shortname: shortName || "",
				type: "Homebrew",
				// Imported content is switched on immediately; the user just asked for it.
				default_selected: 1,
			}]);

			addMonsters(rows);

			// search.controller listens for this to tick the new source's filter box.
			$rootScope.$broadcast("custom-source-added", sourceName);

			return rows.length;
		}

		/** Remove an imported pack: its monsters, and its entry in the source lists. */
		function removeCustom(sourceName) {
			var removed = 0;

			for ( var i = all.length - 1; i >= 0; i-- ) {
				var monster = all[i];
				var fromThisSource = monster.sources.some(function (source) {
					return source.name === sourceName;
				});

				if ( !fromThisSource ) {
					continue;
				}

				all.splice(i, 1);
				delete byId[monster.id];

				var bucket = byCr[monster.cr.string] || [];
				var at = bucket.indexOf(monster);
				if ( at !== -1 ) {
					bucket.splice(at, 1);
				}

				removed++;
			}

			var sourceIndex = miscLib.sources.indexOf(sourceName);
			if ( sourceIndex !== -1 ) {
				miscLib.sources.splice(sourceIndex, 1);
			}

			// The original removeSheet() deleted miscLib.sourceFilters[name] using the
			// global `name` rather than its own argument, so it never removed anything.
			delete miscLib.sourceFilters[sourceName];
			delete miscLib.shortNames[sourceName];

			Object.keys(miscLib.sourcesByType).forEach(function (type) {
				var list = miscLib.sourcesByType[type];
				var at = list.indexOf(sourceName);
				if ( at !== -1 ) {
					list.splice(at, 1);
				}
				if ( !list.length ) {
					delete miscLib.sourcesByType[type];
				}
			});

			return removed;
		}

		function registerSources(rows) {
			rows.forEach(function (row) {
				if ( miscLib.sourceFilters[row.name] !== undefined ) {
					console.warn("Duplicate source", row.name);
					return;
				}

				miscLib.sources.push(row.name);
				miscLib.sourceFilters[row.name] = !!row.default_selected;
				miscLib.shortNames[row.name] = row.shortname;

				if ( !miscLib.sourcesByType[row.type] ) {
					miscLib.sourcesByType[row.type] = [];
				}

				miscLib.sourcesByType[row.type].push(row.name);
			});

			miscLib.sources.sort();
		}

		function addMonsters(rows) {
			rows.forEach(function (row) {
				var monster = new monsterFactory.Monster(row);

				// Reprints are separate rows with their own fid now, so there is nothing
				// left to merge — the id collision the old loadMonsters() guarded against
				// cannot happen. build-db.mjs fails the build on a duplicate fid.
				all.push(monster);
				byId[monster.id] = monster;

				if ( !byCr[monster.cr.string] ) {
					byCr[monster.cr.string] = [];
				}

				byCr[monster.cr.string].push(monster);
			});

			all.sort(function (a, b) {
				return (a.name > b.name) ? 1 : -1;
			});
		}
	}
})();
