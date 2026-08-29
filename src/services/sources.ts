/**
 * Sources Service
 *
 * Wrapper for source book management and filtering.
 * Provides access to monster source books and their metadata.
 */

import { misc } from './misc';
import type { SourceFilters } from '@/types';

export interface SourcesService {
  all: string[];
  filters: SourceFilters;
  shortNames: Record<string, string>;
  sourcesByType: Record<string, string[]>;
}

class Sources implements SourcesService {
  get all(): string[] {
    return misc.sources;
  }

  get filters(): SourceFilters {
    return misc.sourceFilters;
  }

  get shortNames(): Record<string, string> {
    return misc.shortNames;
  }

  get sourcesByType(): Record<string, string[]> {
    return misc.sourcesByType;
  }
}

// Export singleton instance
export const sources = new Sources();
