<template>
  <div>
    <div class="monster-table table-responsive">
      <table class="monster-table--table table table-bordered table-striped">
        <thead>
          <tr>
            <th class="monster-table--column monster-table--column__button"></th>
            <th
              class="monster-table--column monster-table--column__sortable monster-table--column__name"
              @click="filters.sort = 'name'"
            >
              Name
            </th>
            <th
              class="monster-table--column monster-table--column__sortable monster-table--column__cr"
              @click="filters.sort = 'cr'"
            >
              CR
            </th>
            <th
              class="monster-table--column monster-table--column__sortable monster-table--column__size"
              @click="filters.sort = 'size'"
            >
              Size
            </th>
            <th
              class="monster-table--column monster-table--column__sortable monster-table--column__type"
              @click="filters.sort = 'type'"
            >
              Type
            </th>
            <th
              class="monster-table--column monster-table--column__sortable monster-table--column__alignment"
              @click="filters.sort = 'alignment'"
            >
              Alignment
            </th>
            <th class="monster-table--column monster-table--column__source">
              Source
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filters.search && hiddenCount > 0" class="monster-table--warning-row">
            <td colspan="7" class="monster-table--filter-warning-cell">
              {{ hiddenCount }} monsters hidden by filters or in unselected sources
            </td>
          </tr>
        </tbody>
        <tbody>
          <tr
            v-for="monster in paginatedMonsters"
            :key="monster.id"
            class="monster-table--row"
          >
            <td class="monster-table--button-cell">
              <button class="btn btn-sm btn-success" @click="addMonsterToEncounter(monster)">
                <i class="fa fa-plus"></i>
              </button>
            </td>
            <td class="monster-table--name-cell">
              <div class="monster-table--name">
                {{ monster.name }}
              </div>
              <div v-if="monster.section" class="monster-table--section">
                <span class="monster-table--label">Section:</span>
                {{ monster.section }}
              </div>
            </td>
            <td
              class="monster-table--cr-cell"
              :class="`monster-table--cr-cell__${getDangerZone(monster)}`"
            >
              <span class="monster-table--cr-label">CR</span>
              {{ monster.cr.string }}
            </td>
            <td class="monster-table--size-cell">
              <span class="monster-table--label">Size:</span>
              {{ monster.size }}
            </td>
            <td class="monster-table--type-cell">
              <span class="monster-table--label">Type:</span>
              {{ monster.type }}
              <span v-if="monster.tags" class="monster-table--tags">
                ({{ monster.tags.join(', ') }})
              </span>
            </td>
            <td class="monster-table--alignment-cell">
              <span v-if="monster.alignment">
                <span class="monster-table--label">Alignment:</span>
                {{ monster.alignment.text }}
              </span>
            </td>
            <td class="monster-table--source-cell">
              <div
                v-for="source in monster.sources"
                :key="source.name"
                v-show="filters.source[source.name]"
                class="monster-table--sources"
              >
                <span
                  class="monster-table--source-name monster-table--source-name__short"
                  :title="source.name"
                >
                  {{ shortNames[source.name] }}
                </span>
                <span class="monster-table--source-name monster-table--source-name__long">
                  {{ source.name }}
                </span>
                <span v-if="source.page">p.{{ source.page }}</span>
                <span v-if="source.url">
                  <a target="_blank" :href="source.url">[Link]</a>
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pagination-container">
      <nav v-if="totalPages > 1" style="padding-top: 0;">
        <ul class="pagination" style="margin: 0;">
          <li :class="{ disabled: currentPage === 1 }">
            <a href="#" @click.prevent="goToPage(currentPage - 1)">
              <span>&laquo;</span>
            </a>
          </li>
          <li
            v-for="page in visiblePages"
            :key="page"
            :class="{ active: page === currentPage }"
          >
            <a href="#" @click.prevent="goToPage(page)">{{ page }}</a>
          </li>
          <li :class="{ disabled: currentPage === totalPages }">
            <a href="#" @click.prevent="goToPage(currentPage + 1)">
              <span>&raquo;</span>
            </a>
          </li>
        </ul>
      </nav>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useMonsters, useSources, useEncounter, useMonsterFilter } from '../composables';

const props = defineProps({
  filters: {
    type: Object,
    required: true,
  },
});

const { all: allMonsters } = useMonsters();
const { shortNames } = useSources();
const { add: addToEncounter, threat } = useEncounter();

const { filteredMonsters, hiddenCount } = useMonsterFilter(allMonsters, props.filters);

// Pagination
const currentPage = ref(1);

const totalPages = computed(() => {
  return Math.ceil(filteredMonsters.value.length / props.filters.pageSize);
});

const paginatedMonsters = computed(() => {
  const start = (currentPage.value - 1) * props.filters.pageSize;
  const end = start + props.filters.pageSize;
  return filteredMonsters.value.slice(start, end);
});

const visiblePages = computed(() => {
  const pages = [];
  const maxVisible = 7;
  let startPage = Math.max(1, currentPage.value - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages.value, startPage + maxVisible - 1);

  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return pages;
});

const goToPage = (page) => {
  if (page < 1 || page > totalPages.value) {
    return;
  }
  currentPage.value = page;
};

// Reset to page 1 when filters change
watch(() => [props.filters.search, props.filters.type, props.filters.size, props.filters.minCr, props.filters.maxCr], () => {
  currentPage.value = 1;
});

/**
 * Calculate danger zone for a monster based on party threat levels
 */
const getDangerZone = (monster) => {
  if (!monster || !threat.value) {
    return null;
  }

  const threatLevels = threat.value;
  const monsterExp = monster.cr.exp;

  if (monsterExp > threatLevels.deadly) {
    return 'deadly';
  } else if (monsterExp > threatLevels.hard) {
    return 'hard';
  } else if (monsterExp > threatLevels.medium) {
    return 'medium';
  } else if (monsterExp > threatLevels.easy) {
    return 'easy';
  } else if (monsterExp > threatLevels.pair) {
    return 'pair';
  } else if (monsterExp > threatLevels.group) {
    return 'group';
  } else {
    return 'trivial';
  }
};

/**
 * Add a monster to the current encounter
 */
const addMonsterToEncounter = (monster) => {
  addToEncounter(monster);
};
</script>

<style scoped>
/* Limit table height so pagination is always visible without page scrolling */
.monster-table {
  max-height: 70vh;
  overflow-y: auto;
  margin-bottom: 0;
}

.pagination-container {
  margin-top: 0px;
  margin-bottom: 0px;
  text-align: center;
  background-color: white;
  padding: 0px 0;
}

.monster-table--column__sortable {
  cursor: pointer;
  user-select: none;
}

.monster-table--column__sortable:hover {
  background-color: #f5f5f5;
}
</style>
