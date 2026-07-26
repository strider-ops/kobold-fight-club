(function() {
/* global _ */
'use strict';

  angular
    .module('app')
    .factory('partyInfo', PartyInfo);

  PartyInfo.inject = ['playerLevels', 'store'];

  function PartyInfo(playerLevels, store) {
    var service = {
      // Variables
			partyLevels: [
				{
					level: playerLevels[1],
					playerCount: 4
				}
			],

      // Methods
      initialize: initialize,
			freeze: freeze,
			thaw: thaw,

      // Properties
			get totalPlayerCount() {
				return _.sum(_.map(service.partyLevels, function (pl) { return pl.playerCount; }));
			},

			get totalPartyExpLevels() {
				var result = _.reduce(service.partyLevels, function(accum, curLevel) {
					var curExpLevels = getExpLevels(curLevel);

					return {
							easy: accum.easy + curExpLevels.easy,
							medium: accum.medium + curExpLevels.medium,
							hard: accum.hard + curExpLevels.hard,
							deadly: accum.deadly + curExpLevels.deadly,
							budget: accum.budget + curExpLevels.budget
					};
				}, { easy: 0, medium: 0, hard: 0, deadly: 0, budget: 0});
				return result;
			}
    };
    
    return service;

		function getExpLevels(partyLevel) {
				return {
					easy: partyLevel.playerCount * partyLevel.level.easy,
					medium: partyLevel.playerCount * partyLevel.level.medium,
					hard: partyLevel.playerCount * partyLevel.level.hard,
					deadly: partyLevel.playerCount * partyLevel.level.deadly,
					budget: partyLevel.playerCount * partyLevel.level.budget
				};
		}

    ////////////////
    function initialize() {
			thaw();
		}

    function freeze() {
			var o =_.map(service.partyLevels, function (pl) {
				return {
					level: pl.level.level,
					playerCount: pl.playerCount
				};
			});

			store.set("5em-party-info", o);
		}

		function thaw() {
			if (store.hasKey('5em-party-info')) {
				return store.get("5em-party-info").then(loadPartyInfoFromStore);
			} else {
				return store.get("5em-encounter").then(loadFromEncounterStoreAndConvert);
			}
		}

		/*
			Token: 5em-party-info
			Type: Array
			Example:
				[
					{
						level: 4,
						playerCount: 4
					}
				]
		*/
		function loadPartyInfoFromStore(frozenDataArray) {
			if ( !frozenDataArray ) {
				return;
			}

			var loaded = [];

			_.forEach(frozenDataArray, function(frozenData) {
				var level = playerLevels[frozenData && frozenData.level];

				// Skip anything that does not name a real level. Without this an entry
				// with no level survives as { level: undefined }, and every later read of
				// totalPartyExpLevels throws on partyLevel.level.easy — permanently, since
				// the bad value is already in storage. See loadFromEncounterStoreAndConvert.
				if ( !level ) {
					return;
				}

				loaded.push({
					level: level,
					playerCount: frozenData.playerCount
				});
			});

			// Nothing usable was stored, so keep the defaults rather than an empty party.
			if ( loaded.length ) {
				service.partyLevels = loaded;
			}
		}

		function loadFromEncounterStoreAndConvert(frozenData) {
			// This is a migration from a much older format, when 5em-encounter held
			// { partyLevel, playerCount }. encounter.freeze() now writes { groups } — no
			// partyLevel at all — so without this shape check the conversion below stores
			// level: undefined and every difficulty calculation throws from then on.
			if ( !frozenData || frozenData.partyLevel === undefined ) {
				return;
			}

			service.partyLevels = [{
				level: playerLevels[frozenData.partyLevel],
				playerCount: frozenData.playerCount
			}];

			var newFrozenData = [
				{
					level: frozenData.partyLevel,
					playerCount: frozenData.playerCount
				}
			];
			store.set("5em-party-info", newFrozenData);

			if (store.hasKey("5em-current-encounter")) {
				store.remove("5em-encounter");
			}
		}
  }
})();
