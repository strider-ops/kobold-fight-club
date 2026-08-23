<template>
  <div class="encounter-manager-row">
    <div class="encounter-manager-row--controls">
      <div class="encounter-manager-row--name">
        {{ storedEncounter.name }}
      </div>
      <div class="encounter-manager-row--exp">
        Exp: {{ calculateExp(storedEncounter) }}
      </div>
      <button
        v-if="encounter.reference !== storedEncounter"
        class="encounter-manager-row--load-button"
        @click="handleLoad"
      >
        Choose
      </button>
      <button
        class="encounter-manager-row--remove-button"
        @click="handleRemove"
      >
        Remove
      </button>
      <span
        v-if="encounter.reference === storedEncounter"
        class="encounter-manager-row--active"
      >
        Active
      </span>
    </div>

    <div class="encounter-manager-monster" v-for="(qty, id) in storedEncounter.groups" :key="id">
      <span v-if="qty > 1">{{ qty }}x</span>
      {{ monsters.getMonsterById(id)?.name || 'Unknown' }}
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue';
import { useEncounter } from '../composables/useEncounter';
import { useMonsters } from '../composables/useMonsters';
import { useRouter } from 'vue-router';

const props = defineProps({
  storedEncounter: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['remove']);

const encounter = useEncounter();
const monsters = useMonsters();
const router = useRouter();

function calculateExp(storedEncounter) {
  let exp = 0;
  Object.entries(storedEncounter.groups).forEach(([id, qty]) => {
    const monster = monsters.getMonsterById(id);
    if (monster && monster.cr) {
      exp += monster.cr.exp * qty;
    }
  });
  return exp;
}

function handleLoad() {
  encounter.resetEncounter(props.storedEncounter);
  // Navigate to encounter-builder (AngularJS route)
  window.location.hash = '#/encounter-builder';
}

function handleRemove() {
  emit('remove', props.storedEncounter);
}
</script>

<style scoped>
.encounter-manager-row {
  margin: 1rem 0;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #f9f9f9;

  &--controls {
    display: flex;
    gap: 1rem;
    margin-bottom: 0.5rem;
    flex-wrap: wrap;
    align-items: center;
  }

  &--name {
    font-weight: 600;
    flex: 1;
    min-width: 200px;
  }

  &--exp {
    color: #666;
    font-size: 0.9rem;
  }

  &--load-button,
  &--remove-button {
    padding: 0.4rem 0.8rem;
    font-size: 0.85rem;
    border: 1px solid #ccc;
    border-radius: 3px;
    cursor: pointer;
    background: white;
    transition: all 0.2s;

    &:hover {
      background: #f0f0f0;
      border-color: #999;
    }
  }

  &--load-button {
    background: #4CAF50;
    color: white;
    border-color: #45a049;

    &:hover {
      background: #45a049;
    }
  }

  &--remove-button {
    background: #f44336;
    color: white;
    border-color: #da190b;

    &:hover {
      background: #da190b;
    }
  }

  &--active {
    padding: 0.4rem 0.8rem;
    background: #2196F3;
    color: white;
    border-radius: 3px;
    font-size: 0.85rem;
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
</style>
