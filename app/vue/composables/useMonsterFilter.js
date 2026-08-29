import { computed } from 'vue';
import { library } from '@/services/library';

/**
 * Composable for filtering and sorting monsters
 */
export function useMonsterFilter(monsters, filters) {
  // Regex cache to avoid recreating regex objects on every filter
  const regexCache = {};
  let lastRegex = new RegExp('', 'i');

  /**
   * Check if a monster passes all active filters
   */
  const checkMonster = (monster) => {
    return !isFiltered(monster) && isNameMatched(monster);
  };

  /**
   * Check if monster is filtered out by non-search filters
   */
  const isFiltered = (monster) => {
    const legendaryMap = {
      'Legendary': 'legendary',
      'Legendary (in lair)': 'lair',
      'Ordinary': false
    };

    // Legendary filter
    if (filters.legendary) {
      const legendaryFilter = legendaryMap[filters.legendary];
      if (legendaryFilter) {
        if (!monster[legendaryFilter]) return true;
      } else {
        if (monster.legendary || monster.lair) return true;
      }
    }

    // Type filter
    if (filters.type && monster.type !== filters.type) {
      return true;
    }

    // Size filter
    if (filters.size && monster.size !== filters.size) {
      return true;
    }

    // Alignment filter
    if (filters.alignment) {
      if (!monster.alignment) {
        return true;
      }
      if (!(filters.alignment.flags & monster.alignment.flags)) {
        return true;
      }
    }

    // CR filters
    if (filters.minCr != null && monster.cr.numeric < filters.minCr) {
      return true;
    }

    if (filters.maxCr != null && monster.cr.numeric > filters.maxCr) {
      return true;
    }

    // Environment filter (terrain)
    if (filters.environment) {
      if (!monster.environment || monster.environment.indexOf(filters.environment) === -1) {
        return true;
      }
    }

    // Pool (table) filter - check if in saved pool/table
    if (filters.pool) {
      const pools = library.encounters.filter(e => e.type === 'pool' && e.name === filters.pool);
      if (pools.length > 0 && !pools[0].groups[monster.id]) {
        return true;
      }
    }

    // Source filter - must be in at least one selected source
    if (!isInSource(monster, filters.source)) {
      return true;
    }

    return false;
  };

  /**
   * Check if monster name matches search text
   */
  const isNameMatched = (monster) => {
    if (!filters.search) {
      return true;
    }

    // Check if this is a regex search (/pattern/)
    const regexMatch = filters.search.match(/^\/(.*?)\/?$/);
    if (regexMatch) {
      let regex;
      const raw = regexMatch[1];
      try {
        regex = regexCache[raw] || new RegExp(raw, 'i');
        if (regex) {
          lastRegex = regex;
          regexCache[raw] = regex;
        }
      } catch (ex) {
        regexCache[raw] = null;
      }

      regex = regex || lastRegex;
      return monster.searchable.match(regex);
    }

    // Plain text search
    return monster.searchable.indexOf(filters.search.toLowerCase()) !== -1;
  };

  /**
   * Check if monster is in any selected source
   */
  const isInSource = (monster, sources) => {
    if (!monster || !monster.sources) {
      return false;
    }

    for (let i = 0; i < monster.sources.length; i++) {
      if (sources[monster.sources[i].name]) {
        return true;
      }
    }

    return false;
  };

  /**
   * Sort monsters by the selected sort field
   */
  const sortMonsters = (monsterList, sortBy) => {
    const sorted = [...monsterList];

    if (sortBy === 'size') {
      sorted.sort((a, b) => a.sizeSort - b.sizeSort);
    } else if (sortBy === 'type') {
      sorted.sort((a, b) => (a.type > b.type ? 1 : -1));
    } else if (sortBy === 'alignment') {
      sorted.sort((a, b) => {
        const aText = (a.alignment || { text: 'zzzzzzz' }).text;
        const bText = (b.alignment || { text: 'zzzzzzz' }).text;
        return aText > bText ? 1 : -1;
      });
    } else if (sortBy === 'cr') {
      sorted.sort((a, b) => a.cr.numeric - b.cr.numeric);
    } else {
      // Default: sort by name alphabetically
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }

    return sorted;
  };

  /**
   * Computed filtered and sorted monster list
   */
  const filteredMonsters = computed(() => {
    if (!monsters.value || monsters.value.length === 0) {
      return [];
    }

    // Filter
    const filtered = monsters.value.filter(checkMonster);

    // Sort
    return sortMonsters(filtered, filters.sort || 'name');
  });

  /**
   * Count how many monsters are hidden by filters (for search warning)
   */
  const hiddenCount = computed(() => {
    if (!monsters.value || !filters.search) {
      return 0;
    }

    return monsters.value.filter(monster => isNameMatched(monster) && isFiltered(monster)).length;
  });

  return {
    filteredMonsters,
    hiddenCount,
  };
}
