import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ManagerRow from '../ManagerRow.vue';

const mockEncounterService = {
  reference: null,
  resetEncounter: vi.fn(),
  groups: {}
};

const mockMonstersService = {
  byId: {
    'goblin-1': { id: 'goblin-1', name: 'Goblin', cr: { exp: 50 } },
    'orc-1': { id: 'orc-1', name: 'Orc', cr: { exp: 100 } }
  },
  getMonsterById: function(id) {
    return this.byId[id] || null;
  }
};

const storedEncounter = {
  name: 'Test Encounter',
  type: 'encounter',
  groups: {
    'goblin-1': 2,
    'orc-1': 1
  }
};

beforeEach(() => {
  window.encounterService = mockEncounterService;
  window.monstersService = mockMonstersService;
  vi.clearAllMocks();
});

describe('ManagerRow.vue', () => {
  it('renders encounter name', () => {
    const wrapper = mount(ManagerRow, {
      props: {
        storedEncounter
      },
      global: {
        stubs: {
          'router-link': true
        }
      }
    });
    expect(wrapper.find('.encounter-manager-row--name').text()).toBe('Test Encounter');
  });

  it('displays correct exp calculation', () => {
    const wrapper = mount(ManagerRow, {
      props: {
        storedEncounter
      },
      global: {
        stubs: { 'router-link': true }
      }
    });
    const expText = wrapper.find('.encounter-manager-row--exp').text();
    // 2 goblins (50 exp each) + 1 orc (100 exp) = 200
    expect(expText).toContain('200');
  });

  it('shows "Choose" button when not active', () => {
    const wrapper = mount(ManagerRow, {
      props: {
        storedEncounter
      },
      global: {
        stubs: { 'router-link': true }
      }
    });
    expect(wrapper.find('.encounter-manager-row--load-button').exists()).toBe(true);
  });

  it('shows "Active" label when current reference', () => {
    window.encounterService.reference = storedEncounter;
    const wrapper = mount(ManagerRow, {
      props: {
        storedEncounter
      },
      global: {
        stubs: { 'router-link': true }
      }
    });
    expect(wrapper.find('.encounter-manager-row--active').exists()).toBe(true);
    expect(wrapper.find('.encounter-manager-row--load-button').exists()).toBe(false);
  });

  it('displays all monster groups', () => {
    const wrapper = mount(ManagerRow, {
      props: {
        storedEncounter
      },
      global: {
        stubs: { 'router-link': true }
      }
    });
    const monsters = wrapper.findAll('.encounter-manager-monster');
    expect(monsters.length).toBe(2);
    expect(monsters[0].text()).toContain('2x');
    expect(monsters[0].text()).toContain('Goblin');
    expect(monsters[1].text()).toContain('Orc');
  });

  it('emits remove event when remove button clicked', async () => {
    const wrapper = mount(ManagerRow, {
      props: {
        storedEncounter
      },
      global: {
        stubs: { 'router-link': true }
      }
    });
    const removeBtn = wrapper.find('.encounter-manager-row--remove-button');
    await removeBtn.trigger('click');
    expect(wrapper.emitted('remove')).toBeTruthy();
    expect(wrapper.emitted('remove')[0]).toEqual([storedEncounter]);
  });

  it('handles load button click', async () => {
    window.location.hash = '';
    const wrapper = mount(ManagerRow, {
      props: {
        storedEncounter
      },
      global: {
        stubs: { 'router-link': true }
      }
    });
    const loadBtn = wrapper.find('.encounter-manager-row--load-button');
    await loadBtn.trigger('click');
    expect(mockEncounterService.resetEncounter).toHaveBeenCalledWith(storedEncounter);
  });

  it('displays unknown for missing monsters', () => {
    const encounterWithMissing = {
      ...storedEncounter,
      groups: {
        'unknown-id': 1
      }
    };
    const wrapper = mount(ManagerRow, {
      props: {
        storedEncounter: encounterWithMissing
      },
      global: {
        stubs: { 'router-link': true }
      }
    });
    expect(wrapper.find('.encounter-manager-monster').text()).toContain('Unknown');
  });
});
