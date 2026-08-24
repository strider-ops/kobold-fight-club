<template>
  <div class="container">
    <h2>Battle Tracker</h2>

    <div v-if="!combatants || combatants.length === 0" class="alert alert-warning">
      <p>
        No combatants in battle.
        <router-link to="/encounter-builder">Go to Encounter Builder</router-link>
      </p>
    </div>

    <div v-else>
      <div class="combat-controls">
        <div class="form-inline">
          <label>Damage/Heal Amount:</label>
          <input
            type="number"
            class="form-control input-lg"
            v-model.number="deltaValue"
            min="0"
            style="width: 100px; margin: 0 1rem;"
          >
          <button
            class="btn btn-primary btn-lg combat-controls--next-turn"
            @click="handleNextTurn"
          >
            Next Turn
          </button>
        </div>
      </div>

      <Combatant
        v-for="(combatant, index) in combatants"
        :key="index"
        :combatant="combatant"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useCombat } from '../composables/useCombat';
import Combatant from './Combatant.vue';

const router = useRouter();
const { combatants, delta, begin, nextTurn } = useCombat();

const deltaValue = computed({
  get: () => delta.value,
  set: (value) => {
    delta.value = value;
  }
});

onMounted(() => {
  if (!combatants.value || combatants.value.length === 0) {
    router.push('/encounter-builder');
    return;
  }

  begin();
});

const handleNextTurn = () => {
  nextTurn();
};
</script>

<style scoped>
.combat-controls {
  margin: 2rem 0;
  padding: 1.5rem;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.combat-controls--next-turn {
  margin-left: 1rem;
}
</style>
