/**
 * Filters composable for Vue
 *
 * Manages search and filter state, persists to localStorage.
 * Migrated from window.storeService bridge to direct TypeScript service import.
 */

import { reactive, watch, type UnwrapNestedRefs } from 'vue';
import { store } from '@/services/store';
import { useSources } from './useSources';

export interface SearchFilters {
  search: string;
  size: string | null;
  type: string | null;
  alignment: string | null;
  minCr: string | null;
  maxCr: string | null;
  environment: string | null;
  legendary: string | null;
  pool: string | null;
  sort: string;
  source: Record<string, boolean>;
  pageSize: number;
}

export interface UseFiltersReturn {
  filters: UnwrapNestedRefs<SearchFilters>;
  resetFilters: () => void;
  loadFilters: () => Promise<void>;
}

export function useFilters(): UseFiltersReturn {
  const { filters: sourceFilters } = useSources();

  const filters = reactive<SearchFilters>({
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
  function resetFilters(): void {
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
  }

  /**
   * Load filters from localStorage
   */
  async function loadFilters(): Promise<void> {
    try {
      const frozen = await store.get<SearchFilters>('5em-filters');
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
  }

  /**
   * Save filters to localStorage whenever they change
   */
  function saveFilters(): void {
    store.set('5em-filters', filters);
  }

  // Watch for filter changes and save to localStorage
  watch(filters, saveFilters, { deep: true });

  return {
    filters,
    resetFilters,
    loadFilters,
  };
}
