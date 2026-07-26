'use strict';

describe('monsters tests', function() {
	// Rows shaped exactly as the SQL in monsters.service.js returns them.
	var SOURCE_ROWS = [
		{ name: 'Monster Manual', shortname: 'MM', type: 'Official', default_selected: 1 },
		{ name: 'Tome of Beasts', shortname: 'ToB', type: 'Third-Party', default_selected: 0 },
	];
	var MONSTER_ROWS = [
		{
			fid: 'mm.tarrasque', guid: '', name: 'Tarrasque', section: '',
			ac: 25, hp: 676, init: 0, cr: '30', type: 'Monstrosity', size: 'Gargantuan',
			alignment: 'unaligned', legendary: 1, lair: 0, unique: 1, special: 0,
			tags: 'Titan', environment: '',
			sources: 'Monster Manual: 286, Tome of Beasts: 12',
		},
		{
			fid: 'mm.goblin', guid: '', name: 'Goblin', section: '',
			ac: 15, hp: 7, init: 2, cr: '1/4', type: 'Humanoid', size: 'Small',
			alignment: 'neutral evil', legendary: 0, lair: 0, unique: 0, special: 0,
			tags: 'Goblinoid', environment: 'cave, forest',
			sources: 'Monster Manual: 166',
		},
	];

	var monsters, misc, $rootScope;

	beforeEach(module('app'));

	// Stand in for db.service so the suite needs no HTTP server, no WASM and no
	// monsters.db. This exercises monsters.service's own logic, not sql.js's.
	beforeEach(module(function ($provide) {
		$provide.factory('db', function ($q) {
			return {
				ready: function () { return $q.when(null); },
				query: function (sql) {
					return $q.when(/FROM source/.test(sql) ? SOURCE_ROWS : MONSTER_ROWS);
				},
			};
		});
	}));

	beforeEach(inject(function (_monsters_, _misc_, _$rootScope_, $httpBackend) {
		// Running a digest starts the router, which fetches state templates. Nothing
		// here renders them, but ngMock rejects any request it has not been told about.
		$httpBackend.whenGET(/\.html$/).respond(200, '');

		monsters = _monsters_;
		misc = _misc_;
		$rootScope = _$rootScope_;

		// app.module's run block already calls load(); flush the promise queue so the
		// data is in place. load() is idempotent, so calling it again is harmless.
		monsters.load();
		$rootScope.$apply();
	}));

	describe('api', function() {
		it('should have correct methods', function() {
			expect(monsters.all).toBeDefined();
			expect(monsters.all.length).toBeGreaterThan(0);
			expect(_.isObject(monsters.byCr)).toBe(true);
			expect(_.keys(monsters.byCr).length).toBeGreaterThan(0);
			expect(_.isObject(monsters.byId)).toBe(true);
			expect(_.keys(monsters.byId).length).toBeGreaterThan(0);
			expect(_.isFunction(monsters.check)).toBe(true);
		});
	});

	describe('loading from the database', function() {
		it('should key byId on fid when no guid is present', function() {
			expect(monsters.byId['mm.goblin']).toBeDefined();
			expect(monsters.byId['mm.goblin'].name).toBe('Goblin');
		});

		it('should group byCr using the CR label', function() {
			expect(_.isArray(monsters.byCr['1/4'])).toBe(true);
			expect(monsters.byCr['1/4'][0].name).toBe('Goblin');
		});

		it('should sort all by name', function() {
			var names = monsters.all.map(function (m) { return m.name; });
			expect(names).toEqual(names.slice().sort());
		});

		it('should parse the delimited columns into the shape the app expects', function() {
			var goblin = monsters.byId['mm.goblin'];

			expect(goblin.cr.numeric).toBe(0.25);
			expect(goblin.cr.exp).toBe(50);
			expect(goblin.ac).toBe(15);
			expect(goblin.tags).toEqual(['Goblinoid']);
			expect(goblin.environments).toEqual(['cave', 'forest']);
			expect(goblin.sizeSort).toBe(2);
			expect(goblin.alignment.flags).toBeGreaterThan(0);
		});

		it('should split a multi-source string into sources with page numbers', function() {
			var sources = monsters.byId['mm.tarrasque'].sources;

			expect(sources.length).toBe(2);
			expect(sources[0]).toEqual({ name: 'Monster Manual', page: 286 });
			expect(sources[1]).toEqual({ name: 'Tome of Beasts', page: 12 });
		});

		it('should carry the boolean flags through as booleans', function() {
			// unique is stored as unique_npc in SQL (reserved word) and aliased back
			expect(monsters.byId['mm.tarrasque'].unique).toBe(true);
			expect(monsters.byId['mm.tarrasque'].legendary).toBe(true);
			expect(monsters.byId['mm.goblin'].unique).toBe(false);
			expect(monsters.byId['mm.goblin'].legendary).toBe(false);
		});

		it('should register sources with their default filter state', function() {
			expect(misc.sources).toContain('Monster Manual');
			expect(misc.sourceFilters['Monster Manual']).toBe(true);
			expect(misc.sourceFilters['Tome of Beasts']).toBe(false);
			expect(misc.shortNames['Monster Manual']).toBe('MM');
			expect(misc.sourcesByType['Official']).toContain('Monster Manual');
		});
	});
});
