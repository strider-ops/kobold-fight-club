<template>
  <div
    class="combatant-setup"
    :class="`combatant-setup__${combatant.type}`"
  >
    <span class="combatant-setup--name">
      <input
        class="combatant-setup--input combatant-setup--input__name form-control"
        v-model="combatant.name"
      >
    </span>

    <span class="combatant-setup--initative-mod">
      <span v-if="!combatant.fixedInitiative">
        Initiative Mod: <span v-if="combatant.initiativeMod >= 0">+</span>{{ combatant.initiativeMod }}
        <span v-if="combatant.advantageOnInitiative">(A)</span>
      </span>
    </span>

    <span class="combatant-setup--initative">
      Initiative:
      <span v-if="!combatant.fixedInitiative">
        <input
          type="number"
          class="form-control input-sm combatant-setup--input"
          v-model.number="combatant.initiative"
          style="width: 80px; display: inline-block;"
        >
        <button
          v-if="!combatant.initiativeRolled"
          class="btn btn-sm btn-primary combatant-setup--button combatant-setup--button__roll"
          @click="handleRollInitiative"
        >
          Roll
        </button>
      </span>
      <span v-else>
        {{ combatant.initiative }}
      </span>
    </span>

    <span class="combatant-setup--hp">
      <span v-if="!combatant.noHp">
        HP:
        <input
          v-if="combatant.type !== 'player'"
          type="number"
          class="form-control input-sm combatant-setup--input"
          v-model.number="combatant.hp"
          style="width: 80px; display: inline-block;"
        >
        <span v-else>
          {{ combatant.hp - combatant.damage }} / {{ combatant.hp }}
        </span>
      </span>
    </span>
  </div>
</template>

<script setup>
import { useCombat } from '../composables/useCombat';

const props = defineProps({
  combatant: {
    type: Object,
    required: true,
  },
});

const { rollInitiative } = useCombat();

const handleRollInitiative = () => {
  rollInitiative(props.combatant);
};
</script>

<style scoped>
.combatant-setup {
  padding: 1rem;
  margin: 1rem 0;
  border: 1px solid #ddd;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.combatant-setup__player {
  background-color: #e8f4f8;
  border-left: 4px solid #5bc0de;
}

.combatant-setup__monster {
  background-color: #f9f2f4;
  border-left: 4px solid #d9534f;
}

.combatant-setup--name {
  flex: 1;
  min-width: 200px;
}

.combatant-setup--input {
  width: 100%;
}

.combatant-setup--initative-mod,
.combatant-setup--initative,
.combatant-setup--hp {
  white-space: nowrap;
}

.combatant-setup--button {
  margin-left: 0.5rem;
}
</style>
