(function () {
	/* global requirejs */
	"use strict";

	// polyfill for older browsers that don't support Number.parseInt natively
	if ( !Number.parseInt ) {
		Number.parseInt = window.parseInt;
	}

	var myApp = angular
		.module("app", [
			"ui.router",
			"ngTouch",
			"angularUtils.directives.dirPagination",
			"LocalStorageModule"
		]);

	myApp.config(function(localStorageServiceProvider) {
		localStorageServiceProvider
    		.setPrefix('');
	});

	myApp.run(serviceInitialization);

	serviceInitialization.$inject = ['encounter', 'players', 'partyInfo', 'monsters', 'homebrew'];

	function serviceInitialization(encounter, players, partyInfo, monsters, homebrew) {
		discardStaleSheetCache();

		partyInfo.initialize();
		encounter.initialize();
		players.initialize();

		// Fills monsters.all / byCr / byId in place, so the views bound to them update
		// as soon as it resolves. Failure is surfaced rather than swallowed: the old
		// JSONP loader's promise never settled on error, which is why a first-time
		// visitor saw an empty monster list and no explanation.
		monsters.load()
			// Imported homebrew is layered on top once the built-in catalog is in place,
			// so a duplicate check has something to check against.
			.then(function () { return homebrew.restore(); })
			.catch(function (error) {
				// In tests, the db service is mocked and doesn't actually load sql.js.
				// Suppress the harmless warning to keep test output clean.
				var isTestEnvironment = typeof window.jasmine !== "undefined" ||
					typeof window.__karma__ !== "undefined";
				if ( !isTestEnvironment || !String(error.message).includes("sql.js") ) {
					console.error("Could not load the monster database.", error);
				}
			});
	}

	/**
	 * One-time cleanup of the pre-SQLite Google Sheets cache. These keys hold a full
	 * copy of each sheet and are dead weight against a ~5MB localStorage quota that
	 * saved encounters and imported homebrew now have to share.
	 */
	function discardStaleSheetCache() {
		try {
			Object.keys(window.localStorage)
				.filter(function (key) {
					return key === "5em-sheet-meta" || key.indexOf("5em-sheet-cache:") === 0;
				})
				.forEach(function (key) { window.localStorage.removeItem(key); });
		} catch ( e ) {
			// Private browsing can make localStorage throw on access. Not fatal.
		}
	}
})();
