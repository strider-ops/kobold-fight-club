import { ref, computed } from 'vue';

/**
 * Composable for managing imported homebrew content
 * Wraps the AngularJS homebrew service
 */
export function useHomebrew() {
  const homebrew = computed(() => window.homebrewService || {});
  const importResult = ref(null);

  const packs = computed(() => homebrew.value.packs || []);

  /**
   * Import monsters from CSV or JSON text
   * @param {string} filename - Name of the file being imported
   * @param {string} text - File content (CSV or JSON)
   * @returns {Object} Import result with added count, skipped count, and errors
   */
  const importText = (filename, text) => {
    if (!homebrew.value.importText) {
      return {
        added: 0,
        skipped: 0,
        errors: ['Homebrew service not available'],
      };
    }

    const result = homebrew.value.importText(filename, text);
    importResult.value = result;
    return result;
  };

  /**
   * Import monsters from a File object
   * @param {File} file - File to import
   */
  const importFile = (file) => {
    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      importResult.value = importText(file.name, reader.result);
    };

    reader.onerror = () => {
      importResult.value = {
        added: 0,
        skipped: 0,
        errors: ['Could not read that file.'],
      };
    };

    reader.readAsText(file);
  };

  /**
   * Remove an imported homebrew pack
   * @param {string} sourceName - Name of the source to remove
   */
  const remove = (sourceName) => {
    if (!homebrew.value.remove) {
      console.warn('Homebrew service not available');
      return;
    }

    homebrew.value.remove(sourceName);
    importResult.value = null;
  };

  /**
   * Clear the import result message
   */
  const clearImportResult = () => {
    importResult.value = null;
  };

  return {
    packs,
    importResult,
    importText,
    importFile,
    remove,
    clearImportResult,
  };
}
