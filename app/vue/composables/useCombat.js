import { computed } from 'vue';

/**
 * Composable for accessing combat/battle tracker functionality
 * Wraps the AngularJS combat service
 */
export function useCombat() {
  const combat = computed(() => window.combatService);

  const combatants = computed(() => combat.value?.combatants || []);
  const activeCombatant = computed(() => combat.value?.activeCombatant);
  const round = computed(() => combat.value?.round || 0);
  const delta = computed({
    get: () => combat.value?.delta || 0,
    set: (value) => {
      if (combat.value) {
        combat.value.delta = value;
      }
    }
  });

  const init = () => {
    if (combat.value?.init) {
      return combat.value.init();
    }
    return 0;
  };

  const rollInitiative = (combatant) => {
    if (combat.value?.rollInitiative) {
      combat.value.rollInitiative(combatant);
    }
  };

  const start = () => {
    if (combat.value?.start) {
      combat.value.start();
    }
  };

  const next = () => {
    if (combat.value?.next) {
      combat.value.next();
    }
  };

  const damage = (combatant, amount) => {
    if (combat.value?.damage) {
      combat.value.damage(combatant, amount);
    }
  };

  const heal = (combatant, amount) => {
    if (combat.value?.heal) {
      combat.value.heal(combatant, amount);
    }
  };

  const remove = (combatant) => {
    if (combat.value?.remove) {
      combat.value.remove(combatant);
    }
  };

  const begin = () => {
    if (combat.value?.begin) {
      combat.value.begin();
    }
  };

  const nextTurn = () => {
    if (combat.value?.nextTurn) {
      combat.value.nextTurn();
    }
  };

  const applyDelta = (combatant, multiplier = 1) => {
    if (combat.value?.applyDelta) {
      combat.value.applyDelta(combatant, multiplier);
    }
  };

  return {
    combatants,
    activeCombatant,
    round,
    delta,
    init,
    rollInitiative,
    start,
    next,
    damage,
    heal,
    remove,
    begin,
    nextTurn,
    applyDelta,
  };
}
