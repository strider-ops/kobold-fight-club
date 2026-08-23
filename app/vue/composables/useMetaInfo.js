import { computed } from 'vue';

/**
 * Composable for accessing metadata like CR list, sizes, types, etc.
 * Wraps the AngularJS metaInfo service
 */
export function useMetaInfo() {
  const metaInfo = computed(() => window.metaInfoService || {});

  const alignments = computed(() => metaInfo.value.alignments || {});
  const crList = computed(() => metaInfo.value.crList || []);
  const crInfo = computed(() => metaInfo.value.crInfo || {});
  const environments = computed(() => metaInfo.value.environments || []);
  const sizes = computed(() => metaInfo.value.sizes || []);
  const types = computed(() => metaInfo.value.types || []);
  const legendaryList = computed(() => metaInfo.value.legendaryList || []);
  const sortChoices = computed(() => metaInfo.value.sortChoices || []);

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
