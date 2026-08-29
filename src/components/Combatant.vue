<template>
  <div
    class="combatant"
    :class="[
      `combatant__${combatant.type}`,
      { 'combatant__active': combatant.active }
    ]"
  >
    <span class="combatant--name">
      {{ combatant.name }}
    </span>
    <span class="combatant--initiative-label">
      Initiative:
    </span>
    <span class="combatant--initiative">
      {{ combatant.initiative }}
    </span>
    <span class="combatant--hp-label">
      <span v-if="!combatant.noHp">HP:</span>
    </span>
    <span class="combatant--hp">
      <span v-if="!combatant.noHp">
        {{ combatant.hp - combatant.damage }} / {{ combatant.hp }}
      </span>
    </span>
    <span class="combatant--apply">
      <span v-if="deltaAmount && !combatant.noHp">
        <button
          class="combatant--apply-button btn btn-sm btn-danger"
          @click="handleDamage"
        >
          Damage {{ deltaAmount }}
        </button>
        <button
          class="combatant--apply-button btn btn-sm btn-success"
          @click="handleHeal"
        >
          Heal {{ deltaAmount }}
        </button>
      </span>
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useCombat } from '../composables/useCombat';

const props = defineProps({
  combatant: {
    type: Object,
    required: true,
  },
});

const { delta, applyDelta } = useCombat();

const deltaAmount = computed(() => delta.value);

const handleDamage = () => {
  applyDelta(props.combatant, 1);
};

const handleHeal = () => {
  applyDelta(props.combatant, -1);
};
</script>

<style scoped>
.combatant {
  padding: 1rem;
  margin: 0.5rem 0;
  border: 1px solid #ddd;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.combatant__player {
  background-color: #e8f4f8;
  border-left: 4px solid #5bc0de;
}

.combatant__monster {
  background-color: #f9f2f4;
  border-left: 4px solid #d9534f;
}

.combatant__active {
  border: 2px solid #5cb85c;
  background-color: #dff0d8;
  font-weight: bold;
}

.combatant--name {
  flex: 1;
  font-size: 1.1rem;
}

.combatant--initiative-label,
.combatant--hp-label {
  font-weight: 500;
  color: #666;
}

.combatant--initiative,
.combatant--hp {
  font-weight: bold;
}

.combatant--apply-button {
  margin-left: 0.5rem;
}
</style>
