<template>
  <div class="encounter-manager">
    <h2>Encounter Manager</h2>

    <!-- No encounters state -->
    <div v-if="!hasEncounters && !hasUnsavedEncounter" class="empty-state">
      <p>You don't have any encounters saved.</p>
      <button @click="goToBuilder">Return to encounter builder</button>
    </div>

    <!-- Unsaved encounter (from builder) -->
    <div v-if="hasUnsavedEncounter" class="unsaved-section">
      <h3>Current Encounter</h3>
      <div class="controls">
        <input
          v-model="encounterName"
          placeholder="Enter encounter name..."
          class="name-input"
        >
        <button @click="saveEncounter('encounter')" class="btn btn-success">
          Save as Encounter
        </button>
        <button @click="saveEncounter('pool')" class="btn btn-success">
          Save as Table
        </button>
      </div>

      <div class="monster-list">
        <div v-for="(group, id) in currentGroups" :key="id" class="monster-item">
          <span v-if="group.qty > 1" class="qty">{{ group.qty }}x</span>
          <span class="name">{{ group.monster?.name || 'Unknown' }}</span>
        </div>
      </div>
    </div>

    <!-- Saved encounters -->
    <div v-if="savedEncounters.length > 0">
      <h3>Saved Encounters</h3>
      <div v-for="(enc, idx) in savedEncounters" :key="idx" class="encounter-row">
        <div class="encounter-info">
          <strong>{{ enc.name }}</strong>
          <span class="type">({{ enc.type }})</span>
        </div>
        <div class="encounter-actions">
          <button @click="loadEncounter(enc)" class="btn btn-sm btn-primary">Load</button>
          <button @click="removeEncounter(enc)" class="btn btn-sm btn-danger">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

console.log('EncounterManager component loading...');

const encounterName = ref('');

// Access AngularJS services from window
function getEncounterService() {
  return window.encounterService;
}

function getLibraryService() {
  return window.libraryService;
}

const currentGroups = computed(() => {
  const enc = getEncounterService();
  return enc ? enc.groups : {};
});

const hasUnsavedEncounter = computed(() => {
  const enc = getEncounterService();
  return enc && Object.keys(enc.groups).length > 0 && !enc.reference;
});

const hasEncounters = computed(() => {
  const lib = getLibraryService();
  return lib && lib.encounters && lib.encounters.length > 0;
});

const savedEncounters = computed(() => {
  const lib = getLibraryService();
  return lib && lib.encounters ? lib.encounters : [];
});

function goToBuilder() {
  window.location.hash = '#/encounter-builder';
}

function saveEncounter(type) {
  const enc = getEncounterService();
  const lib = getLibraryService();

  if (!enc || !lib) {
    alert('Services not loaded');
    return;
  }

  const name = encounterName.value || 'Untitled';
  const newEntry = {
    name: name,
    type: type || 'encounter',
    groups: {}
  };

  // Copy groups
  Object.entries(enc.groups).forEach(([id, group]) => {
    newEntry.groups[id] = type === 'pool' ? 1 : group.qty;
  });

  lib.store(newEntry);
  enc.reference = newEntry;
  enc.reset(newEntry);
  encounterName.value = '';
}

function loadEncounter(encounter) {
  const enc = getEncounterService();
  if (enc && enc.reset) {
    enc.reset(encounter);
    window.location.hash = '#/encounter-builder';
  }
}

function removeEncounter(encounter) {
  const lib = getLibraryService();
  if (lib && lib.remove) {
    lib.remove(encounter);
  }
}

console.log('EncounterManager component loaded');
</script>

<style scoped>
.encounter-manager {
  padding: 2rem;
  max-width: 900px;
  margin: 0 auto;
}

.encounter-manager h2 {
  margin-bottom: 1.5rem;
  color: #333;
}

.encounter-manager h3 {
  margin-top: 2rem;
  margin-bottom: 1rem;
  color: #555;
  border-bottom: 2px solid #eee;
  padding-bottom: 0.5rem;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  background: #f5f5f5;
  border-radius: 4px;
  color: #666;
}

.empty-state button {
  margin-top: 1rem;
  padding: 0.8rem 1.6rem;
  font-size: 1rem;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.empty-state button:hover {
  background: #1976D2;
}

.unsaved-section {
  background: #fff9e6;
  border: 2px dashed #ffb300;
  border-radius: 4px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.unsaved-section h3 {
  margin-top: 0;
}

.controls {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.name-input {
  flex: 1;
  min-width: 200px;
  padding: 0.6rem;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 3px;
}

.name-input:focus {
  outline: none;
  border-color: #2196F3;
  box-shadow: 0 0 4px rgba(33, 150, 243, 0.3);
}

.btn {
  padding: 0.6rem 1.2rem;
  font-size: 0.95rem;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-success {
  background: #4CAF50;
  color: white;
}

.btn-success:hover {
  background: #45a049;
}

.btn-primary {
  background: #2196F3;
  color: white;
}

.btn-primary:hover {
  background: #1976D2;
}

.btn-danger {
  background: #f44336;
  color: white;
}

.btn-danger:hover {
  background: #da190b;
}

.btn-sm {
  padding: 0.4rem 0.8rem;
  font-size: 0.85rem;
}

.monster-list {
  margin-top: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 3px;
}

.monster-item {
  padding: 0.5rem 0;
  border-bottom: 1px solid #f0f0f0;
}

.monster-item:last-child {
  border-bottom: none;
}

.monster-item .qty {
  font-weight: 600;
  color: #666;
  margin-right: 0.5rem;
}

.monster-item .name {
  color: #333;
}

.encounter-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.encounter-info {
  flex: 1;
}

.encounter-info strong {
  display: block;
  margin-bottom: 0.25rem;
  color: #333;
}

.encounter-info .type {
  font-size: 0.85rem;
  color: #999;
}

.encounter-actions {
  display: flex;
  gap: 0.5rem;
}
</style>

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
