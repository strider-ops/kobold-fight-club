import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import EncounterManager from '../EncounterManager.vue';

// Mock the AngularJS services
const mockEncounterService = {
  groups: {
    'monster-1': { qty: 2, monster: { name: 'Goblin', cr: { exp: 50 } } },
    'monster-2': { qty: 1, monster: { name: 'Orc', cr: { exp: 100 } } }
  },
  reference: null,
  reset: vi.fn()
};

const mockMonstersService = {
  byId: {
    'monster-1': { id: 'monster-1', name: 'Goblin', cr: { exp: 50 } },
    'monster-2': { id: 'monster-2', name: 'Orc', cr: { exp: 100 } }
  }
};

const mockStore = {
  get: vi.fn(() => Promise.resolve(null)),
  set: vi.fn(() => Promise.resolve()),
  hasKey: vi.fn(() => Promise.resolve(false)),
  remove: vi.fn(() => Promise.resolve())
};

beforeEach(() => {
  window.encounterService = mockEncounterService;
  window.monstersService = mockMonstersService;

  // Mock the store module
  vi.doMock('@/lib/store', () => ({
    store: mockStore
  }));

  vi.clearAllMocks();
});

describe('EncounterManager.vue', () => {
  it('renders the encounter manager', () => {
    const wrapper = mount(EncounterManager, {
      global: {
        stubs: {
          ManagerRow: { template: '<div class="manager-row-stub">{{ storedEncounter.name }}</div>' }
        }
      }
    });
    expect(wrapper.find('.encounter-manager').exists()).toBe(true);
  });

  it('shows "no encounters" message when empty', () => {
    mockEncounterService.groups = {};
    const wrapper = mount(EncounterManager, {
      global: {
        stubs: { ManagerRow: true }
      }
    });
    expect(wrapper.find('.encounter-manager--no-encounters').exists()).toBe(true);
  });

  it('shows unsaved encounter when builder has groups', () => {
    const wrapper = mount(EncounterManager, {
      global: {
        stubs: { ManagerRow: true }
      }
    });
    expect(wrapper.find('.encounter-manager-encounter__unsaved').exists()).toBe(true);
  });

  it('displays monster groups in unsaved encounter', () => {
    const wrapper = mount(EncounterManager, {
      global: {
        stubs: { ManagerRow: true }
      }
    });
    const monsters = wrapper.findAll('.encounter-manager-monster');
    expect(monsters.length).toBe(2);
    expect(monsters[0].text()).toContain('2x');
    expect(monsters[0].text()).toContain('Goblin');
  });

  it('can save encounter', async () => {
    const wrapper = mount(EncounterManager, {
      global: {
        stubs: { ManagerRow: true }
      }
    });

    const input = wrapper.find('.encounter-manager-encounter--name-input');
    await input.setValue('My Encounter');

    const saveBtn = wrapper.find('.encounter-manager-encounter--save-button');
    await saveBtn.trigger('click');

    await flushPromises();

    expect(mockStore.set).toHaveBeenCalled();
  });

  it('navigates to builder on "Return" button', async () => {
    mockEncounterService.groups = {};
    const wrapper = mount(EncounterManager, {
      global: {
        stubs: { ManagerRow: true }
      }
    });

    window.location.hash = '';
    const btn = wrapper.find('button');
    await btn.trigger('click');

    expect(window.location.hash).toBe('#/encounter-builder');
  });
});
