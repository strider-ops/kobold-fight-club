'use strict';

describe('combat tests', function() {
	beforeEach(module('app'));

	var combat;

	beforeEach(inject(function(_combat_) {
		combat = _combat_;
	}));

	describe('api', function() {
		it('should have correct methods', function() {
			expect(combat.rollInitiative).toBeDefined();
		});
	});

	
	describe('roll initiative', function() {
		
		it('should set values on the combatant', function() {
			// rollInitiative uses _.random(1, 20) — a d20, so the stub stands in for
			// the roll itself. This expectation previously assumed an older
			// _.random(0, 19) + 1 form and expected 12.
			spyOn(_, 'random').and.returnValue(9);

			var combatant = {
				initiative: 0,
				initiativeMod: 2
			};

			combat.rollInitiative(combatant);
			expect(combatant.initiative).toEqual(11);
			expect(combatant.initiativeRolled).toBeTruthy();
		});

		afterEach(function () {
			_.random.and.callThrough();
		});
	});
});