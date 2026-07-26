(function() {
	"use strict";

	angular.module("app").factory("db", Db);

	// sql.js is vendored under vendor/sql.js/ rather than loaded from a CDN. This app
	// broke in the first place because it depended on a third-party service staying up;
	// a CDN would reintroduce exactly that failure mode. It also keeps the app working
	// offline. See MIGRATION-PLAN.md Part 2.
	var WASM_PATH = "vendor/sql.js/";
	var DB_PATH = "data/monsters.db";

	Db.$inject = ["$q"];
	function Db($q) {
		var ready = null;

		return {
			ready: open,
			query: query,
		};

		// Opens the database once and hands the same promise to every later caller.
		function open() {
			if ( ready ) {
				return ready;
			}

			if ( typeof window.initSqlJs !== "function" ) {
				return $q.reject(new Error(
					"sql.js is not loaded — check the vendor/sql.js script tag in index.html"));
			}

			ready = $q.when(window.initSqlJs({
				locateFile: function (file) { return WASM_PATH + file; }
			}))
			.then(function (SQL) {
				return $q.when(fetch(DB_PATH)).then(function (response) {
					if ( !response.ok ) {
						throw new Error("Could not fetch " + DB_PATH +
							" (" + response.status + " " + response.statusText + ")");
					}
					return $q.when(response.arrayBuffer()).then(function (buffer) {
						return new SQL.Database(new Uint8Array(buffer));
					});
				});
			});

			// Don't cache a rejection — a transient fetch failure should not permanently
			// poison the service for the rest of the session.
			ready.catch(function () { ready = null; });

			return ready;
		}

		/**
		 * Run a query and get plain row objects back.
		 *
		 * sql.js returns { columns: [...], values: [[...]] }, which is compact but
		 * awkward at the call site, so it is zipped into objects here.
		 */
		function query(sql, params) {
			return open().then(function (database) {
				var result = database.exec(sql, params || []);

				if ( !result.length ) {
					return [];
				}

				var columns = result[0].columns;
				return result[0].values.map(function (row) {
					var out = {};
					for ( var i = 0; i < columns.length; i++ ) {
						out[columns[i]] = row[i];
					}
					return out;
				});
			});
		}
	}
})();
