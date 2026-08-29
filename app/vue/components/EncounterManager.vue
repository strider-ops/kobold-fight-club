<template>
  <div class="encounter-manager">
    <h2>Encounter Manager</h2>

    <!-- No encounters state -->
    <div v-if="!hasEncounters && !hasUnsavedEncounter" class="encounter-manager--no-encounters">
      <p>You don't have any encounters saved.</p>
      <button @click="goToBuilder">Return to encounter builder</button>
    </div>

    <!-- Unsaved encounter (from builder) -->
    <div v-if="hasUnsavedEncounter" class="encounter-manager-encounter encounter-manager-encounter__unsaved">
      <h3>Current Encounter</h3>
      <div class="encounter-manager-encounter--controls">
        <input
          v-model="encounterName"
          placeholder="Enter encounter name..."
          class="encounter-manager-encounter--name-input"
        >
        <button @click="saveEncounter('encounter')" class="encounter-manager-encounter--save-button">
          Save as Encounter
        </button>
        <button @click="saveEncounter('pool')" class="encounter-manager-encounter--save-button">
          Save as Table
        </button>
      </div>

      <div class="encounter-manager-monster" v-for="(group, id) in currentGroups" :key="id">
        <span v-if="group.qty > 1">{{ group.qty }}x</span>
        {{ group.monster?.name || 'Unknown' }}
      </div>
    </div>

    <!-- Saved encounters -->
    <div v-if="savedEncounters.length > 0">
      <h3>Saved Encounters</h3>
      <ManagerRow
        v-for="enc in savedEncounters"
        :key="enc.name"
        :storedEncounter="enc"
        @remove="removeEncounter"
      />
    </div>

    <!-- Saved random encounter tables -->
    <div v-if="savedPools.length > 0" class="random-encounter-pools">
      <h3>Random Encounter Tables</h3>
      <ManagerRow
        v-for="enc in savedPools"
        :key="enc.name"
        :storedEncounter="enc"
        @remove="removeEncounter"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useEncounter, useLibrary } from '../composables';
import ManagerRow from './ManagerRow.vue';

const encounterName = ref('');

const { groups, reference, resetEncounter } = useEncounter();
const { savedEncounters, savedPools, storeEncounter, removeEncounter } = useLibrary();

const currentGroups = computed(() => groups.value);

const hasUnsavedEncounter = computed(() => {
  return Object.keys(groups.value).length > 0 && !reference.value;
});

const hasEncounters = computed(() => {
  return savedEncounters.value.length > 0 || savedPools.value.length > 0;
});

function goToBuilder() {
  window.location.hash = '#/encounter-builder';
}

function saveEncounter(type) {
  const name = encounterName.value || 'Untitled';
  const newEntry = {
    name,
    type: type || 'encounter',
    groups: {},
  };

  // Store as a map of monster ID => quantity
  Object.entries(groups.value).forEach(([id, group]) => {
    newEntry.groups[id] = type === 'pool' ? 1 : group.qty;
  });

  const stored = storeEncounter(newEntry);
  resetEncounter(stored);
  encounterName.value = '';
}
</script>

<style scoped>
.encounter-manager {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;

  &--no-encounters {
    text-align: center;
    padding: 4rem 2rem;
    color: #666;

    p {
      margin: 0 0 1rem 0;
      font-size: 1.1rem;
    }

    button {
      padding: 0.8rem 1.6rem;
      font-size: 1rem;
      background: #2196F3;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.2s;

      &:hover {
        background: #1976D2;
      }
    }
  }

  h3 {
    margin-top: 2rem;
    margin-bottom: 1rem;
    font-size: 1.2rem;
    color: #333;
    border-bottom: 2px solid #eee;
    padding-bottom: 0.5rem;
  }
}

.encounter-manager-encounter {
  margin: 2rem 0;
  padding: 1.5rem;
  background: #f5f5f5;
  border: 2px dashed #999;
  border-radius: 4px;

  &__unsaved {
    background: #fff9e6;
    border-color: #ffb300;
  }

  &--controls {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  &--name-input {
    flex: 1;
    min-width: 200px;
    padding: 0.6rem;
    font-size: 1rem;
    border: 1px solid #ddd;
    border-radius: 3px;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);

    &:focus {
      outline: none;
      border-color: #2196F3;
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05), 0 0 4px rgba(33, 150, 243, 0.3);
    }
  }

  &--save-button {
    padding: 0.6rem 1.2rem;
    font-size: 0.95rem;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: #45a049;
    }
  }
}

.encounter-manager-monster {
  padding: 0.4rem 0;
  font-size: 0.95rem;
  color: #333;

  span {
    font-weight: 600;
    margin-right: 0.3rem;
  }
}

.random-encounter-pools {
  margin-top: 1rem;
}
</style>
