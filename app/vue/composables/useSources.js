import { computed } from 'vue';

/**
 * Composable for accessing source material (books, supplements, etc.)
 * Wraps the AngularJS sources service
 */
export function useSources() {
  const sources = computed(() => window.sourcesService || {});

  const all = computed(() => sources.value.all || []);
  const shortNames = computed(() => sources.value.shortNames || {});
  const sourcesByType = computed(() => sources.value.sourcesByType || {});
  const filters = computed(() => sources.value.filters || {});

  /**
   * Get source sections grouped by type (Official, Third-Party, etc.)
   * Sorted with Official sections first
   */
  const getSourceSections = () => {
    const sections = Object.keys(sourcesByType.value).map(sourceType => ({
      name: sourceType,
      sources: [...sourcesByType.value[sourceType]].sort(),
    }));

    sections.sort((a, b) => {
      const aIsOfficial = a.name.match(/Official/);
      const bIsOfficial = b.name.match(/Official/);

      if (aIsOfficial && !bIsOfficial) {
        return -1;
      } else if (!aIsOfficial && bIsOfficial) {
        return 1;
      } else {
        return a.name > b.name ? 1 : -1;
      }
    });

    return sections;
  };

  /**
   * Get content packs (excludes homebrew which is shown separately)
   */
  const getContent = () => {
    const homebrewNames = sourcesByType.value["Homebrew"] || [];

    return all.value
      .filter(name => !homebrewNames.includes(name))
      .map(name => ({
        name,
        shortName: shortNames.value[name],
      }));
  };

  /**
   * Update all sources of a given type (enable/disable)
   */
  const updateSourceFilters = ({ type, enabled }, filterSource) => {
    const typeSources = sourcesByType.value[type] || [];
    typeSources.forEach(name => {
      filterSource[name] = enabled;
    });
  };

  return {
    all,
    shortNames,
    sourcesByType,
    filters,
    getSourceSections,
    getContent,
    updateSourceFilters,
  };
}
