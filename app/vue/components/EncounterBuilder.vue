<template>
  <div class="encounter-builder container-fluid" role="main">
    <div class="row">
      <div class="col-md-4">
        <GroupInfo />
        <div class="encounter-builder--current-encounter-container">
          <div
            class="encounter-builder--current-encounter-slider"
            :class="{ 'encounter-builder--current-encounter-slider__shown': encounterShown }"
          >
            <div
              class="encounter-builder--encounter-info-bar"
              @click="encounterShown = !encounterShown"
            >
              <i
                class="fa encounter-builder--toggle-arrow"
                :class="{
                  'fa-toggle-up': !encounterShown,
                  'fa-toggle-down': encounterShown
                }"
              ></i>
              <div class="encounter-builder--encounter-info-text">
                <span v-if="encounterExp">
                  {{ monsterQtyString }}, {{ encounterExp.toLocaleString() }} exp ({{ encounterDifficulty }})
                </span>
                <span v-else>
                  <span v-if="encounterShown">Browse monsters</span>
                  <span v-else>Manage encounter</span>
                </span>
              </div>
            </div>

            <div class="encounter-builder--current-encounter">
              <CurrentEncounter :filters="filters" />
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-8">
        <SearchForm :filters="filters" />
        <MonsterTable :filters="filters" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useFilters } from '../composables';
import SearchForm from './SearchForm.vue';
import MonsterTable from './MonsterTable.vue';
import CurrentEncounter from './CurrentEncounter.vue';
import GroupInfo from './GroupInfo.vue';

const { filters, loadFilters } = useFilters();

const encounterShown = ref(false);

const encounter = computed(() => window.encounterService);
const encounterExp = computed(() => encounter.value?.exp || 0);
const encounterDifficulty = computed(() => encounter.value?.difficulty || '');

const monsterQtyString = computed(() => {
  if (!encounter.value || !encounter.value.groups) {
    return '0 enemies';
  }

  const qty = Object.values(encounter.value.groups).reduce((sum, group) => {
    return sum + (group.qty || 0);
  }, 0);

  return qty === 1 ? '1 enemy' : `${qty} enemies`;
});

onMounted(async () => {
  await loadFilters();
});
</script>

<style>
/*
 * Styles are loaded from the main AngularJS app CSS (styles/style.css)
 * which is already compiled and includes all the encounter-builder styles.
 * The Vue app reuses these existing styles.
 */
</style>
