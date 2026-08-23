<template>
  <div>
    <h2>
      <span v-if="!isPool">Encounter Info</span>
      <span v-if="isPool">Random Encounter Table</span>
      <div v-if="!isPool" class="btn-group pull-right">
        <button class="btn btn-info" @click="generateRandom()">
          {{ randomButtonText }}
        </button>
        <button
          type="button"
          class="btn btn-info dropdown-toggle"
          @click="showRandomDropdown = !showRandomDropdown"
        >
          <span class="caret"></span>
        </button>
        <ul v-if="showRandomDropdown" class="dropdown-menu" style="display: block;">
          <li><a href="#" @click.prevent="generateRandom('easy')">Random Easy</a></li>
          <li><a href="#" @click.prevent="generateRandom('medium')">Random Medium</a></li>
          <li><a href="#" @click.prevent="generateRandom('hard')">Random Hard</a></li>
          <li><a href="#" @click.prevent="generateRandom('deadly')">Random Deadly</a></li>
        </ul>
      </div>
    </h2>
    <p>
      No more than
      <input
        class="current-encounter--total-monsters form-control input-sm"
        type="number"
        v-model.number="totalMonsters"
      >
      monster<span v-if="totalMonsters != 1">s</span>
    </p>
    <p
      v-if="encounterQty === 0"
      class="current-encounter--empty bg-info text-muted"
    >
      Create an encounter by clicking the Random encounter button or by adding monsters from the monsters table.
    </p>
    <div class="current-encounter" :class="{ 'current-encounter__shown': encounterQty }">
      <div class="current-encounter--body">
        <div class="current-encounter--table">
          <div
            v-for="group in sortedGroups"
            :key="group.monster.id"
            class="current-encounter--row"
          >
            <div class="current-encounter--monster-info">
              <span class="current-encounter--monster-name text-capitalized">
                {{ group.monster.name }}
              </span>
              <div>
                <span class="current-encounter--monster-cr">
                  CR: {{ group.monster.cr.string }}
                </span>
                <span class="current-encounter--monster-xp">
                  XP: {{ group.monster.cr.exp.toLocaleString() }}
                </span>
                <div
                  v-for="source in group.monster.sources"
                  :key="source.name"
                  v-show="filters.source[source.name]"
                  class="current-encounter--monster-source"
                  :title="`${source.name} p.${source.page}`"
                >
                  {{ source.name }}
                  <span v-if="source.page">p.{{ source.page }}</span>
                  <span v-if="source.url">
                    <a target="_blank" :href="source.url">[Link]</a>
                  </span>
                </div>
              </div>
            </div>
            <div v-if="!isPool" class="current-encounter--monster-qty-col">
              <button
                class="btn btn-default"
                title="Randomize Monster"
                @click="randomizeMonster(group.monster)"
              >
                <i class="fa fa-random"></i>
              </button>
              <input
                class="current-encounter--monster-qty form-control input-lg"
                type="number"
                v-model.number="group.qty"
              >
              <div class="current-encounter--monster-qty-btns">
                <button class="btn btn-xs btn-success" @click="addMonster(group.monster)">
                  <i class="fa fa-plus"></i>
                </button>
                <button class="btn btn-xs btn-danger" @click="removeMonster(group.monster)">
                  <i class="fa fa-minus"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div v-if="!isPool" class="current-encounter--totals">
          <div class="current-encounter--totals-difficulty">
            Difficulty: {{ difficulty }}
          </div>
          <div class="current-encounter--totals-xp">
            <span>
              Total XP: {{ exp.toLocaleString() }}
              <span v-if="totalPlayerCount > 0" class="current-encounter--totals-individual-xp">
                ({{ Math.floor(exp / totalPlayerCount).toLocaleString() }} per player)
              </span>
            </span>
            <span>
              Adjusted XP: {{ adjustedExp.toLocaleString() }}
              <span v-if="totalPlayerCount > 0" class="current-encounter--totals-individual-xp">
                ({{ Math.floor(adjustedExp / totalPlayerCount).toLocaleString() }} per player)
              </span>
            </span>
          </div>
        </div>
        <div class="current-encounter--btns">
          <button class="btn btn-danger btn-new" @click="newEncounter">New</button>
          <button
            v-if="!reference"
            class="btn btn-primary"
            @click="$router.push('/encounter-manager')"
          >
            Save
          </button>
          <button class="btn launch-in-imp-init-button" @click="launchImpInit">
            Run in Improved Initiative
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  filters: {
    type: Object,
    required: true,
  },
});

const encounter = computed(() => window.encounterService);
const partyInfo = computed(() => window.partyInfoService);
const integration = computed(() => window.integrationService);

const showRandomDropdown = ref(false);
const totalMonsters = ref(10);
const lastDifficulty = ref('medium');

const isPool = computed(() => encounter.value?.type === 'pool');
const encounterQty = computed(() => encounter.value?.qty || 0);
const difficulty = computed(() => encounter.value?.difficulty || '');
const exp = computed(() => encounter.value?.exp || 0);
const adjustedExp = computed(() => encounter.value?.adjustedExp || 0);
const reference = computed(() => encounter.value?.reference);
const totalPlayerCount = computed(() => partyInfo.value?.totalPlayerCount || 0);

const sortedGroups = computed(() => {
  if (!encounter.value?.groups) {
    return [];
  }

  // Convert groups object to array and sort by monster name
  return Object.values(encounter.value.groups).sort((a, b) =>
    a.monster.name.localeCompare(b.monster.name)
  );
});

const randomButtonText = computed(() => {
  return `Random ${lastDifficulty.value.charAt(0).toUpperCase() + lastDifficulty.value.slice(1)}`;
});

const generateRandom = (difficulty) => {
  difficulty = difficulty || lastDifficulty.value;
  if (encounter.value?.generateRandom) {
    encounter.value.generateRandom(props.filters, difficulty, totalMonsters.value);
    lastDifficulty.value = difficulty;
    showRandomDropdown.value = false;
  }
};

const newEncounter = () => {
  if (encounter.value?.reset) {
    encounter.value.reset();
  }
};

const addMonster = (monster) => {
  if (encounter.value?.add) {
    encounter.value.add(monster);
  }
};

const removeMonster = (monster) => {
  if (encounter.value?.remove) {
    encounter.value.remove(monster);
  }
};

const randomizeMonster = (monster) => {
  if (encounter.value?.randomize) {
    encounter.value.randomize(monster, props.filters);
  }
};

const launchImpInit = () => {
  if (integration.value?.launchImpInit) {
    integration.value.launchImpInit();
  }
};
</script>

<style scoped>
.dropdown-menu {
  position: absolute;
  right: 0;
  left: auto;
}

.btn-group {
  position: relative;
}
</style>
