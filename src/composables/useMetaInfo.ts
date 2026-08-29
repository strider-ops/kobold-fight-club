/**
 * MetaInfo service composable for Vue
 *
 * Provides reactive access to metadata like CR list, sizes, types, etc.
 * Migrated from window.metaInfoService bridge to direct TypeScript service import.
 */

import { computed, type ComputedRef } from 'vue';
import { metaInfo } from '@/services/metaInfo';

export interface UseMetaInfoReturn {
  alignments: ComputedRef<Record<string, any>>;
  crList: ComputedRef<any[]>;
  crInfo: ComputedRef<Record<string, any>>;
  environments: ComputedRef<any[]>;
  sizes: ComputedRef<any[]>;
  types: ComputedRef<any[]>;
  legendaryList: ComputedRef<any[]>;
  sortChoices: ComputedRef<any[]>;
}

export function useMetaInfo(): UseMetaInfoReturn {
  // Direct access to TypeScript metaInfo service
  const alignments = computed(() => metaInfo.alignments);

  const crList = computed(() => metaInfo.crList);

  const crInfo = computed(() => metaInfo.crInfo);

  const environments = computed(() => metaInfo.environments);

  const sizes = computed(() => metaInfo.sizes);

  const types = computed(() => metaInfo.types);

  const legendaryList = computed(() => metaInfo.legendaryList);

  const sortChoices = computed(() => metaInfo.sortChoices);

  return {
    alignments,
    crList,
    crInfo,
    environments,
    sizes,
    types,
    legendaryList,
    sortChoices,
  };
}
