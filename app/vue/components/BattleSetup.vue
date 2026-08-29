<template>
  <div class="container">
    <h2>Battle Setup</h2>

    <div v-if="needsPlayers" class="alert alert-warning">
      <p>
        <strong>You must select a party.</strong>
        <router-link to="/players">Go to Manage Players</router-link>
      </p>
    </div>

    <div v-if="needsMonsters" class="alert alert-warning">
      <p>
        <strong>You must select an encounter.</strong>
        <router-link to="/encounter-builder">Go to Encounter Builder</router-link>
      </p>
    </div>

    <div v-if="!needsPlayers && !needsMonsters">
      <div class="combat-setup-controls">
        <button class="btn btn-danger btn-lg" @click="startBattle">
          Fight!
        </button>

        <button class="btn btn-lg launch-in-imp-init-button" @click="launchImpInit">
          Run in Improved Initiative
        </button>
      </div>

      <CombatantSetup
        v-for="(combatant, index) in combatants"
        :key="index"
        :combatant="combatant"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useCombat } from '../composables/useCombat';
import { useEncounter, usePlayers } from '../composables';
import { integration } from '@/services/integration';
import CombatantSetup from './CombatantSetup.vue';

const router = useRouter();
const { combatants, init } = useCombat();
const { groups } = useEncounter();
const { selectedParty } = usePlayers();

const needsPlayers = ref(false);
const needsMonsters = ref(false);

// Combat constants (from AngularJS)
const NO_PLAYERS = 1;
const NO_MONSTERS = 2;

onMounted(() => {
  const combatState = init();

  needsPlayers.value = !!(combatState & NO_PLAYERS);
  needsMonsters.value = !!(combatState & NO_MONSTERS);
});

const startBattle = () => {
  router.push('/battle-tracker');
};

const launchImpInit = () => {
  integration.launchImpInit(groups.value, selectedParty.value || []);
};
</script>

<style scoped>
.combat-setup-controls {
  margin: 2rem 0;
}

.combat-setup-controls button {
  margin-right: 1rem;
}
</style>
