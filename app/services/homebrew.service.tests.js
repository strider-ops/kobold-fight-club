'use strict';

describe('homebrew tests', function() {
	var homebrew, monsters, misc, store, $rootScope;
	var saved;

	var VALID_CSV = [
		'name,cr,size,type,tags,alignment,environment,ac,hp,sources',
		'Clockwork Hound,2,Medium,Construct,Clockwork,unaligned,urban,14,26,"My Brews: 7"',
		'"Grubb, the Unclean",1/2,Small,Humanoid,Goblinoid,chaotic evil,"cave, ruins",13,11,My Brews',
	].join('\n');

	beforeEach(module('app'));

	// Same db stand-in as monsters.service.tests: no HTTP, no WASM, no monsters.db.
	beforeEach(module(function ($provide) {
		$provide.factory('db', function ($q) {
			return {
				ready: function () { return $q.when(null); },
				query: function (sql) {
					if ( /FROM source/.test(sql) ) {
						return $q.when([{
							name: 'Monster Manual', shortname: 'MM',
							type: 'Official', default_selected: 1,
						}]);
					}
					return $q.when([{
						fid: 'mm.goblin', guid: '', name: 'Goblin', section: '',
						ac: 15, hp: 7, init: 2, cr: '1/4', type: 'Humanoid', size: 'Small',
						alignment: 'neutral evil', legendary: 0, lair: 0, unique: 0,
						special: 0, tags: 'Goblinoid', environment: 'cave',
						sources: 'Monster Manual: 166',
					}]);
				},
			};
		});
	}));

	beforeEach(inject(function (_homebrew_, _monsters_, _misc_, _store_, _$rootScope_, $httpBackend) {
		$httpBackend.whenGET(/\.html$/).respond(200, '');

		homebrew = _homebrew_;
		monsters = _monsters_;
		misc = _misc_;
		store = _store_;
		$rootScope = _$rootScope_;

		saved = null;
		spyOn(store, 'set').and.callFake(function (key, value) { saved = value; });

		monsters.load();
		$rootScope.$apply();
	}));

	describe('importing a CSV', function() {
		var result;

		beforeEach(function() {
			result = homebrew.importText('My Brews.csv', VALID_CSV);
		});

		it('should import every valid row', function() {
			expect(result.added).toBe(2);
			expect(result.skipped).toBe(0);
			expect(result.errors).toEqual([]);
		});

		it('should name the pack after the file', function() {
			expect(result.sourceName).toBe('My Brews');
		});

		it('should namespace fids so they cannot collide with built-ins', function() {
			expect(monsters.byId['homebrew.my-brews.clockwork-hound']).toBeDefined();
			expect(monsters.byId['homebrew.my-brews.grubb-the-unclean']).toBeDefined();
		});

		it('should build monsters through the normal factory path', function() {
			var hound = monsters.byId['homebrew.my-brews.clockwork-hound'];

			expect(hound.cr.numeric).toBe(2);
			expect(hound.cr.exp).toBe(450);
			expect(hound.ac).toBe(14);
			expect(hound.hp).toBe(26);
			expect(hound.tags).toEqual(['Clockwork']);
			expect(hound.environments).toEqual(['urban']);
			expect(hound.sizeSort).toBe(3);
		});

		it('should handle quoted fields containing commas', function() {
			var grubb = monsters.byId['homebrew.my-brews.grubb-the-unclean'];

			expect(grubb.name).toBe('Grubb, the Unclean');
			expect(grubb.environments).toEqual(['cave', 'ruins']);
		});

		it('should attribute monsters to the pack, keeping any page number', function() {
			expect(monsters.byId['homebrew.my-brews.clockwork-hound'].sources)
				.toEqual([{ name: 'My Brews', page: 7 }]);
			// No page in the file, so monsterfactory yields just the name
			expect(monsters.byId['homebrew.my-brews.grubb-the-unclean'].sources)
				.toEqual([{ name: 'My Brews' }]);
		});

		it('should register the pack as an enabled Homebrew source', function() {
			expect(misc.sources).toContain('My Brews');
			expect(misc.sourceFilters['My Brews']).toBe(true);
			expect(misc.sourcesByType['Homebrew']).toEqual(['My Brews']);
		});

		it('should add to byCr alongside built-in monsters', function() {
			expect(monsters.byCr['2'].length).toBe(1);
			expect(monsters.byCr['1/2'].length).toBe(1);
		});

		it('should persist the pack for the next visit', function() {
			expect(saved.length).toBe(1);
			expect(saved[0].name).toBe('My Brews');
			expect(saved[0].rows.length).toBe(2);
		});

		it('should refuse to import the same pack twice', function() {
			var again = homebrew.importText('My Brews.csv', VALID_CSV);

			expect(again.added).toBe(0);
			expect(again.errors[0]).toMatch(/already imported/);
		});

		it('should remove a pack and its monsters', function() {
			expect(homebrew.remove('My Brews')).toBe(true);

			expect(monsters.byId['homebrew.my-brews.clockwork-hound']).toBeUndefined();
			expect(monsters.all.length).toBe(1);
			expect(misc.sources).not.toContain('My Brews');
			expect(misc.sourceFilters['My Brews']).toBeUndefined();
			expect(misc.sourcesByType['Homebrew']).toBeUndefined();
			expect(monsters.byCr['2'].length).toBe(0);
		});
	});

	describe('validation', function() {
		it('should skip rows with an unknown CR and say which row', function() {
			var result = homebrew.importText('Bad.csv',
				'name,cr,type\nFine Thing,3,Beast\nBroken Thing,99,Beast');

			expect(result.added).toBe(1);
			expect(result.skipped).toBe(1);
			expect(result.errors[0]).toMatch(/Row 3.*unknown cr "99"/);
		});

		it('should skip rows missing a name or type', function() {
			var result = homebrew.importText('Bad.csv', 'name,cr,type\n,3,Beast\nNameless,3,');

			expect(result.added).toBe(0);
			expect(result.skipped).toBe(2);
			expect(result.errors[0]).toMatch(/missing name/);
			expect(result.errors[1]).toMatch(/missing type/);
		});

		it('should reject an unknown size', function() {
			var result = homebrew.importText('Bad.csv',
				'name,cr,size,type\nOdd One,3,Enormous,Beast');

			expect(result.errors[0]).toMatch(/unknown size "Enormous"/);
		});

		it('should report an empty file rather than importing nothing silently', function() {
			var result = homebrew.importText('Empty.csv', 'name,cr,type\n');

			expect(result.added).toBe(0);
			expect(result.errors[0]).toMatch(/No rows found/);
		});

		it('should report unreadable JSON', function() {
			var result = homebrew.importText('Broken.json', '[{"name": ');

			expect(result.added).toBe(0);
			expect(result.errors[0]).toMatch(/Could not read the file/);
		});

		it('should skip a monster whose fid already exists', function() {
			var csv = 'name,cr,type\nDouble Trouble,3,Beast\nDouble Trouble,4,Beast';
			var result = homebrew.importText('Dupes.csv', csv);

			expect(result.added).toBe(1);
			expect(result.errors[0]).toMatch(/Duplicate monster/);
		});
	});

	describe('importing JSON', function() {
		it('should accept a JSON array of the same fields', function() {
			var json = JSON.stringify([
				{ name: 'Paper Golem', cr: '5', size: 'Large', type: 'Construct' },
			]);
			var result = homebrew.importText('Folded.json', json);

			expect(result.added).toBe(1);
			expect(monsters.byId['homebrew.folded.paper-golem'].cr.exp).toBe(1800);
		});
	});

	describe('restoring on a later visit', function() {
		var PACK = {
			name: 'Saved Brews',
			shortName: 'SB',
			rows: [{
				fid: 'homebrew.saved-brews.tin-soldier', guid: '', name: 'Tin Soldier',
				section: '', ac: '12', hp: '9', init: '', cr: '1', type: 'Construct',
				size: 'Small', alignment: 'unaligned', legendary: 0, lair: 0,
				unique: 0, special: 0, tags: '', environment: '',
				sources: 'Saved Brews',
			}],
		};

		it('should re-add packs saved previously', inject(function ($q) {
			spyOn(store, 'get').and.returnValue($q.when([PACK]));

			homebrew.restore();
			$rootScope.$apply();

			expect(monsters.byId['homebrew.saved-brews.tin-soldier']).toBeDefined();
			expect(misc.sources).toContain('Saved Brews');
			expect(misc.sourceFilters['Saved Brews']).toBe(true);
		}));

		it('should survive a corrupt stored value', inject(function ($q) {
			spyOn(store, 'get').and.returnValue($q.reject('unparseable'));

			var count = null;
			homebrew.restore().then(function (n) { count = n; });
			$rootScope.$apply();

			expect(count).toBe(0);
		}));
	});
});
