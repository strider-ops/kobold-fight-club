import { ref, reactive, watch, onMounted } from 'vue';
import { useSources } from './useSources';

/**
 * Composable for managing search and filter state
 * Persists to localStorage using the store service
 */
export function useFilters() {
  const { filters: sourceFilters } = useSources();

  const filters = reactive({
    search: '',
    size: null,
    type: null,
    alignment: null,
    minCr: null,
    maxCr: null,
    environment: null,
    legendary: null,
    pool: null,
    sort: 'name',
    source: {},
    pageSize: 10,
  });

  /**
   * Reset all filters to default values
   */
  const resetFilters = () => {
    filters.search = '';
    filters.size = null;
    filters.type = null;
    filters.alignment = null;
    filters.minCr = null;
    filters.maxCr = null;
    filters.environment = null;
    filters.legendary = null;
    filters.pool = null;
    // Don't reset sort or source filters
  };

  /**
   * Load filters from localStorage on mount
   */
  const loadFilters = async () => {
    const storeService = window.storeService;
    if (!storeService) {
      console.warn('Store service not available');
      return;
    }

    try {
      const frozen = await storeService.get('5em-filters');
      if (frozen) {
        Object.assign(filters, frozen);
      } else {
        // Initialize source filters from sources service
        filters.source = { ...sourceFilters.value };
      }
    } catch (error) {
      console.error('Failed to load filters from localStorage', error);
      // Initialize source filters from sources service as fallback
      filters.source = { ...sourceFilters.value };
    }
  };

  /**
   * Save filters to localStorage whenever they change
   */
  const saveFilters = () => {
    const storeService = window.storeService;
    if (!storeService) {
      return;
    }

    storeService.set('5em-filters', filters);
  };

  // Watch for filter changes and save to localStorage
  watch(filters, saveFilters, { deep: true });

  return {
    filters,
    resetFilters,
    loadFilters,
  };
}
