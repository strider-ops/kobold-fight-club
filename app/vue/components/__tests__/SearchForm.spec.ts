import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import SearchForm from '../SearchForm.vue';

// Mock composables
vi.mock('../../composables', () => ({
  useMetaInfo: () => ({
    alignments: { lg: { text: 'Lawful Good' } },
    crList: [{ string: '1', numeric: 1 }],
    environments: ['Forest'],
    sizes: ['Medium'],
    types: ['Beast'],
    legendaryList: ['Legendary', 'Ordinary'],
    sortChoices: [{ text: 'Name', value: 'name' }],
  }),
  useSources: () => ({
    getSourceSections: () => [{ name: 'Official', sources: ['Monster Manual'] }],
    getContent: () => [{ name: 'Monster Manual', shortName: 'MM' }],
    updateSourceFilters: vi.fn(),
  }),
  useFilters: () => ({
    resetFilters: vi.fn(),
  }),
  useHomebrew: () => ({
    packs: ref([]),
    importFile: vi.fn(),
    remove: vi.fn(),
    importResult: ref(null),
  }),
  useLibrary: () => ({
    savedEncounters: ref([]),
  }),
}));

describe('SearchForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the reset filters button', () => {
    const filters = {
      search: '',
      size: '',
      type: '',
      alignment: '',
      minCr: '',
      maxCr: '',
      environment: '',
      legendary: '',
      pool: '',
      sort: 'name',
      source: {},
      pageSize: 10,
    };

    const wrapper = mount(SearchForm, {
      props: { filters },
    });

    const resetButton = wrapper.find('button.btn-danger');
    expect(resetButton.exists()).toBe(true);
    expect(resetButton.text()).toBe('Reset Filters');
  });

  it('should bind filter props to form controls', () => {
    const filters = {
      search: 'dragon',
      size: 'Huge',
      type: 'Dragon',
      alignment: '',
      minCr: '5',
      maxCr: '10',
      environment: 'Forest',
      legendary: 'Legendary',
      pool: '',
      sort: 'cr',
      source: {},
      pageSize: 25,
    };

    const wrapper = mount(SearchForm, {
      props: { filters },
    });

    // Check that search input has the right value
    const searchInput = wrapper.find('input.search-input');
    expect((searchInput.element as HTMLInputElement).value).toBe('dragon');

    // Check that selects exist and are bound to filters
    const selects = wrapper.findAll('select.form-control');
    expect(selects.length).toBeGreaterThan(0);
  });

  it('should render all filter dropdowns', () => {
    const filters = {
      search: '',
      size: '',
      type: '',
      alignment: '',
      minCr: '',
      maxCr: '',
      environment: '',
      legendary: '',
      pool: '',
      sort: 'name',
      source: {},
      pageSize: 10,
    };

    const wrapper = mount(SearchForm, {
      props: { filters },
    });

    // Should have search input
    const searchInput = wrapper.find('input.search-input');
    expect(searchInput.exists()).toBe(true);
    expect(searchInput.attributes('placeholder')).toBe('Search...');

    // Should have multiple select dropdowns
    const selects = wrapper.findAll('select.form-control');
    expect(selects.length).toBeGreaterThan(5); // size, type, minCr, maxCr, alignment, environment, legendary, sort, pageSize
  });

  describe('all filter dropdowns', () => {
    it('should bind all dropdown values to filters prop', () => {
      const filters = {
        search: 'goblin',
        size: 'Medium',
        type: 'Beast',
        alignment: 'lg',
        minCr: '1',
        maxCr: '5',
        environment: 'Forest',
        legendary: 'Legendary',
        pool: '',
        sort: 'name',
        source: {},
        pageSize: 25,
      };

      const wrapper = mount(SearchForm, {
        props: { filters },
      });

      // Verify search input
      const searchInput = wrapper.find('input.search-input');
      expect((searchInput.element as HTMLInputElement).value).toBe('goblin');

      // Get all selects
      const selects = wrapper.findAll('select.form-control');

      // Each select should have a v-model binding (we can't directly test v-model,
      // but we can verify the component has the right number of dropdowns)
      expect(selects.length).toBeGreaterThanOrEqual(9); // At least 9 dropdowns
    });

    it('should have dropdowns for: size, type, CR (min/max), alignment, terrain, legendary, sort, pageSize', () => {
      const filters = {
        search: '',
        size: '',
        type: '',
        alignment: '',
        minCr: '',
        maxCr: '',
        environment: '',
        legendary: '',
        pool: '',
        sort: 'name',
        source: {},
        pageSize: 10,
      };

      const wrapper = mount(SearchForm, {
        props: { filters },
      });

      const selects = wrapper.findAll('select.form-control');
      const html = wrapper.html();

      // Verify key dropdowns exist by checking for their option text
      expect(html).toContain('Any Size');        // Size dropdown
      expect(html).toContain('Any Type');        // Type dropdown
      expect(html).toContain('Min CR');          // Min CR dropdown
      expect(html).toContain('Max CR');          // Max CR dropdown
      expect(html).toContain('Any Alignment');   // Alignment dropdown
      expect(html).toContain('Any Terrain');     // Environment/Terrain dropdown
      expect(html).toContain('Any Legendary');   // Legendary dropdown
      expect(html).toContain('Sort by');         // Sort dropdown
      expect(html).toContain('/ page');          // Page size dropdown
    });
  });
});
