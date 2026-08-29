<template>
  <div class="container">
    <h2>Manage Players</h2>

    <div v-if="!parties || parties.length === 0" class="alert alert-info">
      <p>No parties defined yet. Use the form below to add players.</p>
    </div>

    <div class="manage-players">
      <div
        v-for="(party, partyIndex) in parties"
        :key="partyIndex"
        class="manage-players--party"
      >
        <button
          v-if="selectedParty !== party"
          class="manage-players--party-select-button btn btn-primary"
          @click="handleSelectParty(party)"
        >
          Select this party
        </button>
        <span
          v-else
          class="manage-players--selected-party badge"
        >
          Selected
        </span>

        <div
          v-for="(player, playerIndex) in party"
          :key="playerIndex"
          class="manage-players--player"
        >
          <span class="manage-players--player--name">
            {{ player.name }}
          </span>
          <span class="manage-players--player--init">
            Initiative: <span v-if="player.initiativeMod >= 0">+</span>{{ player.initiativeMod }}
            <span v-if="player.advantageOnInitiative">(Adv)</span>
          </span>
          <span class="manage-players--player--hp">
            HP: {{ player.hp - player.damage }} / {{ player.hp }}
          </span>
        </div>
      </div>
    </div>

    <div class="edit-players" style="margin-top: 2rem;">
      <h3>Edit Players</h3>
      <p>
        One character per line. Blank line to separate different parties. Add an exclamation point (!) to an initiative modifier to indicate advantage. Format:<br/>
        <samp>&lt;CHARACTER NAME&gt; &lt;INITIATIVE MOD&gt; &lt;MAX HP&gt;</samp> <br/>
        <samp>&lt;CHARACTER NAME&gt; &lt;INITIATIVE MOD&gt; &lt;CURRENT HP&gt; / &lt;MAX HP&gt;</samp>
      </p>

      <textarea
        class="edit-players--text-input form-control"
        v-model="rawPlayers"
        rows="10"
        placeholder="Smush 3! 55 / 55
Mercedes 2 34"
      ></textarea>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { usePlayers } from '../composables/usePlayers';
import { useRouter } from 'vue-router';

const { parties, selectedParty, raw, selectParty } = usePlayers();
const router = useRouter();

const rawPlayers = computed({
  get: () => raw.value,
  set: (value) => {
    raw.value = value;
  }
});

const handleSelectParty = (party) => {
  selectParty(party);

  // Navigate to encounter builder (like actionQueue.next does)
  router.push('/encounter-builder');
};

onMounted(() => {
  // If there are no parties, the edit form is already shown at the bottom
  // No need to redirect - user can add parties inline
});
</script>

<style scoped>
.manage-players--party {
  margin-bottom: 2rem;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.manage-players--party-select-button {
  margin-bottom: 1rem;
}

.manage-players--selected-party {
  display: inline-block;
  margin-bottom: 1rem;
  background-color: #5cb85c;
  color: white;
  padding: 0.5rem 1rem;
  font-size: 14px;
}

.manage-players--player {
  padding: 0.5rem;
  margin: 0.5rem 0;
  background-color: #f9f9f9;
  border-left: 3px solid #337ab7;
}

.manage-players--player--name {
  font-weight: bold;
  margin-right: 1rem;
}

.manage-players--player--init,
.manage-players--player--hp {
  margin-right: 1rem;
  color: #666;
}

.edit-players--text-input {
  font-family: monospace;
}
</style>
