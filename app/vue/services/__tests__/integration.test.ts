import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { integration } from '../integration';
import type { EncounterGroups } from '@/types';

describe('IntegrationService', () => {
  let mockForm: HTMLFormElement;
  let submittedForms: HTMLFormElement[];

  beforeEach(() => {
    submittedForms = [];

    // Mock form.submit() to capture submissions instead of actually navigating
    vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(function (this: HTMLFormElement) {
      submittedForms.push(this);
    });

    // Mock console.log to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();

    // Clean up any forms left in the DOM
    document.querySelectorAll('form').forEach((form) => form.remove());
  });

  describe('launchImpInit', () => {
    it('should create and submit form to Improved Initiative', () => {
      const encounterGroups: EncounterGroups = {
        'test.goblin': {
          monster: {
            id: 'test.goblin',
            fid: 'test.goblin',
            name: 'Goblin',
            hp: 7,
            init: 2,
            ac: 15,
            cr: { text: '1/4', string: '1/4', value: 0.25, exp: 50 },
            type: 'Humanoid',
            size: 'Small',
            alignment: { text: 'Neutral Evil', tags: ['neutral', 'evil'] },
            legendary: false,
            lair: false,
            unique: false,
            special: false,
            sources: [],
          },
          qty: 2,
        },
      };

      const selectedParty = [
        {
          name: 'Aragorn',
          hp: 45,
          initiativeMod: 3,
        },
      ];

      integration.launchImpInit(encounterGroups, selectedParty);

      expect(submittedForms).toHaveLength(1);
      expect(submittedForms[0].method).toBe('post');
      expect(submittedForms[0].action).toBe('https://www.improved-initiative.com/launchencounter/');
    });

    it('should include all monsters in payload', () => {
      const encounterGroups: EncounterGroups = {
        'test.goblin': {
          monster: {
            id: 'test.goblin',
            fid: 'test.goblin',
            name: 'Goblin',
            hp: 7,
            init: 2,
            ac: 15,
            cr: { text: '1/4', string: '1/4', value: 0.25, exp: 50 },
            type: 'Humanoid',
            size: 'Small',
            alignment: { text: 'Neutral Evil', tags: ['neutral', 'evil'] },
            legendary: false,
            lair: false,
            unique: false,
            special: false,
            sources: [],
          },
          qty: 3, // 3 goblins
        },
      };

      const selectedParty: any[] = [];

      integration.launchImpInit(encounterGroups, selectedParty);

      const form = submittedForms[0];
      const input = form.querySelector('input[name="Combatants"]') as HTMLInputElement;
      const combatants = JSON.parse(input.value);

      expect(combatants).toHaveLength(3);
      expect(combatants[0]).toMatchObject({
        Name: 'Goblin',
        HP: { Value: 7 },
        TotalInitiativeModifier: 2,
        AC: { Value: 15 },
        Player: 'npc',
        Id: 'test.goblin',
      });
    });

    it('should include all players in payload', () => {
      const encounterGroups: EncounterGroups = {};

      const selectedParty = [
        { name: 'Aragorn', hp: 45, initiativeMod: 3 },
        { name: 'Legolas', hp: 40, initiativeMod: 4 },
        { name: 'Gimli', hp: 50, initiativeMod: 1 },
      ];

      integration.launchImpInit(encounterGroups, selectedParty);

      const form = submittedForms[0];
      const input = form.querySelector('input[name="Combatants"]') as HTMLInputElement;
      const combatants = JSON.parse(input.value);

      expect(combatants).toHaveLength(3);
      expect(combatants[0]).toMatchObject({
        Name: 'Aragorn',
        HP: { Value: 45 },
        TotalInitiativeModifier: 3,
        Player: 'player',
      });
      expect(combatants[1]).toMatchObject({
        Name: 'Legolas',
        HP: { Value: 40 },
        TotalInitiativeModifier: 4,
        Player: 'player',
      });
      expect(combatants[2]).toMatchObject({
        Name: 'Gimli',
        HP: { Value: 50 },
        TotalInitiativeModifier: 1,
        Player: 'player',
      });
    });

    it('should handle mixed monsters and players', () => {
      const encounterGroups: EncounterGroups = {
        'test.orc': {
          monster: {
            id: 'test.orc',
            fid: 'test.orc',
            name: 'Orc',
            hp: 15,
            init: 1,
            ac: 13,
            cr: { text: '1/2', string: '1/2', value: 0.5, exp: 100 },
            type: 'Humanoid',
            size: 'Medium',
            alignment: { text: 'Chaotic Evil', tags: ['chaotic', 'evil'] },
            legendary: false,
            lair: false,
            unique: false,
            special: false,
            sources: [],
          },
          qty: 2,
        },
      };

      const selectedParty = [{ name: 'Wizard', hp: 30, initiativeMod: 2 }];

      integration.launchImpInit(encounterGroups, selectedParty);

      const form = submittedForms[0];
      const input = form.querySelector('input[name="Combatants"]') as HTMLInputElement;
      const combatants = JSON.parse(input.value);

      expect(combatants).toHaveLength(3);

      // First 2 should be orcs
      expect(combatants[0].Player).toBe('npc');
      expect(combatants[1].Player).toBe('npc');

      // Last should be player
      expect(combatants[2].Player).toBe('player');
      expect(combatants[2].Name).toBe('Wizard');
    });

    it('should use guid if fid is not present', () => {
      const encounterGroups: EncounterGroups = {
        'homebrew-123': {
          monster: {
            id: 'homebrew-123',
            guid: 'homebrew-123',
            name: 'Custom Monster',
            hp: 25,
            init: 3,
            ac: 14,
            cr: { text: '1', string: '1', value: 1, exp: 200 },
            type: 'Beast',
            size: 'Large',
            alignment: { text: 'Unaligned', tags: [] },
            legendary: false,
            lair: false,
            unique: false,
            special: false,
            sources: [],
          },
          qty: 1,
        },
      };

      const selectedParty: any[] = [];

      integration.launchImpInit(encounterGroups, selectedParty);

      const form = submittedForms[0];
      const input = form.querySelector('input[name="Combatants"]') as HTMLInputElement;
      const combatants = JSON.parse(input.value);

      expect(combatants[0].Id).toBe('homebrew-123');
    });

    it('should handle empty encounter and party', () => {
      const encounterGroups: EncounterGroups = {};
      const selectedParty: any[] = [];

      integration.launchImpInit(encounterGroups, selectedParty);

      const form = submittedForms[0];
      const input = form.querySelector('input[name="Combatants"]') as HTMLInputElement;
      const combatants = JSON.parse(input.value);

      expect(combatants).toEqual([]);
    });

    it('should remove form from DOM after submission', () => {
      const encounterGroups: EncounterGroups = {};
      const selectedParty: any[] = [];

      const initialFormCount = document.querySelectorAll('form').length;

      integration.launchImpInit(encounterGroups, selectedParty);

      const finalFormCount = document.querySelectorAll('form').length;

      expect(finalFormCount).toBe(initialFormCount);
    });

    it('should create hidden form', () => {
      const encounterGroups: EncounterGroups = {};
      const selectedParty: any[] = [];

      let capturedForm: HTMLFormElement | null = null;

      // Capture form before it gets removed
      vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(function (this: HTMLFormElement) {
        capturedForm = this;
        // Prevent actual submission
      });

      integration.launchImpInit(encounterGroups, selectedParty);

      expect(capturedForm).toBeTruthy();
      expect(capturedForm!.style.display).toBe('none');
    });

    it('should log payload to console', () => {
      const encounterGroups: EncounterGroups = {};
      const selectedParty: any[] = [];

      integration.launchImpInit(encounterGroups, selectedParty);

      expect(console.log).toHaveBeenCalledWith(
        'Launching Improved Initiative with payload:',
        expect.any(Array)
      );
    });
  });

  describe('payload structure', () => {
    it('should include all required NPC fields', () => {
      const encounterGroups: EncounterGroups = {
        'test.dragon': {
          monster: {
            id: 'test.dragon',
            fid: 'test.dragon',
            name: 'Red Dragon',
            hp: 256,
            init: 0,
            ac: 19,
            cr: { text: '17', string: '17', value: 17, exp: 18000 },
            type: 'Dragon',
            size: 'Huge',
            alignment: { text: 'Chaotic Evil', tags: ['chaotic', 'evil'] },
            legendary: true,
            lair: false,
            unique: false,
            special: false,
            sources: [],
          },
          qty: 1,
        },
      };

      const selectedParty: any[] = [];

      integration.launchImpInit(encounterGroups, selectedParty);

      const form = submittedForms[0];
      const input = form.querySelector('input[name="Combatants"]') as HTMLInputElement;
      const combatants = JSON.parse(input.value);

      expect(combatants[0]).toHaveProperty('Name');
      expect(combatants[0]).toHaveProperty('HP');
      expect(combatants[0]).toHaveProperty('TotalInitiativeModifier');
      expect(combatants[0]).toHaveProperty('AC');
      expect(combatants[0]).toHaveProperty('Player');
      expect(combatants[0]).toHaveProperty('Id');
    });

    it('should include all required player fields', () => {
      const encounterGroups: EncounterGroups = {};
      const selectedParty = [{ name: 'Test', hp: 20, initiativeMod: 2 }];

      integration.launchImpInit(encounterGroups, selectedParty);

      const form = submittedForms[0];
      const input = form.querySelector('input[name="Combatants"]') as HTMLInputElement;
      const combatants = JSON.parse(input.value);

      expect(combatants[0]).toHaveProperty('Name');
      expect(combatants[0]).toHaveProperty('HP');
      expect(combatants[0]).toHaveProperty('TotalInitiativeModifier');
      expect(combatants[0]).toHaveProperty('Player');
      expect(combatants[0].Player).toBe('player');
    });
  });
});
