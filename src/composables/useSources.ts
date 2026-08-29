/**
 * Sources service composable for Vue
 *
 * Provides reactive access to source material (books, supplements, etc.).
 * Migrated from window.sourcesService bridge to direct TypeScript service import.
 */

import { computed, type ComputedRef } from 'vue';
import { sources } from '@/services/sources';

export interface SourceSection {
  name: string;
  sources: string[];
}

export interface ContentPack {
  name: string;
  shortName: string;
}

export interface UseSourcesReturn {
  all: ComputedRef<string[]>;
  shortNames: ComputedRef<Record<string, string>>;
  sourcesByType: ComputedRef<Record<string, string[]>>;
  filters: ComputedRef<Record<string, boolean>>;
  getSourceSections: () => SourceSection[];
  getContent: () => ContentPack[];
  updateSourceFilters: (params: { type: string; enabled: boolean }, filterSource: Record<string, boolean>) => void;
}

export function useSources(): UseSourcesReturn {
  // Direct access to TypeScript sources service
  const all = computed(() => sources.all);

  const shortNames = computed(() => sources.shortNames);

  const sourcesByType = computed(() => sources.sourcesByType);

  const filters = computed(() => sources.filters);

  function getSourceSections(): SourceSection[] {
    const sections = Object.keys(sources.sourcesByType).map(sourceType => ({
      name: sourceType,
      sources: [...sources.sourcesByType[sourceType]].sort(),
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
  }

  function getContent(): ContentPack[] {
    const homebrewNames = sources.sourcesByType["Homebrew"] || [];

    return sources.all
      .filter(name => !homebrewNames.includes(name))
      .map(name => ({
        name,
        shortName: sources.shortNames[name],
      }));
  }

  function updateSourceFilters({ type, enabled }: { type: string; enabled: boolean }, filterSource: Record<string, boolean>): void {
    const typeSources = sources.sourcesByType[type] || [];
    typeSources.forEach(name => {
      filterSource[name] = enabled;
    });
  }

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
