/**
 * Filters composable for Vue
 *
 * Manages search and filter state, persists to localStorage.
 * Migrated from window.storeService bridge to direct TypeScript service import.
 *
 * Uses singleton pattern to ensure all components share the same filters object.
 */

import { reactive, watch, type UnwrapNestedRefs } from 'vue';
import { store } from '@/services/store';
import { useSources } from './useSources';

export interface SearchFilters {
  search: string;
  size: string;
  type: string;
  alignment: string;
  minCr: string;
  maxCr: string;
  environment: string;
  legendary: string;
  pool: string;
  sort: string;
  source: Record<string, boolean>;
  pageSize: number;
}

export interface UseFiltersReturn {
  filters: UnwrapNestedRefs<SearchFilters>;
  resetFilters: () => void;
  loadFilters: () => Promise<void>;
}

// Singleton: shared filters object across all components
let sharedFilters: UnwrapNestedRefs<SearchFilters> | null = null;
let watchInitialized = false;

export function useFilters(): UseFiltersReturn {
  const { filters: sourceFilters } = useSources();

  // Return existing filters if already created (singleton pattern)
  if (sharedFilters) {
    return {
      filters: sharedFilters,
      resetFilters,
      loadFilters,
    };
  }

  // Create filters only once
  const filters = reactive<SearchFilters>({
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
  });

  sharedFilters = filters;

  /**
   * Reset all filters to default values
   */
  function resetFilters(): void {
    if (!sharedFilters) return;

    console.log('🔄 Resetting filters...');
    sharedFilters.search = '';
    sharedFilters.size = '';
    sharedFilters.type = '';
    sharedFilters.alignment = '';
    sharedFilters.minCr = '';
    sharedFilters.maxCr = '';
    sharedFilters.environment = '';  // Terrain dropdown
    sharedFilters.legendary = '';
    sharedFilters.pool = '';
    sharedFilters.pageSize = 10;  // Reset to default (10 items per page)
    console.log('✅ Filters reset:', { ...sharedFilters });
    // Don't reset sort or source filters
  }

  /**
   * Load filters from localStorage
   */
  async function loadFilters(): Promise<void> {
    if (!sharedFilters) return;

    try {
      const frozen = await store.get<SearchFilters>('5em-filters');
      if (frozen) {
        Object.assign(sharedFilters, frozen);
      } else {
        // Initialize source filters from sources service
        sharedFilters.source = { ...sourceFilters.value };
      }
    } catch (error) {
      console.error('Failed to load filters from localStorage', error);
      // Initialize source filters from sources service as fallback
      sharedFilters.source = { ...sourceFilters.value };
    }
  }

  /**
   * Save filters to localStorage whenever they change
   */
  function saveFilters(): void {
    if (sharedFilters) {
      store.set('5em-filters', sharedFilters);
    }
  }

  // Watch for filter changes and save to localStorage (only set up once)
  if (!watchInitialized) {
    watch(filters, saveFilters, { deep: true });
    watchInitialized = true;
  }

  return {
    filters,
    resetFilters,
    loadFilters,
  };
}
