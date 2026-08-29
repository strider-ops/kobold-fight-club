/**
 * Homebrew service composable for Vue
 *
 * Provides reactive access to imported homebrew content management.
 * Migrated from window.homebrewService bridge to direct TypeScript service import.
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue';
import { homebrew, type ImportResult, type HomebrewPack } from '@/services/homebrew';

export interface UseHomebrewReturn {
  packs: ComputedRef<HomebrewPack[]>;
  importResult: Ref<ImportResult | null>;
  importText: (filename: string, text: string) => ImportResult;
  importFile: (file: File) => void;
  remove: (sourceName: string) => void;
  clearImportResult: () => void;
}

export function useHomebrew(): UseHomebrewReturn {
  const importResult = ref<ImportResult | null>(null);

  // Direct access to TypeScript homebrew service
  const packs = computed(() => homebrew.packs);

  function importText(filename: string, text: string): ImportResult {
    const result = homebrew.importText(filename, text);
    importResult.value = result;
    return result;
  }

  function importFile(file: File): void {
    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      importResult.value = importText(file.name, reader.result as string);
    };

    reader.onerror = () => {
      importResult.value = {
        sourceName: file.name,
        added: 0,
        skipped: 0,
        errors: ['Could not read that file.'],
      };
    };

    reader.readAsText(file);
  }

  function remove(sourceName: string): void {
    homebrew.remove(sourceName);
    importResult.value = null;
  }

  function clearImportResult(): void {
    importResult.value = null;
  }

  return {
    packs,
    importResult,
    importText,
    importFile,
    remove,
    clearImportResult,
  };
}
