<template>
  <div class="group-info">
    <div class="group-info--input">
      <h2 class="group-info--header">Group Info</h2>
      <div
        v-for="(partyLevel, index) in partyLevels"
        :key="index"
        class="group-info--party-level-row row"
      >
        <div class="col-xs-4">
          <label>Player Count:</label>
          <input
            class="form-control input-sm"
            type="number"
            v-model.number="partyLevel.count"
            min="0"
          >
        </div>
        <div class="col-xs-4">
          <label>Level:</label>
          <input
            class="form-control input-sm"
            type="number"
            v-model.number="partyLevel.level"
            min="1"
            max="20"
          >
        </div>
        <div class="col-xs-4" style="padding-top: 24px;">
          <button
            v-if="index > 0"
            class="btn btn-xs btn-danger"
            @click="removePartyLevel(index)"
          >
            <i class="fa fa-trash-o"></i>
          </button>
        </div>
      </div>
      <button
        class="btn btn-xs btn-info group-info--add-level"
        title="Add Another Party Level"
        @click="addPartyLevel"
      >
        <i class="fa fa-plus"></i> Add Another Level
      </button>
    </div>
    <ul class="group-info--guidelines list-unstyled">
      <li :class="{ 'group-info--guidelines-active': difficulty === 'Easy' }">
        <span>Easy:</span>
        <span class="group-info--guidelines-values">
          {{ totalExpLevels.easy.toLocaleString() }} exp
        </span>
      </li>
      <li :class="{ 'group-info--guidelines-active': difficulty === 'Medium' }">
        <span>Medium:</span>
        <span class="group-info--guidelines-values">
          {{ totalExpLevels.medium.toLocaleString() }} exp
        </span>
      </li>
      <li :class="{ 'group-info--guidelines-active': difficulty === 'Hard' }">
        <span>Hard:</span>
        <span class="group-info--guidelines-values">
          {{ totalExpLevels.hard.toLocaleString() }} exp
        </span>
      </li>
      <li :class="{ 'group-info--guidelines-active': difficulty === 'Deadly' }">
        <span>Deadly:</span>
        <span class="group-info--guidelines-values">
          {{ totalExpLevels.deadly.toLocaleString() }} exp
        </span>
      </li>
      <br/>
      <li>
        <span>Daily Budget:</span>
        <span class="group-info--guidelines-values pt-1">
          {{ totalExpLevels.budget.toLocaleString() }} exp
        </span>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const partyInfo = computed(() => window.partyInfoService);

const partyLevels = computed(() => partyInfo.value?.partyLevels || []);
const difficulty = computed(() => {
  const encounter = window.encounterService;
  return encounter?.difficulty || '';
});

const totalExpLevels = computed(() => partyInfo.value?.totalPartyExpLevels || {
  easy: 0,
  medium: 0,
  hard: 0,
  deadly: 0,
  budget: 0,
});

const addPartyLevel = () => {
  if (partyInfo.value?.addPartyLevel) {
    partyInfo.value.addPartyLevel();
  }
};

const removePartyLevel = (index) => {
  if (partyInfo.value?.removePartyLevel) {
    partyInfo.value.removePartyLevel(index);
  }
};
</script>
