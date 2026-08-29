import { describe, it, expect, beforeEach, vi } from 'vitest';
import { store } from '@/services/store';

// Mock the store service
vi.mock('@/services/store', () => ({
  store: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

// Mock useSources
vi.mock('../useSources', () => ({
  useSources: () => ({
    filters: { value: { 'Monster Manual': true } },
  }),
}));

describe('useFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the module to clear singleton
    vi.resetModules();
  });

  describe('resetFilters', () => {
    it('should reset ALL filter dropdowns to default values', async () => {
      const { useFilters } = await import('../useFilters');
      const { filters, resetFilters, loadFilters } = useFilters();

      // Load filters first
      vi.mocked(store.get).mockResolvedValue(null);
      await loadFilters();

      // Set ALL filter values to non-default values
      filters.search = 'dragon';
      filters.size = 'Large';
      filters.type = 'Beast';
      filters.alignment = 'Chaotic Evil';
      filters.minCr = '5';
      filters.maxCr = '10';
      filters.environment = 'Forest';  // Terrain dropdown
      filters.legendary = 'Legendary';
      filters.pool = 'test-pool';
      filters.pageSize = 100;  // Manage Content dropdown
      filters.sort = 'cr';

      // Reset filters
      resetFilters();

      // Verify ALL filter dropdowns are reset to defaults
      expect(filters.search).toBe('');
      expect(filters.size).toBe('');
      expect(filters.type).toBe('');
      expect(filters.alignment).toBe('');
      expect(filters.minCr).toBe('');
      expect(filters.maxCr).toBe('');
      expect(filters.environment).toBe('');  // Terrain should be reset
      expect(filters.legendary).toBe('');
      expect(filters.pool).toBe('');
      expect(filters.pageSize).toBe(10);  // pageSize should reset to 10
    });

    it('should NOT reset sort or source filters', async () => {
      const { useFilters } = await import('../useFilters');
      const { filters, resetFilters, loadFilters } = useFilters();

      // Load filters first
      vi.mocked(store.get).mockResolvedValue(null);
      await loadFilters();

      // Set sort and source
      filters.sort = 'cr';
      filters.source = { 'Monster Manual': true, 'Volo': false };

      const originalSort = filters.sort;
      const originalSource = { ...filters.source };

      // Reset filters
      resetFilters();

      // Sort and source should remain unchanged
      expect(filters.sort).toBe(originalSort);
      expect(filters.source).toEqual(originalSource);
    });

    it('should persist reset to localStorage', async () => {
      const { useFilters } = await import('../useFilters');
      const { filters, resetFilters, loadFilters } = useFilters();

      vi.mocked(store.get).mockResolvedValue(null);
      await loadFilters();

      filters.search = 'goblin';
      filters.type = 'Humanoid';

      // Give watch time to execute
      await new Promise(resolve => setTimeout(resolve, 10));
      vi.clearAllMocks();

      // Reset filters
      resetFilters();

      // Give watch time to execute
      await new Promise(resolve => setTimeout(resolve, 10));

      // Verify store.set was called after reset
      expect(store.set).toHaveBeenCalled();
      const savedFilters = vi.mocked(store.set).mock.calls[0][1] as any;
      expect(savedFilters.search).toBe('');
      expect(savedFilters.type).toBe('');
    });
  });

  describe('loadFilters', () => {
    it('should load filters from localStorage', async () => {
      const savedFilters = {
        search: 'dragon',
        size: 'Huge',
        type: 'Dragon',
        alignment: '',
        minCr: '10',
        maxCr: '20',
        environment: 'Mountain',
        legendary: 'Legendary',
        pool: '',
        sort: 'cr',
        source: { 'Monster Manual': true },
        pageSize: 25,
      };

      vi.mocked(store.get).mockResolvedValue(savedFilters);

      const { useFilters } = await import('../useFilters');
      const { filters, loadFilters } = useFilters();
      await loadFilters();

      expect(filters.search).toBe('dragon');
      expect(filters.size).toBe('Huge');
      expect(filters.type).toBe('Dragon');
      expect(filters.minCr).toBe('10');
      expect(filters.maxCr).toBe('20');
      expect(filters.pageSize).toBe(25);
    });

    it('should initialize with default source filters if no saved filters', async () => {
      vi.mocked(store.get).mockResolvedValue(null);

      const { useFilters } = await import('../useFilters');
      const { filters, loadFilters } = useFilters();
      await loadFilters();

      expect(filters.source).toEqual({ 'Monster Manual': true });
    });
  });

  describe('singleton behavior', () => {
    it('should return the same filters object across multiple calls', async () => {
      vi.mocked(store.get).mockResolvedValue(null);

      const { useFilters } = await import('../useFilters');
      const instance1 = useFilters();
      const instance2 = useFilters();

      // Should be the exact same object
      expect(instance1.filters).toBe(instance2.filters);

      // Modifying one should affect the other
      instance1.filters.search = 'dragon';
      expect(instance2.filters.search).toBe('dragon');
    });

    it('should share resetFilters function across instances', async () => {
      vi.mocked(store.get).mockResolvedValue(null);

      const { useFilters } = await import('../useFilters');
      const instance1 = useFilters();
      const instance2 = useFilters();

      await instance1.loadFilters();

      instance1.filters.search = 'goblin';
      instance1.filters.type = 'Humanoid';

      // Reset from instance2 should affect instance1's filters
      instance2.resetFilters();

      expect(instance1.filters.search).toBe('');
      expect(instance1.filters.type).toBe('');
    });
  });
});
